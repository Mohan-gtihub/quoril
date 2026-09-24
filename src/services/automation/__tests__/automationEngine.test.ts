import { describe, it, expect } from 'vitest'
import { evaluateRules, recommendationFor, DEFAULT_RULES, type Rule, type AutomationContext } from '../automationEngine'
import type { Task } from '@/types/database'

function ctx(partial: Partial<AutomationContext>): AutomationContext {
    return {
        now: partial.now ?? new Date(2026, 7, 11, 12, 0, 0),
        tasks: partial.tasks ?? [],
        calendar: partial.calendar ?? [],
        focusedSecondsToday: partial.focusedSecondsToday ?? 0,
        uninterruptedScreenMinutes: partial.uninterruptedScreenMinutes ?? 0,
    }
}

const rule = (id: string): Rule => ({ ...DEFAULT_RULES.find((r) => r.id === id)!, isEnabled: true })

const activeTask = (): Task => ({ id: 't1', title: 'Write spec', status: 'active', priority: 'high' } as Task)

describe('recommendationFor', () => {
    it('meetingSoon fires for an event within 30 minutes', () => {
        const now = new Date(2026, 7, 11, 12, 0, 0)
        const start = new Date(now.getTime() + 10 * 60000)
        const rec = recommendationFor(rule('meeting-prep'), ctx({ now, calendar: [{ title: 'Standup', start, end: new Date(start.getTime() + 30 * 60000) }] }))
        expect(rec?.title).toContain('Standup')
        expect(rec?.reason).toContain('10 minutes')
    })

    it('activeTaskWithoutFocus fires only when no focus captured today', () => {
        const withFocus = recommendationFor(rule('forgotten-focus'), ctx({ tasks: [activeTask()], focusedSecondsToday: 600 }))
        expect(withFocus).toBeNull()
        const without = recommendationFor(rule('forgotten-focus'), ctx({ tasks: [activeTask()], focusedSecondsToday: 0 }))
        expect(without?.taskId).toBe('t1')
    })

    it('longScreenStretch needs at least 50 uninterrupted minutes', () => {
        expect(recommendationFor(rule('break-coach'), ctx({ uninterruptedScreenMinutes: 40 }))).toBeNull()
        expect(recommendationFor(rule('break-coach'), ctx({ uninterruptedScreenMinutes: 55 }))?.action).toBe('takeBreak')
    })
})

describe('evaluateRules', () => {
    it('returns nothing when all rules are disabled (opt-in)', () => {
        const rec = evaluateRules(DEFAULT_RULES, ctx({ tasks: [activeTask()], focusedSecondsToday: 0 }), {})
        expect(rec).toBeNull()
    })

    it('respects the per-rule hourly rate limit', () => {
        const now = new Date(2026, 7, 11, 12, 0, 0)
        const rules = [rule('forgotten-focus')]
        const context = ctx({ now, tasks: [activeTask()], focusedSecondsToday: 0 })
        // shown 10 minutes ago → suppressed
        expect(evaluateRules(rules, context, { 'forgotten-focus': now.getTime() - 10 * 60000 })).toBeNull()
        // shown 2 hours ago → allowed
        expect(evaluateRules(rules, context, { 'forgotten-focus': now.getTime() - 2 * 3600000 })).not.toBeNull()
    })
})
