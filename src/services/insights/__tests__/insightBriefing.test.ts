import { describe, it, expect } from 'vitest'
import { validateBriefing, BriefingValidationError } from '../insightBriefing'
import { buildInsightPayload, numbersPresent, type InsightPayloadInputs } from '../insightPayload'

const goodBriefing = {
    headline: 'A steadier week than usual',
    insights: [
        { title: 'Mornings are your peak', body: 'Focus clusters before noon.', evidence: '9 hour = best' },
        { title: 'Fewer interruptions', body: 'You held sessions longer.', evidence: '3 sessions' },
    ],
    experiment: { suggestion: 'Protect 9am for deep work', why: 'It is when you focus best.' },
}

const allowed = new Set(['9', '3'])

describe('validateBriefing', () => {
    it('accepts a well-formed briefing and stamps generatedAt', () => {
        const b = validateBriefing(JSON.stringify(goodBriefing), allowed)
        expect(b.headline).toContain('steadier')
        expect(b.insights).toHaveLength(2)
        expect(b.generatedAt).toBeTruthy()
    })

    it('tolerates ```json fences', () => {
        const fenced = '```json\n' + JSON.stringify(goodBriefing) + '\n```'
        expect(() => validateBriefing(fenced, allowed)).not.toThrow()
    })

    it('rejects an invented number in evidence', () => {
        const bad = { ...goodBriefing, insights: [
            { title: 'x', body: 'y', evidence: '42 minutes saved' },
            goodBriefing.insights[1],
        ] }
        expect(() => validateBriefing(JSON.stringify(bad), allowed)).toThrow(BriefingValidationError)
    })

    it('rejects fewer than 2 insights', () => {
        const one = { ...goodBriefing, insights: [goodBriefing.insights[0]] }
        expect(() => validateBriefing(JSON.stringify(one), allowed)).toThrow(/out of range/)
    })

    it('truncates more than 3 insights instead of rejecting', () => {
        const four = { ...goodBriefing, insights: [
            goodBriefing.insights[0], goodBriefing.insights[1],
            { title: 'a', body: 'b', evidence: '9 x' },
            { title: 'c', body: 'd', evidence: '3 y' },
        ] }
        const b = validateBriefing(JSON.stringify(four), allowed)
        expect(b.insights).toHaveLength(3)
    })

    it('rejects markdown links and control characters', () => {
        const link = { ...goodBriefing, headline: 'See [here](http://x.com)' }
        expect(() => validateBriefing(JSON.stringify(link), allowed)).toThrow()
    })

    it('rejects an over-long field', () => {
        const long = { ...goodBriefing, headline: 'x'.repeat(200) }
        expect(() => validateBriefing(JSON.stringify(long), allowed)).toThrow(/exceeds/)
    })
})

function inputs(tier: InsightPayloadInputs['tier']): InsightPayloadInputs {
    return {
        tier,
        rangeDays: 30,
        focus: { minutes_today: 40, minutes_in_range: 900, break_minutes_in_range: 120, sessions: 20, deep_work_sessions: 8, longest_session_minutes: 75, efficiency_pct: 88, consistency_pct: 60, focus_streak_days: 4 },
        tasks: { completed_today: 3, completed_in_range: 45, open: 12, overdue: 2, completion_rate_pct: 78, completion_streak_days: 5, by_priority: { high: 4, medium: 6, low: 2 } },
        trend: { window_days: 7, focus_minutes: { current: 300, previous: 240 }, tasks_completed: { current: 12, previous: 9 }, sessions: { current: 8, previous: 6 }, efficiency: { current: 88, previous: 80 } },
        weekday: [{ weekday: 1, avgMinutes: 45 }],
        hour: [{ hour: 9, avgMinutes: 30 }],
        activity: { context_switches_per_hour: 22, blocks_per_focus_session: 3, longest_unbroken_block_minutes: 55, distinct_apps_per_day: 14, category_share_pct: { Communication: 35, Development: 40 } },
    }
}

describe('buildInsightPayload — privacy boundary', () => {
    it('omits activity at sessionsOnly even when provided', () => {
        const p = buildInsightPayload(inputs('sessionsOnly'))
        expect(p.activity).toBeUndefined()
    })
    it('includes activity only at withActivityPatterns', () => {
        const p = buildInsightPayload(inputs('withActivityPatterns'))
        expect(p.activity?.context_switches_per_hour).toBe(22)
    })
    it('serialized payload carries no app or task names — numbers/labels only', () => {
        const p = buildInsightPayload(inputs('withActivityPatterns'))
        const json = JSON.stringify(p)
        // category labels are ours (buckets), never app names; assert numbers exist
        expect(numbersPresent(p).has('22')).toBe(true)
        // no window titles, bundle ids, or executable names leak into the payload
        expect(json).not.toMatch(/window_title|bundle_?id|\.exe/i)
    })
})
