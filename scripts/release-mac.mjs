import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { loadEnv } from './load-env.mjs'

// Apple credentials live in .env locally and in secrets on CI.
loadEnv()

// This repo lives under ~/Documents, which iCloud Drive syncs. The file provider
// stamps com.apple.FinderInfo on bundle directories as they are created, and
// codesign refuses to sign anything carrying it:
//
//   "resource fork, Finder information, or similar detritus not allowed"
//
// So mac release builds go outside the synced tree. Stripping the attribute
// instead does not work — iCloud re-stamps the bundle mid-build.
// CI runners have no iCloud and set QUORIL_RELEASE_OUT=release.
const defaultOut = process.platform === 'darwin'
    ? path.join(homedir(), 'Library', 'Caches', 'quoril-release')
    : 'release'
const outDir = process.env.QUORIL_RELEASE_OUT || defaultOut

const run = (cmd, args, opts = {}) =>
    execFileSync(cmd, args, { stdio: 'inherit', env: process.env, ...opts })

// `npm run release:mac -- --publish` uploads the DMG, the ZIP and latest-mac.yml
// to GitHub Releases. Without it the build stays local. The ZIP and the YAML are
// what electron-updater consumes — the DMG is only for first-time downloads.
const publish = process.argv.includes('--publish')

if (publish && !process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    // electron-builder authenticates via GH_TOKEN; reuse the gh CLI login so the
    // token does not have to be pasted into .env.
    try {
        process.env.GH_TOKEN = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim()
    } catch {
        console.error(
            'Publishing needs a GitHub token. Run `gh auth login`, or set GH_TOKEN.'
        )
        process.exit(1)
    }
}

// Refuse to republish a version that already has a release. electron-builder
// would overwrite its assets, leaving two different binaries under one version
// number — clients with allowDowngrade:false then never update. Mirrors the
// same guard in scripts/publish-release.mjs.
if (publish) {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
    const existing = await fetch(
        `https://api.github.com/repos/Mohan-gtihub/quoril/releases/tags/v${version}`,
        { headers: { Accept: 'application/vnd.github+json' } },
    ).catch(() => null)

    if (existing?.status === 200) {
        console.error(`\nv${version} is already released on GitHub.`)
        console.error('Publishing again would overwrite its assets with a different')
        console.error('build under the same version number. Bump first:')
        console.error('  npm version patch    # 1.0.8 -> 1.0.9')
        process.exit(1)
    }
}

try {
    run(process.execPath, ['scripts/release-preflight.mjs', 'mac'])
    // Regenerate build/release-notes.md from CHANGELOG.md. electron-builder reads
    // it via build.releaseInfo.releaseNotesFile and publishes it as the release
    // body, which is what the in-app update prompt later shows. Exits non-zero if
    // this version has no changelog entry, so a release can't ship blank notes.
    run(process.execPath, ['scripts/release-notes.mjs'])
    run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
        'electron-builder',
        '--mac',
        '--arm64',
        '--publish',
        publish ? 'always' : 'never',
        `-c.directories.output=${outDir}`,
    ])
    console.log(`\nRelease artifacts: ${outDir}`)
    if (publish) console.log('Published to GitHub Releases.')
} catch (error) {
    process.exitCode = typeof error.status === 'number' ? error.status : 1
}
