import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { TrackingDetail } from '@/services/platform/types'

/* Mutable fake of the main-process permission surface. */
const state = vi.hoisted(() => ({
    detail: null as TrackingDetail | null,
    /** Whether the simulated user accepts the Accessibility prompt. */
    acceptPrompt: false,
    calls: [] as string[],
}))

const setDetailCalls: Array<[string, boolean]> = []

vi.mock('@/services/platform', () => ({
    platform: {
        capabilities: { appTracking: true },
        screenTime: {
            async getTrackingDetail() {
                state.calls.push('get')
                return state.detail
            },
            async setTrackingDetail(capability: 'titles' | 'urls', enabled: boolean) {
                state.calls.push(`set:${capability}:${enabled}`)
                setDetailCalls.push([capability, enabled])
                if (state.detail) state.detail[capability].enabled = enabled
                return state.detail
            },
            async requestAccessibility() {
                state.calls.push('prompt')
                if (state.acceptPrompt && state.detail) state.detail.urls.granted = true
                return { granted: Boolean(state.acceptPrompt), detail: state.detail! }
            },
            async openPrivacySettings(capability: string) {
                state.calls.push(`openSettings:${capability}`)
                return true
            },
            async relaunch() {
                state.calls.push('relaunch')
            },
        },
    },
}))

vi.mock('@/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { useTrackingDetail } from '../useTrackingDetail'

function detail(over: Partial<Record<'titles' | 'urls', { enabled: boolean; granted: boolean }>> = {}): TrackingDetail {
    return {
        titles: { enabled: false, granted: false, ...over.titles },
        urls: { enabled: false, granted: false, ...over.urls },
    }
}

beforeEach(() => {
    state.detail = detail()
    state.acceptPrompt = false
    state.calls = []
    setDetailCalls.length = 0
})

afterEach(() => {
    vi.useRealTimers()
})

describe('initial load', () => {
    it('reads the current state on mount', async () => {
        state.detail = detail({ urls: { enabled: true, granted: true } })
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())
        expect(result.current.detail!.urls).toEqual({ enabled: true, granted: true })
    })

    it('reports null where the platform has no such concept (web)', async () => {
        state.detail = null
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(state.calls).toContain('get'))
        expect(result.current.detail).toBeNull()
    })
})

describe('enabling a capability', () => {
    it('persists the opt-in BEFORE prompting, so a grant made later still counts', async () => {
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())

        await act(async () => { await result.current.setEnabled('urls', true) })

        // The order is the whole point: if the flag were only written after a
        // successful prompt, returning from System Settings would find the
        // capability still off and silently do nothing.
        const setIndex = state.calls.indexOf('set:urls:true')
        const promptIndex = state.calls.indexOf('prompt')
        expect(setIndex).toBeGreaterThanOrEqual(0)
        expect(promptIndex).toBeGreaterThan(setIndex)
    })

    it('enables immediately when the permission is already granted', async () => {
        state.detail = detail({ urls: { enabled: false, granted: true } })
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())

        let outcome: any
        await act(async () => { outcome = await result.current.setEnabled('urls', true) })

        expect(outcome).toEqual({ status: 'enabled' })
        // Already granted → no prompt, no System Settings detour.
        expect(state.calls).not.toContain('prompt')
        expect(state.calls.some(c => c.startsWith('openSettings'))).toBe(false)
    })

    it('accepts the inline Accessibility prompt for urls', async () => {
        state.acceptPrompt = true
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())

        let outcome: any
        await act(async () => { outcome = await result.current.setEnabled('urls', true) })

        expect(outcome).toEqual({ status: 'enabled' })
        expect(state.calls).toContain('prompt')
    })

    it('falls back to System Settings when the prompt is declined', async () => {
        state.acceptPrompt = false
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())

        let outcome: any
        await act(async () => { outcome = await result.current.setEnabled('urls', true) })

        expect(outcome).toEqual({ status: 'needs-permission', capability: 'urls' })
        expect(state.calls).toContain('openSettings:urls')
        // The opt-in is still recorded, so the grant is picked up on return.
        expect(result.current.detail!.urls.enabled).toBe(true)
    })

    // Screen Recording has no prompt API at all — never try to prompt for it.
    it('never prompts for titles, only deep-links', async () => {
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())

        let outcome: any
        await act(async () => { outcome = await result.current.setEnabled('titles', true) })

        expect(state.calls).not.toContain('prompt')
        expect(state.calls).toContain('openSettings:titles')
        expect(outcome).toEqual({ status: 'needs-permission', capability: 'titles' })
    })

    it('asks for a relaunch when titles is granted, since macOS requires one', async () => {
        state.detail = detail({ titles: { enabled: false, granted: true } })
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())

        let outcome: any
        await act(async () => { outcome = await result.current.setEnabled('titles', true) })

        expect(outcome).toEqual({ status: 'needs-relaunch' })
    })

    it('reports unavailable rather than throwing on web', async () => {
        state.detail = null
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(state.calls).toContain('get'))

        let outcome: any
        await act(async () => { outcome = await result.current.setEnabled('urls', true) })
        expect(outcome).toEqual({ status: 'unavailable' })
    })
})

describe('disabling a capability', () => {
    it('turns off without touching the OS permission', async () => {
        state.detail = detail({ urls: { enabled: true, granted: true } })
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())

        let outcome: any
        await act(async () => { outcome = await result.current.setEnabled('urls', false) })

        expect(outcome).toEqual({ status: 'disabled' })
        expect(setDetailCalls).toContainEqual(['urls', false])
        // Revoking the grant is the user's business, not ours.
        expect(state.calls).not.toContain('prompt')
        expect(state.calls.some(c => c.startsWith('openSettings'))).toBe(false)
    })
})

/* The bug behind "I enabled it and it still says waiting". */
describe('noticing a grant made outside the app', () => {
    it('picks up a grant by polling, with no focus event at all', async () => {
        vi.useFakeTimers()
        state.detail = detail({ urls: { enabled: true, granted: false } })
        const { result } = renderHook(() => useTrackingDetail())

        await act(async () => { await vi.advanceTimersByTimeAsync(0) })
        expect(result.current.detail!.urls.granted).toBe(false)

        // User grants it in System Settings; Quoril never loses or regains focus.
        state.detail = detail({ urls: { enabled: true, granted: true } })
        await act(async () => { await vi.advanceTimersByTimeAsync(2500) })

        expect(result.current.detail!.urls.granted).toBe(true)
    })

    it('also refreshes on window focus', async () => {
        state.detail = detail({ urls: { enabled: true, granted: false } })
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())

        state.detail = detail({ urls: { enabled: true, granted: true } })
        await act(async () => { window.dispatchEvent(new Event('focus')) })

        await waitFor(() => expect(result.current.detail!.urls.granted).toBe(true))
    })

    it('stops polling once unmounted', async () => {
        vi.useFakeTimers()
        const { unmount } = renderHook(() => useTrackingDetail())
        await act(async () => { await vi.advanceTimersByTimeAsync(0) })

        unmount()
        const after = state.calls.length
        await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
        expect(state.calls.length).toBe(after)
    })
})

describe('relaunch', () => {
    it('is exposed for the "already granted it" escape hatch', async () => {
        const { result } = renderHook(() => useTrackingDetail())
        await waitFor(() => expect(result.current.detail).not.toBeNull())

        await act(async () => { await result.current.relaunch() })
        expect(state.calls).toContain('relaunch')
    })
})
