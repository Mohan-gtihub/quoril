import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'

const RAW = readFileSync('.github/workflows/release.yml', 'utf8')
const RELEASE = yaml.load(RAW) as any
const PKG = JSON.parse(readFileSync('package.json', 'utf8'))

// yaml parses the bare key `on` as boolean true.
const on = RELEASE.on ?? RELEASE[true as unknown as string]

const buildStep = (name: string) =>
    RELEASE.jobs.build.steps.find((s: any) => s.name?.includes(name))

describe('release workflow', () => {
    it('runs on v* tags', () => {
        expect(on.push.tags).toContain('v*')
    })

    it('can write releases', () => {
        expect(RELEASE.permissions.contents).toBe('write')
    })

    /* Each platform must build on its own runner: better-sqlite3 and
       active-win's helper are compiled for the host, so a cross-built artifact
       fails at runtime rather than at build time. */
    it('builds each platform on its own OS', () => {
        const byPlatform = Object.fromEntries(
            RELEASE.jobs.build.strategy.matrix.include.map((e: any) => [e.platform, e.os]),
        )
        expect(byPlatform.mac).toMatch(/macos/)
        expect(byPlatform.win).toMatch(/windows/)
        expect(byPlatform.linux).toMatch(/ubuntu/)
    })

    /* One platform failing must not take the other two down with it — their
       artifacts are still worth having on the draft while the failure is fixed
       and that job re-run. */
    it('does not cancel sibling platforms when one fails', () => {
        expect(RELEASE.jobs.build.strategy['fail-fast']).toBe(false)
    })

    it('fails when the tag does not match package.json', () => {
        const step = RELEASE.jobs.verify.steps.find((s: any) => s.id === 'tag')
        expect(step.run).toContain('does not match package.json version')
    })
})

describe('nothing reaches users until every platform succeeds', () => {
    it('uploads to a draft', () => {
        expect(PKG.build.publish[0].releaseType).toBe('draft')
        expect(RELEASE.jobs.draft.steps.some((s: any) => s.run?.includes('--draft'))).toBe(true)
    })

    it('only un-drafts after all three builds pass', () => {
        expect(RELEASE.jobs.publish.needs).toContain('build')
        expect(RELEASE.jobs.publish.steps.some((s: any) => s.run?.includes('--draft=false')))
            .toBe(true)
    })

    /* Each platform's updater reads its own feed file. A release missing one is
       invisible to that platform's installed base — the failure mode that let
       Windows and macOS drift onto separate tags, leaving each updater staring
       at a release with no feed for it. */
    it('refuses to publish unless every platform feed is present', () => {
        const step = RELEASE.jobs.publish.steps.find((s: any) => s.run?.includes('latest-mac.yml'))
        expect(step.run).toContain('latest-mac.yml')
        expect(step.run).toContain('latest.yml')
        expect(step.run).toContain('latest-linux.yml')
    })

    /* Republishing a version overwrites its assets, leaving two different
       binaries under one number — clients that already updated never re-download. */
    it('refuses to rebuild an already-published tag', () => {
        expect(RELEASE.jobs.draft.steps.some((s: any) => s.run?.includes('is already published')))
            .toBe(true)
    })
})

/*
 * A universal binary is the point of the macOS build: it removes any chance of
 * downloading the wrong architecture. Through v1.1.6 the Intel DMG was the
 * shortest, most clickable asset on the release page, so Apple Silicon users
 * kept picking it and were asked to install Rosetta.
 */
describe('macOS ships one universal download', () => {
    it('targets universal for both dmg and zip', () => {
        for (const target of PKG.build.mac.target) {
            expect(target.arch).toEqual(['universal'])
        }
    })

    it('builds no per-architecture artifact that could be picked by mistake', () => {
        expect(RAW).not.toMatch(/--arm64|--x64/)
    })

    /* electron-updater filters candidate downloads by looking for the substring
       "arm64" in the filename. In a universal feed no file has it, so the filter
       is skipped and both chips take the same zip — but one arch-stamped file
       sneaking in would make Intel Macs match nothing and fail with
       ERR_UPDATER_ZIP_FILE_NOT_FOUND. */
    it('fails the build if the update feed names an architecture', () => {
        expect(buildStep('universal').run).toContain('Intel Macs would get no update')
    })

    /* @electron/universal silently falls back to the x64 copy of any Mach-O it
       cannot merge, which would put Apple Silicon users back on Rosetta with
       nothing having failed. */
    it('verifies every native binary carries both slices', () => {
        const run = buildStep('universal').run
        expect(run).toContain('lipo -archs')
        expect(run).toContain('*.node')
        expect(run).toContain('is not universal')
    })

    /* Gatekeeper refuses to auto-update an unsigned app, so an unsigned macOS
       build would install once and then never update again. */
    it('refuses to build macOS without signing credentials', () => {
        const step = buildStep('signing credentials')
        expect(step.if).toContain("matrix.platform == 'mac'")
        expect(step.run).toContain('Missing macOS signing secrets')
    })

    it('verifies signing and notarization', () => {
        const run = buildStep('universal').run
        expect(run).toContain('codesign --verify')
        expect(run).toContain('stapler validate')
    })
})

/**
 * Every workflow starts with `npm ci`, which refuses to run when
 * package-lock.json disagrees with package.json — so a lockfile written by a
 * different Node/npm than CI uses fails the whole pipeline before it builds
 * anything. That happened: a lock generated on Node 24 dropped nested entries
 * that Node 20's npm then demanded.
 */
describe('Node version is consistent across workflows', () => {
    const workflows = ['.github/workflows/release.yml', '.github/workflows/ci.yml']

    it('pins every job to the same major', () => {
        const versions = new Set<string>()
        for (const f of workflows) {
            for (const m of readFileSync(f, 'utf8').matchAll(/node-version:\s*(\S+)/g)) {
                versions.add(m[1])
            }
        }
        expect(versions.size, `mixed Node versions: ${[...versions]}`).toBe(1)
    })

    // @electron/notarize@3 requires >= 22.12, and notarization is the step that
    // would fail — after a full signed build has already run.
    it('is new enough for @electron/notarize', () => {
        for (const f of workflows) {
            for (const m of readFileSync(f, 'utf8').matchAll(/node-version:\s*(\d+)/g)) {
                expect(Number(m[1]), `${f} pins Node ${m[1]}`).toBeGreaterThanOrEqual(22)
            }
        }
    })
})
