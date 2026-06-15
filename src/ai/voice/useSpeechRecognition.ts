import { useCallback, useEffect, useRef, useState } from 'react'
import { friendlyRecognitionError, isElectronUserAgent } from './runtime'

/**
 * Thin React wrapper around the Web Speech API's SpeechRecognition.
 *
 * Caveat: native speech recognition relies on a cloud endpoint that is bundled
 * into Chrome but NOT into Electron's Chromium — and our Electron main process
 * denies microphone access by default. There the constructor *exists* yet every
 * `start()` errors, so we report it as unsupported up-front and callers fall
 * back to typed input. Real voice works in a browser (the Vite dev URL in
 * Chrome).
 */

export interface UseSpeechRecognitionOptions {
    lang?: string
    /** Called once with the final transcript when a phrase completes. */
    onFinalResult?: (transcript: string) => void
}

export interface SpeechRecognitionState {
    /** Whether the API exists in this runtime at all. */
    supported: boolean
    listening: boolean
    /** Live, not-yet-final transcript (updates while speaking). */
    interimTranscript: string
    error: string | null
    start: () => void
    stop: () => void
}

function getRecognitionCtor(): SpeechRecognitionStatic | undefined {
    if (typeof window === 'undefined') return undefined
    return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

/**
 * Whether usable speech recognition exists in this runtime. The constructor
 * must be present AND we must not be inside Electron, where it is present but
 * non-functional (see the file header).
 */
function isRecognitionSupported(): boolean {
    if (getRecognitionCtor() === undefined) return false
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    if (isElectronUserAgent(ua)) return false
    // Belt-and-suspenders: our preload always exposes electronAPI in the app.
    if (typeof window !== 'undefined' && window.electronAPI != null) return false
    return true
}

export function useSpeechRecognition(
    options: UseSpeechRecognitionOptions = {}
): SpeechRecognitionState {
    const { lang, onFinalResult } = options

    const [supported] = useState<boolean>(isRecognitionSupported)
    const [listening, setListening] = useState(false)
    const [interimTranscript, setInterimTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)

    const recognitionRef = useRef<SpeechRecognition | null>(null)
    // Keep the latest callback without re-subscribing recognition handlers.
    const onFinalResultRef = useRef(onFinalResult)
    onFinalResultRef.current = onFinalResult

    useEffect(() => {
        if (!supported) return
        const Ctor = getRecognitionCtor()
        if (!Ctor) return

        const recognition = new Ctor()
        recognition.lang = lang ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US')
        recognition.continuous = false
        recognition.interimResults = true
        recognition.maxAlternatives = 1

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = ''
            let finalText = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i]
                const transcript = result[0]?.transcript ?? ''
                if (result.isFinal) finalText += transcript
                else interim += transcript
            }

            if (interim) setInterimTranscript(interim)

            if (finalText.trim()) {
                setInterimTranscript('')
                onFinalResultRef.current?.(finalText.trim())
            }
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            // "aborted"/"no-speech" are benign; surface the rest in plain language.
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
                setError(friendlyRecognitionError(event.error))
            }
            setListening(false)
        }

        recognition.onend = () => {
            setListening(false)
            setInterimTranscript('')
        }

        recognitionRef.current = recognition

        return () => {
            recognition.onresult = null
            recognition.onerror = null
            recognition.onend = null
            try {
                recognition.abort()
            } catch {
                /* already stopped */
            }
            recognitionRef.current = null
        }
    }, [lang, supported])

    const start = useCallback(() => {
        const recognition = recognitionRef.current
        if (!recognition) return
        setError(null)
        setInterimTranscript('')
        try {
            recognition.start()
            setListening(true)
        } catch {
            // `start()` throws if called while already running — ignore.
        }
    }, [])

    const stop = useCallback(() => {
        recognitionRef.current?.stop()
        setListening(false)
    }, [])

    return { supported, listening, interimTranscript, error, start, stop }
}
