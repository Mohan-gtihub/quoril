import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TrackingDetail } from '@/services/platform/types'
import type { EnableOutcome } from '@/hooks/useTrackingDetail'

const state = vi.hoisted(() => ({
    detail: null as TrackingDetail | null,
    outcome: { status: 'enabled' } as EnableOutcome,
    setEnabled: null as any,
    relaunch: null as any,
}))

vi.mock('@/hooks/useTrackingDetail', () => ({
    useTrackingDetail: () => ({
        detail: state.detail,
        busy: false,
        setEnabled: state.setEnabled,
        refresh: vi.fn(),
        relaunch: state.relaunch,
    }),
}))

import { DetailedTrackingSettings } from '../DetailedTrackingSettings'

function detail(over: Partial<Record<'titles' | 'urls', { enabled: boolean; granted: boolean }>> = {}): TrackingDetail {
    return {
        titles: { enabled: false, granted: false, ...over.titles },
        urls: { enabled: false, granted: false, ...over.urls },
    }
}

beforeEach(() => {
    state.detail = detail()
    state.outcome = { status: 'enabled' }
    state.setEnabled = vi.fn(async () => state.outcome)
    state.relaunch = vi.fn()
})

describe('rendering', () => {
    it('offers both capabilities separately', () => {
        render(<DetailedTrackingSettings />)
        expect(screen.getByRole('switch', { name: 'Website addresses' })).toBeTruthy()
        expect(screen.getByRole('switch', { name: 'Window titles' })).toBeTruthy()
    })

    it('renders nothing where the platform has no such concept (web)', () => {
        state.detail = null
        const { container } = render(<DetailedTrackingSettings />)
        expect(container.firstChild).toBeNull()
    })

    it('states that the data stays local, which is the privacy promise', () => {
        render(<DetailedTrackingSettings />)
        expect(document.body.textContent).toMatch(/never uploaded|stays in the local/i)
    })

    it('both default to off', () => {
        render(<DetailedTrackingSettings />)
        expect(screen.getByRole('switch', { name: 'Website addresses' }).getAttribute('aria-checked')).toBe('false')
        expect(screen.getByRole('switch', { name: 'Window titles' }).getAttribute('aria-checked')).toBe('false')
    })

    it('reflects an enabled capability', () => {
        state.detail = detail({ urls: { enabled: true, granted: true } })
        render(<DetailedTrackingSettings />)
        expect(screen.getByRole('switch', { name: 'Website addresses' }).getAttribute('aria-checked')).toBe('true')
    })

    it('warns that window titles need a restart, before the user commits', () => {
        render(<DetailedTrackingSettings />)
        expect(document.body.textContent).toMatch(/restarted after granting/i)
    })
})

describe('toggling', () => {
    it('turns a capability on', async () => {
        const user = userEvent.setup()
        render(<DetailedTrackingSettings />)
        await user.click(screen.getByRole('switch', { name: 'Website addresses' }))
        expect(state.setEnabled).toHaveBeenCalledWith('urls', true)
    })

    it('turns a capability off', async () => {
        state.detail = detail({ urls: { enabled: true, granted: true } })
        const user = userEvent.setup()
        render(<DetailedTrackingSettings />)
        await user.click(screen.getByRole('switch', { name: 'Website addresses' }))
        expect(state.setEnabled).toHaveBeenCalledWith('urls', false)
    })

    it('keeps the two independent', async () => {
        const user = userEvent.setup()
        render(<DetailedTrackingSettings />)
        await user.click(screen.getByRole('switch', { name: 'Window titles' }))
        expect(state.setEnabled).toHaveBeenCalledWith('titles', true)
        expect(state.setEnabled).not.toHaveBeenCalledWith('urls', expect.anything())
    })
})

/* Opted in but not granted: the switch reads "on" while nothing is collected,
   so the UI has to say so rather than let it look like it is working. */
describe('opted in but not yet granted', () => {
    beforeEach(() => {
        state.detail = detail({ urls: { enabled: true, granted: false } })
    })

    it('says it is waiting on the permission', () => {
        render(<DetailedTrackingSettings />)
        expect(document.body.textContent).toMatch(/Waiting on Accessibility permission/i)
    })

    it('names the right permission per capability', () => {
        state.detail = detail({ titles: { enabled: true, granted: false } })
        render(<DetailedTrackingSettings />)
        expect(document.body.textContent).toMatch(/Waiting on Screen Recording permission/i)
    })

    it('offers a restart, because macOS may not report the grant until then', async () => {
        const user = userEvent.setup()
        render(<DetailedTrackingSettings />)
        await user.click(screen.getByText(/Already granted it\?/i))
        expect(state.relaunch).toHaveBeenCalled()
    })

    it('shows no waiting state once the grant lands', () => {
        state.detail = detail({ urls: { enabled: true, granted: true } })
        render(<DetailedTrackingSettings />)
        expect(document.body.textContent).not.toMatch(/Waiting on/i)
    })
})

describe('outcome notices', () => {
    it('offers a restart when one is required', async () => {
        state.detail = detail({ titles: { enabled: false, granted: true } })
        state.outcome = { status: 'needs-relaunch' }
        const user = userEvent.setup()
        render(<DetailedTrackingSettings />)

        await user.click(screen.getByRole('switch', { name: 'Window titles' }))
        await waitFor(() => expect(document.body.textContent).toMatch(/only takes effect after a restart/i))

        await user.click(screen.getByRole('button', { name: /Restart now/i }))
        expect(state.relaunch).toHaveBeenCalled()
    })

    it('explains the System Settings detour', async () => {
        state.outcome = { status: 'needs-permission', capability: 'urls' }
        const user = userEvent.setup()
        render(<DetailedTrackingSettings />)

        await user.click(screen.getByRole('switch', { name: 'Website addresses' }))
        await waitFor(() => expect(document.body.textContent).toMatch(/Grant Accessibility to Quoril in System Settings/i))
    })

    it('shows no notice on a clean enable', async () => {
        state.detail = detail({ urls: { enabled: false, granted: true } })
        state.outcome = { status: 'enabled' }
        const user = userEvent.setup()
        render(<DetailedTrackingSettings />)

        await user.click(screen.getByRole('switch', { name: 'Website addresses' }))
        await waitFor(() => expect(state.setEnabled).toHaveBeenCalled())
        expect(document.body.textContent).not.toMatch(/only takes effect after a restart/i)
    })
})
