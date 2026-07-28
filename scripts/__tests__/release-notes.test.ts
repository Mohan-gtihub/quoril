import { describe, it, expect } from 'vitest'
// @ts-expect-error - plain .mjs script, no type declarations
import { extractNotes } from '../release-notes.mjs'

const CHANGELOG = `# Changelog

## [Unreleased]

## [1.0.8] - 2026-07-27

### Added

- Release notes in the update prompt.

## [1.0.7] - 2026-07-26

### Fixed

- Signing.

[1.0.8]: https://github.com/o/r/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/o/r/releases/tag/v1.0.7
`

describe('extractNotes', () => {
    it('returns only the requested version section', () => {
        const notes = extractNotes(CHANGELOG, '1.0.8')
        expect(notes).toContain('Release notes in the update prompt.')
        // The next version's content must not bleed in.
        expect(notes).not.toContain('Signing.')
        expect(notes).not.toContain('1.0.7')
    })

    it('excludes the trailing reference-link block from the last section', () => {
        const notes = extractNotes(CHANGELOG, '1.0.7')
        expect(notes).toContain('Signing.')
        expect(notes).not.toContain('https://github.com')
    })

    it('returns null for a version with no entry, so the release script can fail loudly', () => {
        expect(extractNotes(CHANGELOG, '9.9.9')).toBeNull()
    })

    it('returns null for a heading with an empty body', () => {
        expect(extractNotes(CHANGELOG, 'Unreleased')).toBeNull()
    })

    it('accepts a bare heading without brackets or a date', () => {
        expect(extractNotes('## 2.0.0\n\n- Something\n', '2.0.0')).toContain('Something')
    })

    it('does not let a version string be read as a regex', () => {
        // '1.0.8' must not match '1x0x8' via the unescaped dot.
        expect(extractNotes('## [1x0x8]\n\n- nope\n', '1.0.8')).toBeNull()
    })

    it('matches the real CHANGELOG for the current package version', async () => {
        const fs = await import('node:fs')
        const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version
        const notes = extractNotes(fs.readFileSync('CHANGELOG.md', 'utf8'), version)
        expect(notes, `CHANGELOG.md has no section for ${version}`).toBeTruthy()
    })
})
