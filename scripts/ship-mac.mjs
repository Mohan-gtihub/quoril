/**
 * One-command macOS release.
 *
 *   npm run ship:mac -- minor      # 1.1.0 -> 1.2.0
 *   npm run ship:mac -- patch      # 1.1.0 -> 1.1.1
 *   npm run ship:mac -- 2.0.0      # explicit
 *   npm run ship:mac -- patch --dry-run
 *
 * Does, in order:
 *   1. preconditions  — clean tree, on a branch, gh authenticated,
 *                       CHANGELOG [Unreleased] actually has content
 *   2. verify         — typecheck, lint, tests
 *   3. version        — bump package.json + lock
 *   4. changelog      — promote [Unreleased] into the new version section
 *   5. commit         — chore: release vX.Y.Z
 *   6. tag + push     — before publishing, so the GitHub release attaches to a
 *                       tag pointing at this exact commit rather than whatever
 *                       the default branch happened to be
 *   7. publish        — build, sign, notarize, upload
 *
 * Anything that fails stops the run. Steps 1-2 happen before any mutation, so
 * a failing test leaves the repo untouched.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const bump = args.find((a) => !a.startsWith('--')) ?? 'patch'

const REPO = 'Mohan-gtihub/quoril'

const run = (cmd, cmdArgs, opts = {}) =>
    execFileSync(cmd, cmdArgs, { stdio: 'inherit', env: process.env, ...opts })

const capture = (cmd, cmdArgs) =>
    execFileSync(cmd, cmdArgs, { encoding: 'utf8', env: process.env }).trim()

function fail(message, ...detail) {
    console.error(`\n✗ ${message}`)
    for (const line of detail) console.error(`  ${line}`)
    process.exit(1)
}

function step(n, label) {
    console.log(`\n\x1b[1m[${n}/7] ${label}\x1b[0m`)
}

/* ── 1. preconditions ──────────────────────────────────────── */

step(1, 'Checking preconditions')

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

try {
    execFileSync('gh', ['auth', 'token'], { stdio: 'pipe' })
} catch {
    fail('gh is not authenticated.', 'Run: gh auth login')
}

// The blank-notes check, run up front rather than after a 15-minute build.
const changelog = readFileSync('CHANGELOG.md', 'utf8')
const unreleased = sectionBody(changelog, 'Unreleased')
if (!unreleased) {
    fail(
        'CHANGELOG.md has nothing under ## [Unreleased].',
        'Every release needs notes: they become the GitHub release body and the',
        'in-app "what\'s new" text. Describe the changes, then re-run.',
    )
}

console.log(`  branch ${branch}, tree clean, gh ok, notes present`)

/* ── 2. verify ─────────────────────────────────────────────── */

step(2, 'Verifying (typecheck, lint, tests)')
run('npm', ['run', 'typecheck'])
run('npm', ['run', 'lint'])
run('npm', ['test', '--', '--run'])

/* ── 3. version ────────────────────────────────────────────── */

step(3, `Bumping version (${bump})`)
const previous = JSON.parse(readFileSync('package.json', 'utf8')).version

if (dryRun) {
    console.log(`  would bump from ${previous}`)
    console.log('\n--dry-run: stopping before any changes are written.')
    console.log('Notes that would be published:\n')
    console.log(unreleased)
    process.exit(0)
}

run('npm', ['version', bump, '--no-git-tag-version'])
const version = JSON.parse(readFileSync('package.json', 'utf8')).version
const tag = `v${version}`

// Re-check now that the number is known: the guard in release-mac.mjs also
// catches this, but only after preflight.
const existing = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${tag}`, {
    headers: { Accept: 'application/vnd.github+json' },
}).catch(() => null)
if (existing?.status === 200) {
    run('git', ['checkout', '--', 'package.json', 'package-lock.json'])
    fail(`${tag} is already released.`, 'Republishing would overwrite its assets. Pick a higher version.')
}

console.log(`  ${previous} → ${version}`)

/* ── 4. changelog ──────────────────────────────────────────── */

step(4, 'Promoting [Unreleased] to ' + version)
writeFileSync('CHANGELOG.md', promote(changelog, version))
run(process.execPath, ['scripts/release-notes.mjs'])

/* ── 5. commit ─────────────────────────────────────────────── */

step(5, 'Committing')
run('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md'])
run('git', ['commit', '-m', `chore: release ${tag}`])

/* ── 6. tag + push ─────────────────────────────────────────── */

step(6, 'Tagging and pushing')
run('git', ['tag', '-a', tag, '-m', `Quoril ${version}`])
run('git', ['push', 'origin', branch])
run('git', ['push', 'origin', tag])

/* ── 7. publish ────────────────────────────────────────────── */

step(7, 'Building, signing, notarizing, publishing')
console.log('  Notarization usually takes 5-15 minutes.\n')

try {
    run('npm', ['run', 'release:mac', '--', '--publish'])
} catch (error) {
    fail(
        'Publish failed.',
        `The commit and tag ${tag} are already pushed. Fix the problem and re-run:`,
        '  npm run release:mac -- --publish',
        `Or remove the tag: git push origin :${tag} && git tag -d ${tag}`,
    )
    throw error
}

console.log(`\n\x1b[32m✓ Quoril ${version} published.\x1b[0m`)
console.log(`  https://github.com/${REPO}/releases/tag/${tag}`)
console.log('  Existing installs pick it up within 6 hours, or immediately via')
console.log('  Settings → Updates → Check for updates.')

/* ── changelog helpers ─────────────────────────────────────── */

/** Body of a "## [name]" section, excluding reference-link definitions. */
function sectionBody(text, name) {
    const lines = text.split(/\r?\n/)
    const heading = new RegExp(`^##\\s+\\[?${name.replace(/\./g, '\\.')}\\]?(\\s|$)`)
    const start = lines.findIndex((l) => heading.test(l))
    if (start === -1) return null

    const rest = lines.slice(start + 1)
    const end = rest.findIndex((l) => /^##\s/.test(l))
    return (end === -1 ? rest : rest.slice(0, end))
        .filter((l) => !/^\[[^\]]+\]:\s*https?:\/\//.test(l))
        .join('\n')
        .trim() || null
}

/**
 * Move everything under [Unreleased] into a dated section for `version`, leave
 * [Unreleased] empty, and repoint the compare links.
 */
function promote(text, version) {
    const date = new Date().toISOString().slice(0, 10)
    const body = sectionBody(text, 'Unreleased')

    let out = text.replace(
        /^##\s+\[Unreleased\].*$/m,
        `## [Unreleased]\n\n## [${version}] - ${date}`,
    )
    // The body now sits under the new heading; nothing else to move.
    if (!body) throw new Error('promote() called with an empty [Unreleased]')

    // Repoint "[Unreleased]: .../compare/vPREV...HEAD" and add this version's link.
    out = out.replace(
        /^\[Unreleased\]:\s*(https:\/\/github\.com\/[^/]+\/[^/]+)\/compare\/v([\d.]+)\.\.\.HEAD$/m,
        (_, base, prev) =>
            `[Unreleased]: ${base}/compare/v${version}...HEAD\n` +
            `[${version}]: ${base}/compare/v${prev}...v${version}`,
    )
    return out
}
