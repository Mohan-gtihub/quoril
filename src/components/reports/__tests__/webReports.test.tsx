import { describe, it, expect } from 'vitest'
import { platform } from '@/services/platform'

describe('web platform capabilities', () => {
  it('web has no app tracking', () => {
    expect(platform.capabilities.appTracking).toBe(false)
  })
})
