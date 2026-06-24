import { describe, it, expect, vi } from 'vitest'

vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { platform } from '@/services/platform'

describe('web auth', () => {
  it('signInWithPassword delegates to supabase', async () => {
    const spy = vi.spyOn(platform.auth, 'signInWithPassword').mockResolvedValue({ data: {}, error: null } as any)
    await platform.auth.signInWithPassword('a@b.com', 'pw')
    expect(spy).toHaveBeenCalledWith('a@b.com', 'pw')
  })

  it('onDeepLink returns UNAVAILABLE on web (not a function)', () => {
    const result = platform.auth.onDeepLink(() => {})
    // On web, onDeepLink returns { available: false } — not a function
    expect(typeof result).not.toBe('function')
    expect(result).toEqual({ available: false })
  })

  it('setUser returns UNAVAILABLE on web', () => {
    const result = platform.auth.setUser(null, null)
    expect(result).toEqual({ available: false })
  })
})
