/**
 * One-command macOS release.
 *
 * macOS is the one platform that cannot be built by CI here: signing requires a
 * Developer ID identity in a keychain, and the repo has no certificate secrets.
 * Windows and Linux build on the tag push; this script publishes macOS onto the
 * same release from a Mac. If the current version is already released without
 * macOS artifacts it runs in 'attach' mode — no bump, no tag, no changelog —
 * which is the normal way to finish a release started by CI.
 *
 *   npm run ship:mac               # attach macOS to the current release,
 *                                  # or cut a new patch if it already has it
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

const changelog = readFileSync('CHANGELOG.md', 'utf8')
const current = JSON.parse(readFileSync('package.json', 'utf8')).version

async function releaseAssets(v) {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/v${v}`, {
        headers: { Accept: 'application/vnd.github+json' },
    }).catch(() => null)
    if (res?.status !== 200) return null
    const body = await res.json().catch(() => null)
    return (body?.assets ?? []).map((a) => a.name)
}

async function isReleased(v) {
    return (await releaseAssets(v)) !== null
}

/**
 * Three ways to arrive here:
 *
 *   'attach'       — the current version is released but carries no macOS
 *                    artifacts. The tag trigger builds Windows and Linux on CI;
 *                    macOS cannot run there because signing needs a keychain
 *                    and the repo has no certificate secrets, so it is always
 *                    published from a Mac afterwards. Build and upload onto the
 *                    existing release: no bump, no tag, no changelog, because
 *                    the version being completed is the one already announced.
 *
 *   'ship-current' — package.json names a version that was never published and
 *                    already has its notes written. Someone bumped by hand, or
 *                    an earlier run failed after the bump. Publish it as-is;
 *                    bumping again would burn a version number for nothing and
 *                    strand the notes already written under it.
 *
 *   'bump'         — the current version is out in the world with macOS already
 *                    on it, so this is a new release and needs both a new number
 *                    and new notes.
 */
const currentAssets = await releaseAssets(current)
const currentReleased = currentAssets !== null
const currentHasMac = (currentAssets ?? []).includes('latest-mac.yml')
const currentNotes = sectionBody(changelog, current)

const mode = currentReleased && !currentHasMac
    ? 'attach'
    : !currentReleased && currentNotes
        ? 'ship-current'
        : 'bump'

const unreleased = sectionBody(changelog, 'Unreleased')
if (mode === 'bump' && !unreleased) {
    fail(
        'CHANGELOG.md has nothing under ## [Unreleased].',
        `v${current} is already published with macOS artifacts, so this would be`,
        'a new release — and every release needs notes: they become the GitHub',
        'release body and the in-app "what\'s new" text.',
        'Describe the changes, then re-run.',
    )
}

console.log(`  branch ${branch}, tree clean, gh ok`)

// In attach mode the tag already exists. Building from a commit other than the
// one it points at means shipping a macOS binary that does not match the
// Windows and Linux ones on the same release — worth saying out loud, but not
// worth blocking: release tooling and CI config routinely land after the tag,
// and they change nothing inside the app.
if (mode === 'attach') {
    const tagCommit = (() => {
        try {
            return capture('git', ['rev-list', '-n', '1', `v${current}`])
        } catch {
            return null
        }
    })()
    if (tagCommit && tagCommit !== capture('git', ['rev-parse', 'HEAD'])) {
        const drift = capture('git', ['rev-list', '--count', `v${current}..HEAD`])
        console.warn(
            `  ! HEAD is ${drift} commit(s) ahead of v${current} — the macOS build`,
        )
        console.warn('    will not be byte-identical in provenance to Windows/Linux.')
    }
}
console.log(
    mode === 'attach'
        ? `  v${current} is published without macOS — adding it to that release`
        : mode === 'ship-current'
            ? `  v${current} is bumped but unpublished — shipping it as-is (no bump)`
            : `  v${current} is published — releasing a new ${bump} version`,
)

/* ── 2. verify ─────────────────────────────────────────────── */

step(2, 'Verifying (lockfile, typecheck, lint, tests)')
// First, because it is what CI runs first: a lock the CI npm cannot install
// fails every workflow before anything is built, and the local npm does not
// necessarily agree with it.
run('npm', ['run', 'check:lockfile'])
run('npm', ['run', 'typecheck'])
run('npm', ['run', 'lint'])
run('npm', ['test', '--', '--run'])

/* ── 3. version ────────────────────────────────────────────── */

step(3, mode === 'bump' ? `Bumping version (${bump})` : 'Version')

