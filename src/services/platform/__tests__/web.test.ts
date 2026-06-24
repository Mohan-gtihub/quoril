import { describe, it, expect, vi } from 'vitest'

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [] }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { webPlatform } from '../web'

describe('webPlatform', () => {
  it('reports no native tracking/overlay', () => {
    expect(webPlatform.capabilities.appTracking).toBe(false)
    expect(webPlatform.capabilities.nativeOverlay).toBe(false)
    expect(webPlatform.capabilities.localDb).toBe(false)
  })
  it('native methods return unavailable', () => {
    expect(webPlatform.focusWindow.setAlwaysOnTop(true)).toEqual({ available: false })
    expect(webPlatform.screenTime.isTrackingAvailable()).toBe(false)
  })
})
