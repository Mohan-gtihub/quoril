import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { TrackingDetail } from '../types'

const state = vi.hoisted(() => ({
    detail: null as TrackingDetail | null,
    api: {} as any,
}))

vi.stubGlobal('window', globalThis.window ?? {})

function detail(over: Partial<Record<'titles' | 'urls', { enabled: boolean; granted: boolean }>> = {}): TrackingDetail {
    return {
        titles: { enabled: false, granted: false, ...over.titles },
        urls: { enabled: false, granted: false, ...over.urls },
    }
}

beforeEach(() => {
    state.detail = detail()
    ;(window as any).electronAPI = {
        permissions: {
            getTrackingDetail: async () => state.detail,
            setTrackingDetail: async () => state.detail,
            requestAccessibility: async () => ({ granted: true, detail: state.detail }),
            openPrivacySettings: async () => true,
            relaunch: async () => {},
        },
    }
})

/* isDetailTrackingAvailable answers "can any detail panel show data at all?".
   It must require BOTH the opt-in and the grant, for either capability. */
describe('electron: isDetailTrackingAvailable', () => {
    async function ask() {
        vi.resetModules()
        const { electronPlatform } = await import('../electron')
        return electronPlatform.screenTime.isDetailTrackingAvailable()
    }

    it('is false when nothing is enabled', async () => {
        state.detail = detail()
        expect(await ask()).toBe(false)
    })

    it('is false when opted in but not granted', async () => {
        state.detail = detail({ urls: { enabled: true, granted: false } })
        expect(await ask()).toBe(false)
    })

    it('is false when granted but not opted in', async () => {
        state.detail = detail({ urls: { enabled: false, granted: true } })
        expect(await ask()).toBe(false)
    })

    it('is true when either capability is fully live', async () => {
        state.detail = detail({ urls: { enabled: true, granted: true } })
        expect(await ask()).toBe(true)

        state.detail = detail({ titles: { enabled: true, granted: true } })
        expect(await ask()).toBe(true)
    })

    it('is false when the bridge is missing entirely', async () => {
        ;(window as any).electronAPI = {}
        expect(await ask()).toBe(false)
    })
})

describe('web: detail tracking is simply absent', () => {
    it('reports nothing to opt into, without throwing', async () => {
        const { webPlatform } = await import('../web')
        expect(await webPlatform.screenTime.isDetailTrackingAvailable()).toBe(false)
        expect(await webPlatform.screenTime.getTrackingDetail()).toBeNull()
        expect(await webPlatform.screenTime.setTrackingDetail('urls', true)).toBeNull()
        expect(await webPlatform.screenTime.requestAccessibility()).toBeNull()
        expect(await webPlatform.screenTime.openPrivacySettings('urls')).toBe(false)
        await expect(webPlatform.screenTime.relaunch()).resolves.toBeUndefined()
    })
})
