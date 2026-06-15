import { describe, it, expect } from 'vitest'
import { extractJsonObject, safeParseJsonObject } from '../json'

describe('extractJsonObject', () => {
    it('returns a plain JSON object unchanged', () => {
        expect(extractJsonObject('{"a":1}')).toBe('{"a":1}')
    })

    it('strips ```json fences', () => {
        const text = '```json\n{"status":"complete"}\n```'
        expect(extractJsonObject(text)).toBe('{"status":"complete"}')
    })

    it('ignores prose before and after the object', () => {
        const text = 'Sure! Here you go: {"title":"x"} hope that helps'
        expect(extractJsonObject(text)).toBe('{"title":"x"}')
    })

    it('handles nested objects', () => {
        const text = '{"a":{"b":{"c":1}},"d":2}'
        expect(extractJsonObject(text)).toBe(text)
    })

    it('does not stop on braces inside strings', () => {
        const text = '{"title":"buy } eggs {","minutes":5}'
        expect(extractJsonObject(text)).toBe(text)
    })

    it('handles escaped quotes inside strings', () => {
        const text = '{"title":"say \\"hi\\" now"}'
        expect(extractJsonObject(text)).toBe(text)
    })

    it('returns null when there is no object', () => {
        expect(extractJsonObject('no json here')).toBeNull()
        expect(extractJsonObject('')).toBeNull()
    })
})

describe('safeParseJsonObject', () => {
    it('parses a valid object', () => {
        expect(safeParseJsonObject('{"a":1}')).toEqual({ a: 1 })
    })

    it('returns null for malformed JSON', () => {
        expect(safeParseJsonObject('{"a":}')).toBeNull()
    })

    it('returns null when no object is present', () => {
        expect(safeParseJsonObject('hello')).toBeNull()
    })
})
