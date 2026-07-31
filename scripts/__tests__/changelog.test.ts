import { describe, it, expect } from 'vitest'
// @ts-expect-error - plain .mjs script, no type declarations
import { nextVersion, promote, sectionBody } from '../changelog.mjs'

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- A new thing.

## [1.1.0] - 2026-07-27

### Fixed

- An old thing.

## [1.0.7] - 2026-07-26

### Fixed

- Signing.

[Unreleased]: https://github.com/Mohan-gtihub/quoril/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Mohan-gtihub/quoril/compare/v1.0.7...v1.1.0
`

describe('sectionBody', () => {
    it('returns only the requested version section', () => {
        const notes = sectionBody(CHANGELOG, '1.1.0')
        expect(notes).toContain('An old thing.')
        // The neighbouring versions' content must not bleed in.
        expect(notes).not.toContain('A new thing.')
        expect(notes).not.toContain('Signing.')
    })

    it('excludes the trailing reference-link block from the last section', () => {
        const notes = sectionBody(CHANGELOG, '1.0.7')
        expect(notes).toContain('Signing.')
        expect(notes).not.toContain('https://github.com')
    })

    it('returns null for a version with no entry, so the release fails loudly', () => {
        expect(sectionBody(CHANGELOG, '9.9.9')).toBeNull()
    })

    it('returns null for an empty section rather than an empty string', () => {
        expect(sectionBody('# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - x\n', 'Unreleased'))
            .toBeNull()
    })
})

describe('promote', () => {
    const out = promote(CHANGELOG, '1.2.0')

    it('moves [Unreleased] content into the new version section', () => {
        expect(sectionBody(out, '1.2.0')).toContain('A new thing.')
    })

    it('leaves [Unreleased] empty so the next release starts clean', () => {
        expect(sectionBody(out, 'Unreleased')).toBeNull()
    })

    it('dates the new section', () => {
        expect(out).toMatch(/## \[1\.2\.0\] - \d{4}-\d{2}-\d{2}/)
    })

    it('repoints the compare links', () => {
        expect(out).toContain('[Unreleased]: https://github.com/Mohan-gtihub/quoril/compare/v1.2.0...HEAD')
        expect(out).toContain('[1.2.0]: https://github.com/Mohan-gtihub/quoril/compare/v1.1.0...v1.2.0')
    })

    it('refuses to promote an empty [Unreleased]', () => {
        expect(() => promote('# Changelog\n\n## [Unreleased]\n', '1.2.0')).toThrow()
    })
})

describe('nextVersion', () => {
    it('bumps each level', () => {
        expect(nextVersion('1.1.6', 'patch')).toBe('1.1.7')
        expect(nextVersion('1.1.6', 'minor')).toBe('1.2.0')
        expect(nextVersion('1.1.6', 'major')).toBe('2.0.0')
    })

    it('accepts an explicit version', () => {
        expect(nextVersion('1.1.6', '3.0.0-beta.1')).toBe('3.0.0-beta.1')
    })

    it('rejects anything else instead of silently guessing', () => {
        expect(() => nextVersion('1.1.6', 'pathc')).toThrow()
    })
})
