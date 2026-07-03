import { describe, it, expect } from 'vitest'
import {
  buildPeakHours,
  computeDeepWorkTotals,
  mergeDeepWorkTrend,
  DEEP_WORK_MIN_SECONDS,
} from '../useFocusReport'

describe('DEEP_WORK_MIN_SECONDS', () => {
  it('is 25 minutes', () => {
    expect(DEEP_WORK_MIN_SECONDS).toBe(1500)
  })
})

describe('buildPeakHours', () => {
  it('returns 24 gapless bins with focus converted to minutes', () => {
    const out = buildPeakHours([{ hour: 9, focusSeconds: 3600 }, { hour: 14, focusSeconds: 1800 }])
    expect(out).toHaveLength(24)
    expect(out[9]).toEqual({ hour: 9, minutes: 60, isPeak: true })
    expect(out[14]).toEqual({ hour: 14, minutes: 30, isPeak: false })
    expect(out[0]).toEqual({ hour: 0, minutes: 0, isPeak: false })
  })

  it('marks no peak when all zero', () => {
    const out = buildPeakHours([])
    expect(out.every(b => b.isPeak === false)).toBe(true)
  })
})

describe('computeDeepWorkTotals', () => {
  it('sums blocks and converts seconds to hours (1 decimal)', () => {
    expect(computeDeepWorkTotals([
      { deepSeconds: 5400, blockCount: 2 },
      { deepSeconds: 1800, blockCount: 1 },
    ])).toEqual({ hours: 2, blocks: 3 })
  })

  it('handles empty input', () => {
    expect(computeDeepWorkTotals([])).toEqual({ hours: 0, blocks: 0 })
  })
})

describe('mergeDeepWorkTrend', () => {
  it('joins deep minutes onto the focus trend by day, zero when missing', () => {
    const out = mergeDeepWorkTrend(
      [{ day: '2026-07-01', focusMinutes: 120 }, { day: '2026-07-02', focusMinutes: 60 }],
      [{ day: '2026-07-01', deepSeconds: 3600 }],
    )
    expect(out).toEqual([
      { day: '2026-07-01', focusMinutes: 120, deepMinutes: 60 },
      { day: '2026-07-02', focusMinutes: 60, deepMinutes: 0 },
    ])
  })
})
