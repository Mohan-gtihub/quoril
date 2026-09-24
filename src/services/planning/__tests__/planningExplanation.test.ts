import { describe, it, expect } from 'vitest'
import { localExplanation, validateExplanation, type PlanningExplanationInput } from '../planningExplanation'

const input: PlanningExplanationInput = {
    plannedMinutes: 200,
    capacityMinutes: 300,
    openWindowCount: 3,
    proposedBlockCount: 4,
    adjustmentPercent: 100,
}

describe('localExplanation', () => {
    it('warns about overload when planned exceeds capacity', () => {
        const text = localExplanation({ ...input, plannedMinutes: 400 })
        expect(text).toContain('more time than today has open')
        expect(text).toContain('4') // proposedBlockCount
    })
    it('is calm when nothing is proposed', () => {
        expect(localExplanation({ ...input, proposedBlockCount: 0 })).toContain('clear enough')
    })
})

describe('validateExplanation', () => {
    it('accepts text whose numbers all come from the payload', () => {
        const text = 'You have 3 open windows and 4 blocks that fit.'
        expect(validateExplanation(text, input)).toBe(text)
    })
    it('rejects an invented number the model made up', () => {
        expect(() => validateExplanation('You could save 99 minutes today.', input)).toThrow(/invented/)
    })
    it('rejects empty or over-long text', () => {
        expect(() => validateExplanation('', input)).toThrow()
        expect(() => validateExplanation('x'.repeat(300), input)).toThrow()
    })
})
