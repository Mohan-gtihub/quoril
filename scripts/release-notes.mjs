/**
 * Extracts the CHANGELOG.md section for the version in package.json and writes
 * it to build/release-notes.md.
 *
 * electron-builder picks that file up via `build.releaseInfo.releaseNotesFile`
 * and uses it as the GitHub release body. electron-updater then serves the same
 * body back to the app as `UpdateInfo.releaseNotes`, which is what the in-app
 * update prompt renders. One source of truth, three destinations.
 *
 * Run directly to inspect what would be published:
 *   node scripts/release-notes.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHANGELOG = path.join(root, 'CHANGELOG.md')
const OUT = path.join(root, 'build', 'release-notes.md')

/**
 * Pull the body of the `## [<version>]` section, stopping at the next `## `
 * heading. Reference-link definitions at the foot of the file are not part of
 * any section, so they never leak in.
 */
export function extractNotes(changelog, version) {
    const lines = changelog.split(/\r?\n/)
    // Accept "## [1.0.8] - 2026-07-27" and the bare "## 1.0.8" form.
    const heading = new RegExp(`^##\\s+\\[?${version.replace(/\./g, '\\.')}\\]?(\\s|$)`)

    const start = lines.findIndex((l) => heading.test(l))
    if (start === -1) return null

    const rest = lines.slice(start + 1)
    const end = rest.findIndex((l) => /^##\s/.test(l))
    const body = (end === -1 ? rest : rest.slice(0, end))
        // Drop the trailing reference-link block if the section runs to EOF.
        .filter((l) => !/^\[[^\]]+\]:\s*https?:\/\//.test(l))
        .join('\n')
        .trim()

    return body || null
}

function main() {
    const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version

    if (!fs.existsSync(CHANGELOG)) {
        console.error(`No CHANGELOG.md at ${CHANGELOG}`)
        process.exit(1)
    }

    const notes = extractNotes(fs.readFileSync(CHANGELOG, 'utf8'), version)

    // Shipping a release whose notes are silently empty is worse than not
    // shipping: the update prompt would show a blank "what's new".
    if (!notes) {
        console.error(
            `CHANGELOG.md has no section for ${version}.\n` +
            `Add a "## [${version}] - YYYY-MM-DD" entry before releasing.`
        )
        process.exit(1)
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, `${notes}\n`)
    console.log(`Release notes for ${version} → ${path.relative(root, OUT)}\n`)
    console.log(notes)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main()
}
