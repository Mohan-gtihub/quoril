import { describe, it, expect } from 'vitest'
import { buildInsightSummary, type BuildSummaryInput } from '../buildSummary'

const base: BuildSummaryInput = {
    rangeLabel: 'Last 7 days',
    activeSeconds: 392 * 60,
    deepWorkHours: 3,
    deepWorkBlocks: 4,
    focusSessions: 5,
    focusSeconds: 184 * 60,
    avgSessionSeconds: 36 * 60,
    contextSwitchesPerDay: 248.4,
    idlePercent: 12.6,
    tasksCompleted: 6,
    tasksTotal: 8,
    completionRate: 75,
    focusLinkedPercent: 91,
    distractionDuringFocusSeconds: 31 * 60,
    distractionPercent: 17,
    overallDistractionSeconds: 44 * 60,
    overallDistractionPercent: 11,
    distractionByCategory: [
        { category: 'Social', seconds: 22 * 60 },
        { category: 'Entertainment', seconds: 22 * 60 },
    ],
    peakHours: [
        { hour: 10, minutes: 90, isPeak: true },
        { hour: 15, minutes: 20, isPeak: false },
    ],
    topCategories: [
        { name: 'Coding', seconds: 156 * 60 },
        { name: 'Research', seconds: 0 },
    ],
    distractingApps: [
        { name: 'YouTube', seconds: 22 * 60 },
        { name: 'Discord', seconds: 9 * 60 },
        { name: 'NotDistracting', seconds: 0 },
    ],
}

describe('buildInsightSummary', () => {
    it('rounds seconds to minutes and maps the metrics', () => {
        const s = buildInsightSummary(base)
        expect(s.active_time_minutes).toBe(392)
        expect(s.deep_work_minutes).toBe(180)
        expect(s.context_switches_per_day).toBe(248)
        expect(s.idle_percent).toBe(13)
        expect(s.distraction_during_focus_minutes).toBe(31)
    })

    it('picks best/worst focus windows from peak hours', () => {
        const s = buildInsightSummary(base)
        expect(s.best_focus_window).toBe('10:00 AM – 11:00 AM')
        expect(s.worst_focus_window).toBe('3:00 PM – 4:00 PM')
    })

    it('worst window is null when only one hour has focus', () => {
        const s = buildInsightSummary({ ...base, peakHours: [{ hour: 9, minutes: 60, isPeak: true }] })
        expect(s.best_focus_window).toBe('9:00 AM – 10:00 AM')
        expect(s.worst_focus_window).toBeNull()
    })

    it('drops zero-value categories and non-leaking apps, sorts leaks desc', () => {
        const s = buildInsightSummary(base)
        expect(s.top_categories).toEqual([{ name: 'Coding', minutes: 156 }])
        expect(s.top_attention_leaks).toEqual([
            { source: 'YouTube', minutes: 22 },
            { source: 'Discord', minutes: 9 },
        ])
    })

    it('handles an empty day without throwing', () => {
        const empty = buildInsightSummary({
            ...base, peakHours: [], topCategories: [], distractingApps: [],
            activeSeconds: 0, focusSeconds: 0, deepWorkHours: 0,
        })
        expect(empty.best_focus_window).toBeNull()
        expect(empty.top_attention_leaks).toEqual([])
        expect(empty.deep_work_minutes).toBe(0)
    })
})
