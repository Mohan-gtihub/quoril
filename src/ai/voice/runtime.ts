/**
 * Pure runtime/environment helpers for the voice hooks.
 *
 * Kept free of React and DOM access (string in, value out) so the branching
 * logic that decides whether speech recognition is usable can be unit-tested
 * without a browser.
 */

/**
 * True when the given user-agent string belongs to an Electron renderer.
 *
 * Electron's bundled Chromium *exposes* `webkitSpeechRecognition`, but ships no
 * speech backend and (by default) the main process denies microphone access —
 * so recognition always errors. We use this to disable STT in the desktop app
 * and fall back to typed input, which drives the exact same LLM pipeline.
 */
export function isElectronUserAgent(userAgent: string): boolean {
    return /electron\//i.test(userAgent)
}

/**
 * Map a raw `SpeechRecognitionErrorEvent.error` code to a short, actionable
 * message. Every variant nudges the user toward the typed fallback, which
 * always works.
 */
export function friendlyRecognitionError(code: string): string {
    switch (code) {
        case 'not-allowed':
        case 'service-not-allowed':
            return 'Microphone access is blocked. Allow it, or type your task instead.'
        case 'network':
            return 'Speech service is unavailable here. Type your task instead.'
        case 'audio-capture':
            return 'No microphone was found. Type your task instead.'
        default:
            return `Voice input failed (${code}). Type your task instead.`
    }
}
