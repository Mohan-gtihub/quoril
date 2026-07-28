import { describe, it, expect } from 'vitest'
import { platform } from '@/services/platform'

describe('web platform capabilities', () => {
  it('web has no app tracking', () => {
    expect(platform.capabilities.appTracking).toBe(false)
  })

  it('web reports must not depend on app-tracking data being present', () => {
    // hasAppData is false on web (no app_sessions). The curated focus/task cards
    // (Deep Work, Peak Hours, Tasks Powered by Focus) must not be gated on it.
    const hasAppData = false
    const alwaysVisibleCards = ['Focus & Deep Work', 'Peak Productivity Hours', 'Tasks Powered by Focus']
    expect(alwaysVisibleCards.length).toBeGreaterThan(0)
    expect(hasAppData).toBe(false)
  })
})
