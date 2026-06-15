import { describe, it, expect } from 'vitest'
import { friendlyRecognitionError, isElectronUserAgent } from '../voice/runtime'

describe('isElectronUserAgent', () => {
    it('detects an Electron renderer user-agent', () => {
        const ua =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Quoril/1.0.0 Chrome/120.0.0.0 Electron/28.3.3 Safari/537.36'
        expect(isElectronUserAgent(ua)).toBe(true)
    })

    it('is case-insensitive', () => {
        expect(isElectronUserAgent('foo electron/28 bar')).toBe(true)
    })

    it('does not match a plain Chrome browser', () => {
        const ua =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        expect(isElectronUserAgent(ua)).toBe(false)
    })

    it('does not match the empty string', () => {
        expect(isElectronUserAgent('')).toBe(false)
    })

    it('does not match the word "electron" without a version slash', () => {
        // Guards against false positives like a site literally named "electron".
        expect(isElectronUserAgent('the electron store')).toBe(false)
    })
})

describe('friendlyRecognitionError', () => {
    it('maps permission errors to an actionable message', () => {
        for (const code of ['not-allowed', 'service-not-allowed']) {
            const msg = friendlyRecognitionError(code)
            expect(msg).toMatch(/blocked/i)
            expect(msg).toMatch(/type your task/i)
        }
    })

    it('maps a network failure', () => {
        expect(friendlyRecognitionError('network')).toMatch(/unavailable/i)
    })

    it('maps a missing microphone', () => {
        expect(friendlyRecognitionError('audio-capture')).toMatch(/no microphone/i)
    })

    it('includes the raw code for unknown errors', () => {
        expect(friendlyRecognitionError('weird-code')).toContain('weird-code')
    })

    it('always steers the user to typing', () => {
        for (const code of ['not-allowed', 'network', 'audio-capture', 'bad-grammar']) {
            expect(friendlyRecognitionError(code)).toMatch(/type your task/i)
        }
    })
})
