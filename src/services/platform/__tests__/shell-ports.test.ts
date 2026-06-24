import { describe, it, expect, vi } from 'vitest'
vi.mock('@/services/supabase', () => ({ supabase: {} }))
import { webPlatform } from '../web'

describe('web shell ports', () => {
  it('window controls and tracker are unavailable on web', () => {
    expect(webPlatform.windowControls.minimize()).toEqual({ available: false })
    expect(webPlatform.tracker.setContext({})).toEqual({ available: false })
    expect(webPlatform.links.openExternal('https://x.com')).toEqual({ available: false })
  })

  it('focusWindow extended methods are unavailable on web', () => {
    expect(webPlatform.focusWindow.setResizable(true)).toEqual({ available: false })
    expect(webPlatform.focusWindow.closeDevTools()).toEqual({ available: false })
  })

  it('auth extended methods are unavailable on web', () => {
    expect(webPlatform.auth.onDeepLink(() => {})).toEqual({ available: false })
    expect(webPlatform.auth.setUser(null)).toEqual({ available: false })
  })
})
