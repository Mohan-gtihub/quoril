import { describe, it, expect } from 'vitest'
import { canUsePiP } from '../FocusPiP'

describe('PiP support', () => {
  it('returns false when API absent', () => {
    // jsdom has no documentPictureInPicture
    expect(canUsePiP()).toBe(false)
  })
})
