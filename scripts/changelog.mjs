/**
 * CHANGELOG.md is the single source of truth for "what changed": the section
 * for a version becomes the GitHub release body, which electron-updater then
 * serves back to the app as the in-app "what's new" text.
 *
 * Kept separate from release.mjs so it can be tested without importing a module
 * that cuts a release as a side effect.
 */

/** Body of a `## [name]` section, excluding trailing reference-link definitions. */
export function sectionBody(text, name) {
    const lines = text.split(/\r?\n/)
    // Accepts "## [1.2.0] - 2026-07-29" and the bare "## 1.2.0" form.
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
export function promote(text, version) {
    const date = new Date().toISOString().slice(0, 10)
    if (!sectionBody(text, 'Unreleased')) {
        throw new Error('promote() called with an empty [Unreleased]')
    }

    return text
        .replace(
            /^##\s+\[Unreleased\].*$/m,
            `## [Unreleased]\n\n## [${version}] - ${date}`,
        )
        .replace(
            /^\[Unreleased\]:\s*(https:\/\/github\.com\/[^/]+\/[^/]+)\/compare\/v([\d.]+)\.\.\.HEAD$/m,
            (_, base, prev) =>
                `[Unreleased]: ${base}/compare/v${version}...HEAD\n` +
                `[${version}]: ${base}/compare/v${prev}...v${version}`,
        )
}

/** `bump` is major/minor/patch or an explicit version. */
export function nextVersion(current, bump) {
    if (/^\d+\.\d+\.\d+/.test(bump)) return bump

    const [major, minor, patch] = current.split('.').map(Number)
    switch (bump) {
        case 'major': return `${major + 1}.0.0`
        case 'minor': return `${major}.${minor + 1}.0`
        case 'patch': return `${major}.${minor}.${patch + 1}`
        default: throw new Error(`Unknown bump "${bump}" — use major, minor, patch or an explicit version.`)
    }
}
