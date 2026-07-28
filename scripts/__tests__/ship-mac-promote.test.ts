import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * ship-mac.mjs runs its release steps at import time, so its helpers can't be
 * imported directly. They are small and pure, so the test evaluates just those
 * two functions out of the source — which keeps them honest without letting the
 * test fire a release.
 */
function loadHelpers() {
    const src = readFileSync('scripts/ship-mac.mjs', 'utf8')
    const start = src.indexOf('/** Body of a "## [name]" section')
    if (start === -1) throw new Error('helper block not found in ship-mac.mjs')
    const body = src.slice(start)
    return new Function(`${body}; return { sectionBody, promote }`)() as {
        sectionBody: (text: string, name: string) => string | null
        promote: (text: string, version: string) => string
    }
}

const { sectionBody, promote } = loadHelpers()

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- A new thing.

## [1.1.0] - 2026-07-27

### Fixed

- An old thing.

[Unreleased]: https://github.com/Mohan-gtihub/quoril/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Mohan-gtihub/quoril/compare/v1.0.7...v1.1.0
`

describe('sectionBody', () => {
    it('reads the Unreleased body', () => {
        expect(sectionBody(CHANGELOG, 'Unreleased')).toContain('A new thing.')
        expect(sectionBody(CHANGELOG, 'Unreleased')).not.toContain('An old thing.')
    })

    it('returns null for an empty section, which blocks a release', () => {
        const empty = CHANGELOG.replace('### Added\n\n- A new thing.\n\n', '')
        expect(sectionBody(empty, 'Unreleased')).toBeNull()
    })

    it('excludes reference links from the final section', () => {
        expect(sectionBody(CHANGELOG, '1.1.0')).not.toContain('https://github.com')
    })
})

describe('promote', () => {
    const out = promote(CHANGELOG, '1.2.0')

    it('moves the notes under the new version and leaves Unreleased empty', () => {
        expect(out).toMatch(/## \[1\.2\.0\] - \d{4}-\d{2}-\d{2}/)
        expect(sectionBody(out, '1.2.0')).toContain('A new thing.')
        expect(sectionBody(out, 'Unreleased')).toBeNull()
    })

    it('does not disturb earlier versions', () => {
        expect(sectionBody(out, '1.1.0')).toContain('An old thing.')
    })

    it('repoints the compare links', () => {
        expect(out).toContain('[Unreleased]: https://github.com/Mohan-gtihub/quoril/compare/v1.2.0...HEAD')
        expect(out).toContain('[1.2.0]: https://github.com/Mohan-gtihub/quoril/compare/v1.1.0...v1.2.0')
    })

    it('produces a changelog release-notes.mjs can read back', () => {
        // Same extraction rule as scripts/release-notes.mjs.
        expect(sectionBody(out, '1.2.0')).toBeTruthy()
    })
})
