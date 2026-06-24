import { describe, it, expect } from 'vitest'
import { nextMicAction } from '../react/micAction'

describe('nextMicAction', () => {
    it('stops while actively listening', () => {
        expect(nextMicAction('listening', false)).toBe('stop')
        expect(nextMicAction('listening', true)).toBe('stop')
    })

    it('resumes (barges in) while a question is being spoken', () => {
        // Regression: a tap here must answer the question, not stop everything.
        expect(nextMicAction('speaking', true)).toBe('resume')
    })

    it('ignores taps while thinking so the in-flight turn is not dropped', () => {
        expect(nextMicAction('thinking', true)).toBe('ignore')
        expect(nextMicAction('thinking', false)).toBe('ignore')
    })

    it('resumes the pending follow-up from idle/error, keeping context', () => {
        // Regression: when a spoken question failed to auto-resume the mic, a tap
        // must continue the same conversation rather than reset it.
        expect(nextMicAction('idle', true)).toBe('resume')
        expect(nextMicAction('error', true)).toBe('resume')
    })

    it('starts a fresh capture from idle when no question is pending', () => {
        expect(nextMicAction('idle', false)).toBe('start')
        expect(nextMicAction('error', false)).toBe('start')
    })
})
