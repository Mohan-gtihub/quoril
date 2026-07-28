import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReleaseNotes } from '../ReleaseNotes'

describe('ReleaseNotes', () => {
    it('renders bullets as text', () => {
        const { container } = render(<ReleaseNotes notes={'### Added\n\n- Faster sync\n- Fixed a crash'} />)
        expect(screen.getByText('Faster sync')).toBeTruthy()
        expect(screen.getByText('Fixed a crash')).toBeTruthy()
        expect(container.textContent).toContain('Added')
    })

    it('strips inline emphasis and code without emitting markup', () => {
        render(<ReleaseNotes notes={'- **Bold** and `code` and _em_'} />)
        expect(screen.getByText('Bold and code and em')).toBeTruthy()
    })

    it('renders link text but never a clickable anchor', () => {
        const { container } = render(<ReleaseNotes notes={'- See [the docs](https://example.com/x)'} />)
        expect(container.querySelector('a')).toBeNull()
        expect(container.textContent).toContain('See the docs')
        expect(container.textContent).not.toContain('https://example.com')
    })

    // The release body is remote content: whoever can publish a release controls
    // it. It must never be able to introduce markup or script into the renderer.
    it('does not interpret HTML in the release body', () => {
        const hostile = '- <img src=x onerror="window.__pwned=1"> <script>window.__pwned=1</script>'
        const { container } = render(<ReleaseNotes notes={hostile} />)

        expect(container.querySelector('img')).toBeNull()
        expect(container.querySelector('script')).toBeNull()
        expect((window as any).__pwned).toBeUndefined()
        // The raw markup survives only as inert text.
        expect(container.textContent).toContain('<script>')
    })

    it('renders nothing when the notes have no usable content', () => {
        const { container } = render(<ReleaseNotes notes={'   \n---\n  '} />)
        expect(container.firstChild).toBeNull()
    })
})
