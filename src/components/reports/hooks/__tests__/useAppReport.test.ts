import { describe, it, expect } from 'vitest'
import { overlapMs, computeDistractionDuringFocus } from '../useAppReport'

describe('overlapMs', () => {
  it('returns the overlap of two ranges', () => {
    expect(overlapMs(0, 100, 50, 150)).toBe(50)
  })
  it('returns 0 for disjoint ranges', () => {
    expect(overlapMs(0, 100, 200, 300)).toBe(0)
  })
})

describe('computeDistractionDuringFocus', () => {
  it('sums distracting-app overlap inside focus windows and computes pct', () => {
    const focus = [{ start: '2026-07-01T09:00:00Z', end: '2026-07-01T10:00:00Z' }] // 3600s
    const distract = [
      { start: '2026-07-01T09:10:00Z', end: '2026-07-01T09:20:00Z' }, // 600s inside
      { start: '2026-07-01T11:00:00Z', end: '2026-07-01T11:30:00Z' }, // outside -> 0
    ]
    const out = computeDistractionDuringFocus(focus, distract)
    expect(out.focusSeconds).toBe(3600)
    expect(out.distractionSeconds).toBe(600)
    expect(out.pct).toBe(17)
  })

  it('returns zeros when there is no focus time', () => {
    expect(computeDistractionDuringFocus([], [])).toEqual({ distractionSeconds: 0, focusSeconds: 0, pct: 0 })
  })
})
