import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'

const RELEASE = yaml.load(readFileSync('.github/workflows/release.yml', 'utf8')) as any
const RELEASE_RAW = readFileSync('.github/workflows/release.yml', 'utf8')
const PUBLISH = readFileSync('scripts/publish-release.mjs', 'utf8')
const PKG = JSON.parse(readFileSync('package.json', 'utf8'))

describe('release workflow', () => {
    it('runs on v* tags', () => {
        // yaml parses the bare key `on` as boolean true.
        const on = RELEASE.on ?? RELEASE[true as unknown as string]
        expect(on.push.tags).toContain('v*')
    })

    it('can write releases', () => {
        expect(RELEASE.permissions.contents).toBe('write')
    })

    /* Each platform must build on its own runner: better-sqlite3 and
       active-win's helper are compiled for the host, so a cross-built artifact
       fails at runtime rather than at build time. */
    it('builds Linux on Linux and macOS on macOS', () => {
        expect(RELEASE.jobs.linux['runs-on']).toMatch(/ubuntu/)
        expect(RELEASE.jobs.macos['runs-on']).toMatch(/macos/)
    })

    it('publishes Linux with no signing secrets, since AppImage needs none', () => {
        const step = RELEASE.jobs.linux.steps.find((s: any) => s.run?.includes('publish:linux'))
        expect(step).toBeTruthy()
        // Only the workflow token — nothing a maintainer has to configure.
        expect(step.env.GH_TOKEN).toContain('GITHUB_TOKEN')
    })

    /* A mac job that fails on every release because secrets are missing trains
       everyone to ignore a red X. It must skip instead. */
    it('skips macOS when signing secrets are absent rather than failing', () => {
        expect(RELEASE.jobs.macos.needs).toContain('capabilities')
        expect(RELEASE.jobs.macos.if).toContain("capabilities.outputs.mac == 'true'")
        expect(RELEASE_RAW).toMatch(/macOS release skipped/)
    })

    it('builds both macOS architectures via release:mac', () => {
        const step = RELEASE.jobs.macos.steps.find((s: any) => s.run?.includes('release:mac'))
        expect(step.run).toContain('--publish')
        expect(readFileSync('scripts/release-mac.mjs', 'utf8')).toMatch(/'--x64'/)
    })
})

/* Every platform job attaches to the one release the tag created, so an
   existing release is expected here — but only here. */
describe('attach-to-existing-release escape', () => {
    it('is opt-in via QUORIL_CI_ATTACH', () => {
        expect(PUBLISH).toContain('QUORIL_CI_ATTACH')
    })

    it('still blocks a manual republish, which is the case the guard exists for', () => {
        expect(PUBLISH).toMatch(/existing\?\.status === 200 && !attaching/)
    })

    it('is set by the workflow, not left to a human', () => {
        const step = RELEASE.jobs.linux.steps.find((s: any) => s.run?.includes('publish:linux'))
        expect(step.env.QUORIL_CI_ATTACH).toBe('true')
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
    const workflows = [
        '.github/workflows/release.yml',
        '.github/workflows/release-verify.yml',
        '.github/workflows/ci.yml',
    ]

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

    it('declares the floor in package.json so local installs match', () => {
        expect(PKG.engines?.node).toBeTruthy()
        const floor = Number(String(PKG.engines.node).replace(/[^\d.]/g, '').split('.')[0])
        expect(floor).toBeGreaterThanOrEqual(22)
    })
})

describe('linux is actually shippable', () => {
    it('has a configured target', () => {
        expect(PKG.build.linux.target).toContain('AppImage')
    })

    it('has a publish script wired to the shared publisher', () => {
        expect(PKG.scripts['publish:linux']).toContain('publish-release.mjs linux')
    })
})
