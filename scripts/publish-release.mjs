import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import process from 'node:process'

// Publish an UNSIGNED build to GitHub Releases so electron-updater has a feed.
//
// Why this exists separately from `release:win` / `release:mac`:
// those go through scripts/release-preflight.mjs, which requires real signing
// credentials (CSC_LINK, Apple ID, ...). That gate is deliberate — see
// docs/RELEASE_SIGNING.md — and this script does NOT bypass or replace it.
// It is the unsigned path for getting builds to an internal team before
// certificates exist.
//
// What unsigned means for users:
//   Windows — installs work, auto-update works, but SmartScreen shows an
//             "unrecognized app" warning on first run. Users must click
//             More info -> Run anyway.
//   macOS   — auto-update DOES NOT WORK. Gatekeeper refuses to auto-update
//             unsigned apps. Mac users must re-download manually every time.
//             mac is intentionally not a target here.
//   Linux   — AppImage works normally; signing is not part of that format.
//
// Requires GH_TOKEN (or GITHUB_TOKEN) with `repo` scope — electron-builder
// reads it to create the release and upload assets.

const REPO = 'Mohan-gtihub/quoril'

const require = createRequire(import.meta.url)
const electronBuilderCli = require.resolve('electron-builder/cli.js')

function runElectronBuilder(builderArgs) {
    // Spawn electron-builder's JS entry with the current Node binary rather
    // than the npx.cmd shim: Node >= 20.12 refuses to execFile .cmd/.bat
    // without a shell (CVE-2024-27980). Same reasoning as
    // scripts/package-cross-platform.mjs.
    execFileSync(process.execPath, [electronBuilderCli, ...builderArgs], {
        cwd: process.cwd(),
        stdio: 'inherit',
    })
}

const target = process.argv[2]
const configs = {
    win: ['--win', '--x64', '--publish', 'always'],
    linux: ['--linux', '--x64', '--publish', 'always'],
}
const args = configs[target]

if (!args) {
    console.error('Usage: node scripts/publish-release.mjs <win|linux>')
    console.error('(mac is excluded: unsigned macOS builds cannot auto-update)')
    process.exitCode = 1
} else if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    console.error('Missing GH_TOKEN (or GITHUB_TOKEN).')
    console.error('electron-builder needs a token with `repo` scope to create')
    console.error('the release and upload assets. Create one at')
    console.error('https://github.com/settings/tokens then:')
    console.error('  PowerShell:  $env:GH_TOKEN = "ghp_..."')
    console.error('  bash:        export GH_TOKEN=ghp_...')
    process.exitCode = 1
} else {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

    // Refuse to reuse a version that already has a release. electron-builder
    // will happily overwrite the assets, producing two different binaries
    // under one version number — clients with allowDowngrade:false then never
    // update, and the analytics app_version field can no longer tell the two
    // builds apart. Bump with `npm version patch` first.
    const existing = await fetch(
        `https://api.github.com/repos/${REPO}/releases/tags/v${version}`,
        { headers: { Accept: 'application/vnd.github+json' } },
    ).catch(() => null)

    if (existing?.status === 200) {
        console.error(`\nv${version} is already released on GitHub.`)
        console.error('Publishing again would overwrite its assets with a different')
        console.error('build under the same version number. Bump first:')
        console.error('  npm version patch    # 1.0.1 -> 1.0.2')
        console.error(`\nExisting release: https://github.com/${REPO}/releases/tag/v${version}`)
        process.exitCode = 1
        process.exit(1)
    }

    // Regenerate build/release-notes.md from CHANGELOG.md before packaging.
    // electron-builder reads it via build.releaseInfo.releaseNotesFile and uses
    // it as the release body, which electron-updater then serves back to the app
    // as the "what's new" text. Exits non-zero if this version has no changelog
    // entry, so a release cannot ship with blank notes.
    execFileSync(process.execPath, ['scripts/release-notes.mjs'], { stdio: 'inherit' })

    console.log(`\nPublishing Quoril v${version} (${target}, UNSIGNED) to GitHub Releases.`)
    console.log('Users will see a SmartScreen warning on first install.\n')

    let packageError = null

    try {
        runElectronBuilder(args)
    } catch (error) {
        packageError = error
    } finally {
        // Packaging swaps native modules to the Electron ABI. Always restore
        // them for the host, or `npm run dev` breaks afterwards. A restore
        // failure must never throw out of `finally` — that would discard
        // packageError and hide why packaging actually failed.
        console.log(`\nRestoring Electron native dependencies for ${process.platform}/${process.arch}...`)
        try {
            runElectronBuilder(['install-app-deps'])
        } catch (restoreError) {
            console.error('Failed to restore native dependencies:', restoreError.message)
            console.error('Run `npx electron-builder install-app-deps` manually before `npm run dev`.')
            if (!packageError) packageError = restoreError
        }
    }

    if (packageError) {
        console.error('\nPublish failed:', packageError.message)
        process.exitCode = typeof packageError.status === 'number' ? packageError.status : 1
    } else {
        console.log(`\nPublished v${version} — the release is LIVE (not a draft).`)
        console.log('Clients running an older version will pick it up within 6h,')
        console.log('or immediately via Settings -> Check for updates.')
        console.log(`  https://github.com/${REPO}/releases`)
    }
}
