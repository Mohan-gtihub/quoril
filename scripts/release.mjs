/**
 * Cut a release. Bumps the version, promotes the changelog, tags and pushes —
 * then stops. CI builds, signs, notarizes and publishes every platform from the
 * tag, so nothing is built locally and this runs anywhere in a few seconds.
 *
 *   npm run release              # patch
 *   npm run release -- minor
 *   npm run release -- 2.0.0
 *   npm run release -- --dry-run
 *
 * Watch it finish with: gh run watch
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

import { nextVersion, promote, sectionBody } from './changelog.mjs'

const REPO = 'Mohan-gtihub/quoril'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const bump = args.find((a) => !a.startsWith('--')) ?? 'patch'

const run = (cmd, cmdArgs) =>
    execFileSync(cmd, cmdArgs, { stdio: 'inherit', env: process.env })

const capture = (cmd, cmdArgs) =>
    execFileSync(cmd, cmdArgs, { encoding: 'utf8', env: process.env }).trim()

function fail(message, ...detail) {
    console.error(`\n✗ ${message}`)
    for (const line of detail) console.error(`  ${line}`)
    process.exit(1)
}

/* ── preconditions ─────────────────────────────────────────── */

const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
if (branch === 'HEAD') fail('Detached HEAD. Check out a branch before releasing.')

// Publishing code that isn't committed means the tag points at something other
// than what users receive — the one thing a release must never do.
if (capture('git', ['status', '--porcelain'])) {
    fail(
        'Working tree is dirty.',
        'Commit or stash first — otherwise the tag will not match the binary.',
    )
}

const changelog = readFileSync('CHANGELOG.md', 'utf8')
const unreleased = sectionBody(changelog, 'Unreleased')
if (!unreleased) {
    fail(
        'CHANGELOG.md has nothing under ## [Unreleased].',
        'Release notes become the GitHub release body and the in-app',
        '"what\'s new" text. Describe the changes, then re-run.',
    )
}

const current = JSON.parse(readFileSync('package.json', 'utf8')).version
const version = nextVersion(current, bump)
const tag = `v${version}`

// Rebuilding a released version would overwrite its assets, leaving two
// different binaries under one version number.
const released = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${tag}`, {
    headers: { Accept: 'application/vnd.github+json' },
}).catch(() => null)

if (released?.status === 200) fail(`${tag} is already released.`, 'Pick a higher version.')

if (dryRun) {
    console.log(`${current} → ${version}\n`)
    console.log('Notes that would be published:\n')
    console.log(unreleased)
    process.exit(0)
}

/* ── bump, commit, tag, push ───────────────────────────────── */

run('npm', ['version', version, '--no-git-tag-version'])
writeFileSync('CHANGELOG.md', promote(changelog, version))
run('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md'])
run('git', ['commit', '-m', `chore: release ${tag}`])
run('git', ['tag', '-a', tag, '-m', `Quoril ${version}`])
run('git', ['push', 'origin', branch])
run('git', ['push', 'origin', tag])

console.log(`\n\x1b[32m✓ ${tag} pushed.\x1b[0m CI is building all three platforms.`)
console.log('  Watch:   gh run watch')
console.log(`  Release: https://github.com/${REPO}/releases/tag/${tag}`)
console.log('\nIt stays a draft until macOS, Windows and Linux all succeed.')
