import { describe, it, expect } from 'vitest'
import { parseQuickAdd, quickAddHint } from '../quickAdd'

// Fixed "now": Tuesday, 11 Aug 2026, noon local.
const now = new Date(2026, 7, 11, 12, 0, 0)

describe('parseQuickAdd', () => {
    it('extracts priority, estimate, and title', () => {
        const p = parseQuickAdd('Draft report !high ~90m', now)
        expect(p.title).toBe('Draft report')
        expect(p.priority).toBe('high')
        expect(p.estimateMinutes).toBe(90)
    })

    it('treats ~2h as 120 minutes', () => {
        expect(parseQuickAdd('Deep work ~2h', now).estimateMinutes).toBe(120)
    })

    it('resolves "tomorrow" to end of the next day', () => {
        const p = parseQuickAdd('Email tomorrow', now)
        const due = new Date(p.dueAt!)
        expect(due.getDate()).toBe(12)
        expect(due.getHours()).toBe(23)
    })

    it('resolves a weekday to its NEXT occurrence (never today)', () => {
        // now is Tuesday; "friday" → this coming Friday the 14th
        const p = parseQuickAdd('Ship friday', now)
        expect(new Date(p.dueAt!).getDate()).toBe(14)
        expect(p.title).toBe('Ship')
    })

    it('accepts crit/med abbreviations', () => {
        expect(parseQuickAdd('x !crit', now).priority).toBe('critical')
        expect(parseQuickAdd('y !med', now).priority).toBe('medium')
    })

    it('collapses whitespace after stripping tokens', () => {
        expect(parseQuickAdd('Call  !low  Bob', now).title).toBe('Call Bob')
    })
})

describe('quickAddHint', () => {
    it('summarises the parsed metadata', () => {
        const hint = quickAddHint(parseQuickAdd('Task !high tomorrow ~30m', now), now)
        expect(hint).toContain('High')
        expect(hint).toContain('tomorrow')
        expect(hint).toContain('30m')
    })
    it('returns null when nothing was parsed', () => {
        expect(quickAddHint(parseQuickAdd('just a title', now), now)).toBeNull()
    })
})
