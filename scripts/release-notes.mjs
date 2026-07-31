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
 *   npm run release:notes
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { sectionBody } from './changelog.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHANGELOG = path.join(root, 'CHANGELOG.md')
const OUT = path.join(root, 'build', 'release-notes.md')

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version

if (!fs.existsSync(CHANGELOG)) {
    console.error(`No CHANGELOG.md at ${CHANGELOG}`)
    process.exit(1)
}

const notes = sectionBody(fs.readFileSync(CHANGELOG, 'utf8'), version)

// Shipping a release whose notes are silently empty is worse than not shipping:
// the update prompt would show a blank "what's new".
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