if (dryRun) {
    console.log(
        mode === 'bump'
            ? `  would bump from ${current}`
            : mode === 'attach'
                ? `  would add macOS artifacts to the existing v${current}`
                : `  would ship ${current} unchanged`,
    )
    console.log('\n--dry-run: stopping before any changes are written.')
    console.log('Notes that would be published:\n')
    console.log(mode === 'bump' ? unreleased : currentNotes)
    process.exit(0)
}

let version = current
if (mode === 'bump') {
    run('npm', ['version', bump, '--no-git-tag-version'])
    version = JSON.parse(readFileSync('package.json', 'utf8')).version

    if (await isReleased(version)) {
        run('git', ['checkout', '--', 'package.json', 'package-lock.json'])
        fail(
            `v${version} is already released.`,
            'Republishing would overwrite its assets. Pick a higher version.',
        )
    }
    console.log(`  ${current} → ${version}`)
} else {
    console.log(`  keeping ${version}`)
}
const tag = `v${version}`

/* ── 4. changelog ──────────────────────────────────────────── */

if (mode === 'bump') {
    step(4, `Promoting [Unreleased] to ${version}`)
    writeFileSync('CHANGELOG.md', promote(changelog, version))
} else {
    step(4, 'Changelog')
    console.log(`  notes for ${version} already written`)
}
run(process.execPath, ['scripts/release-notes.mjs'])

/* ── 5. commit ─────────────────────────────────────────────── */

step(5, 'Committing')
// In ship-current mode the bump was already committed, so there is nothing to
// record — the tree was verified clean in step 1.
if (capture('git', ['status', '--porcelain'])) {
    run('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md'])
    run('git', ['commit', '-m', `chore: release ${tag}`])
} else {
    console.log('  nothing to commit')
}

/* ── 6. tag + push ─────────────────────────────────────────── */

step(6, 'Tagging and pushing')

// attach mode is completing a release that already exists: its tag is what
// created it, and Windows and Linux are already built from that tag. Re-tagging
// is not just unnecessary, it is impossible without moving the tag off the
// commit those builds came from.
if (mode === 'attach') {
    console.log(`  v${current} is already tagged and pushed — nothing to do`)
}

// A previous run may have tagged and then failed during the build. Reuse the
// tag if it already points at this commit; refuse if it points elsewhere,
// because moving a tag would silently change what a published release refers to.
const existingTag = mode === 'attach' ? null : (() => {
    try {
        return capture('git', ['rev-list', '-n', '1', tag])
    } catch {
        return null
    }
})()

if (mode === 'attach') {
    // handled above
} else if (!existingTag) {
    run('git', ['tag', '-a', tag, '-m', `Quoril ${version}`])
} else if (existingTag === capture('git', ['rev-parse', 'HEAD'])) {
    console.log(`  ${tag} already exists at this commit`)
} else {
    fail(
        `${tag} already exists but points at a different commit.`,
        'Moving it would change what the release refers to. Either delete it',
        `(git tag -d ${tag}) or release a new version.`,
    )
}

if (mode !== 'attach') {
    run('git', ['push', 'origin', branch])
    run('git', ['push', 'origin', tag])
}

/* ── 7. publish ────────────────────────────────────────────── */

step(7, 'Building, signing, notarizing, publishing')
console.log('  Notarization usually takes 5-15 minutes.')
// macOS is published from a Mac, always. Signing needs a Developer ID identity
// in a keychain, and the repo has no certificate secrets to give a runner one,
// so release.yml's macOS job stays skipped by design — see the `capabilities`
// job. Windows and Linux are built by that same workflow off the tag, and this
// step adds macOS to the release they created. Every platform ends up on one
// version; only the machine that builds each differs.
console.log('  Windows and Linux are published in parallel by the release workflow.\n')

try {
    // The release already exists in attach mode — by definition, since that is
    // what put us here. Tell release-mac.mjs that finding it is expected;
    // macOS uploads dmg/zip/latest-mac.yml, so nothing already there is touched.
    run('npm', ['run', 'release:mac', '--', '--publish'], {
        env: mode === 'attach'
            ? { ...process.env, QUORIL_CI_ATTACH: 'true' }
            : process.env,
    })
} catch (error) {
    fail(
        'Publish failed.',
        `The commit and tag ${tag} are already pushed. Fix the problem and re-run:`,
        mode === 'attach'
            ? '  QUORIL_CI_ATTACH=true npm run release:mac -- --publish'
            : '  npm run release:mac -- --publish',
        ...(mode === 'attach'
            ? []
            : [`Or remove the tag: git push origin :${tag} && git tag -d ${tag}`]),
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
