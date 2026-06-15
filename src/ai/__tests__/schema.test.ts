import { describe, it, expect } from 'vitest'
import { parseAgentTurn, AgentParseError } from '../schema'

describe('parseAgentTurn', () => {
    it('normalizes a complete turn', () => {
        const turn = parseAgentTurn({
            status: 'complete',
            title: '  Write the report  ',
            minutes: 45,
            priority: 'high',
            is_recurring: false,
            auto_start: true,
            message: 'Got it.',
        })

        expect(turn.status).toBe('complete')
        expect(turn.draft).toEqual({
            title: 'Write the report',
            minutes: 45,
            priority: 'high',
            isRecurring: false,
            autoStart: true,
        })
        expect(turn.message).toBe('Got it.')
        expect(turn.question).toBeNull()
    })

    it('coerces numeric strings for minutes and clamps negatives', () => {
        expect(parseAgentTurn({ title: 'x', minutes: '30' }).draft.minutes).toBe(30)
        expect(parseAgentTurn({ title: 'x', minutes: -5 }).draft.minutes).toBe(0)
        expect(parseAgentTurn({ title: 'x', minutes: 'nonsense' }).draft.minutes).toBeNull()
    })

    it('maps priority synonyms', () => {
        expect(parseAgentTurn({ title: 'x', priority: 'urgent' }).draft.priority).toBe('high')
        expect(parseAgentTurn({ title: 'x', priority: 'NORMAL' }).draft.priority).toBe('medium')
        expect(parseAgentTurn({ title: 'x', priority: 'whatever' }).draft.priority).toBeNull()
    })

    it('coerces boolean-ish strings', () => {
        expect(parseAgentTurn({ title: 'x', is_recurring: 'yes' }).draft.isRecurring).toBe(true)
        expect(parseAgentTurn({ title: 'x', auto_start: 'no' }).draft.autoStart).toBe(false)
    })

    it('infers needs_input when title is missing', () => {
        const turn = parseAgentTurn({ question: 'What should I call it?' })
        expect(turn.status).toBe('needs_input')
        expect(turn.question).toBe('What should I call it?')
        expect(turn.draft.title).toBeNull()
    })

    it('infers complete when a title is present and nothing is asked', () => {
        expect(parseAgentTurn({ title: 'Do laundry' }).status).toBe('complete')
    })

    it('downgrades contradictory "complete" without a title to needs_input', () => {
        const turn = parseAgentTurn({ status: 'complete', title: '   ' })
        expect(turn.status).toBe('needs_input')
    })

    it('throws AgentParseError on non-object input', () => {
        expect(() => parseAgentTurn(null)).toThrow(AgentParseError)
        expect(() => parseAgentTurn('a string')).toThrow(AgentParseError)
        expect(() => parseAgentTurn(42)).toThrow(AgentParseError)
    })
})
