import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * React wrapper around the Web Speech API's SpeechSynthesis (text-to-speech).
 *
 * Unlike recognition, synthesis works everywhere — browsers and packaged
 * Electron alike — so this is the reliable half of the voice loop.
 */

export interface SpeechSynthesisState {
    /** Speak `text`; `onEnd` fires when playback finishes (or is cancelled). */
    speak: (text: string, onEnd?: () => void) => void
    cancel: () => void
}

function isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function useSpeechSynthesis(): SpeechSynthesisState {
    const [supported] = useState(isSupported)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    // Cancel any in-flight speech if the component unmounts.
    useEffect(() => {
        return () => {
            if (isSupported()) window.speechSynthesis.cancel()
        }
    }, [])

    const speak = useCallback(
        (text: string, onEnd?: () => void) => {
            if (!supported || !text.trim()) {
                onEnd?.()
                return
            }

            // Stop whatever is currently playing before starting anew.
            window.speechSynthesis.cancel()

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.rate = 1
            utterance.pitch = 1

            const finish = () => {
                utteranceRef.current = null
                onEnd?.()
            }

            utterance.onend = finish
            utterance.onerror = finish

            utteranceRef.current = utterance
            window.speechSynthesis.speak(utterance)
        },
        [supported]
    )

    const cancel = useCallback(() => {
        if (supported) window.speechSynthesis.cancel()
    }, [supported])

    return { speak, cancel }
}
