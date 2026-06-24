import { describe, it, expect } from 'vitest'
import { UNAVAILABLE } from '../types'
describe('platform types', () => {
  it('exposes UNAVAILABLE sentinel', () => {
    expect(UNAVAILABLE).toEqual({ available: false })
  })
})
