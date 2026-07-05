import { describe, it, expect, beforeEach } from 'vitest'
import {
    loadInsights, saveInsights, isRegenEligible, msUntilRegenEligible, formatCooldown, REGEN_COOLDOWN_MS,
} from '../insightsCache'
import type { InsightsResult } from '../types'

const sampleResult: InsightsResult = { summary: 's', insights: [], tomorrow_plan: [] }

describe('insightsCache', () => {
    beforeEach(() => localStorage.clear())

    it('round-trips a saved entry', () => {
        saveInsights('Today', { result: sampleResult, model: 'm', generatedAt: 123 })
        const got = loadInsights('Today')
        expect(got?.generatedAt).toBe(123)
        expect(got?.result.summary).toBe('s')
    })

    it('returns null for missing or malformed entries', () => {
        expect(loadInsights('Nope')).toBeNull()
        localStorage.setItem('quoril.insights.Bad', '{not json')
        expect(loadInsights('Bad')).toBeNull()
    })

    it('gates regeneration for 6h then allows it', () => {
        const t0 = 1_000_000
        expect(isRegenEligible(t0, t0)).toBe(false)
        expect(isRegenEligible(t0, t0 + REGEN_COOLDOWN_MS - 1)).toBe(false)
        expect(isRegenEligible(t0, t0 + REGEN_COOLDOWN_MS)).toBe(true)
        expect(isRegenEligible(null, t0)).toBe(true)
    })

    it('reports remaining cooldown time', () => {
        const t0 = 1_000_000
        expect(msUntilRegenEligible(t0, t0)).toBe(REGEN_COOLDOWN_MS)
        expect(msUntilRegenEligible(t0, t0 + REGEN_COOLDOWN_MS + 5)).toBe(0)
    })

    it('formats cooldown compactly', () => {
        expect(formatCooldown(0)).toBe('0m')
        expect(formatCooldown(4 * 60_000)).toBe('4m')
        expect(formatCooldown((3 * 60 + 21) * 60_000)).toBe('3h 21m')
    })
})
