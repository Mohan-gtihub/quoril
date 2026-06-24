import { describe, it, expect, vi, beforeEach } from 'vitest'
describe('getPlatform', () => {
  beforeEach(() => { vi.resetModules(); (globalThis as any).window = {} })
  it('selects web platform when electronAPI absent', async () => {
    const { getPlatform } = await import('../index')
    expect(getPlatform().capabilities.localDb).toBe(false)
  })
})
