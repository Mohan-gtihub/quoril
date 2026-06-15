import { useCallback, useEffect, useRef, useState } from 'react'
import { isSttConfigured, transcribe } from '../client'

/**
 * Records a short audio clip with MediaRecorder, then transcribes it via Groq
 * Whisper (see `transcribe` in ../client).
 *
 * This is the desktop-friendly counterpart to `useSpeechRecognition`: the Web
 * Speech API needs a cloud backend that Electron doesn't bundle, whereas
 * MediaRecorder + a transcription API works anywhere we can reach the mic.
 * The surface mirrors `useSpeechRecognition` so callers can swap between them,
 * with one addition: `transcribing` (true while the clip is being uploaded).
 */

export interface UseAudioRecorderOptions {
    /** Called with the final transcript once recording stops and STT returns. */
    onFinalResult?: (transcript: string) => void
}

export interface AudioRecorderState {
    /** Whether recording + transcription is available in this runtime. */
    supported: boolean
    /** Mic is open and capturing audio. */
    listening: boolean
    /** Clip captured; waiting on the transcription response. */
    transcribing: boolean
    error: string | null
    start: () => void
    stop: () => void
}

function isRecorderSupported(): boolean {
    if (typeof window === 'undefined') return false
    if (typeof MediaRecorder === 'undefined') return false
    if (!navigator?.mediaDevices?.getUserMedia) return false
    return isSttConfigured()
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): AudioRecorderState {
    const { onFinalResult } = options

    const [supported] = useState<boolean>(isRecorderSupported)
    const [listening, setListening] = useState(false)
    const [transcribing, setTranscribing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const recorderRef = useRef<MediaRecorder | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const onFinalResultRef = useRef(onFinalResult)
    onFinalResultRef.current = onFinalResult

    const cleanupStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        recorderRef.current = null
    }, [])

    // Stop the mic if the component unmounts mid-recording.
    useEffect(() => cleanupStream, [cleanupStream])

    const start = useCallback(async () => {
        if (!supported || listening || transcribing) return
        setError(null)
        chunksRef.current = []

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            const recorder = new MediaRecorder(stream)
            recorderRef.current = recorder

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onstop = async () => {
                const type = recorder.mimeType || 'audio/webm'
                const blob = new Blob(chunksRef.current, { type })
                chunksRef.current = []
                cleanupStream()

                if (blob.size === 0) {
                    setTranscribing(false)
                    return
                }

                setTranscribing(true)
                try {
                    const text = await transcribe(blob)
                    if (text) onFinalResultRef.current?.(text)
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Transcription failed.')
                } finally {
                    setTranscribing(false)
                }
            }

            recorder.start()
            setListening(true)
        } catch (err) {
            cleanupStream()
            setListening(false)
            const name = err instanceof DOMException ? err.name : ''
            setError(
                name === 'NotAllowedError'
                    ? 'Microphone access was denied. Allow it, or type your task instead.'
                    : name === 'NotFoundError'
                        ? 'No microphone was found. Type your task instead.'
                        : 'Could not start recording. Type your task instead.'
            )
        }
    }, [supported, listening, transcribing, cleanupStream])

    const stop = useCallback(() => {
        const recorder = recorderRef.current
        setListening(false)
        if (recorder && recorder.state !== 'inactive') {
            // Fires onstop, which transcribes the captured audio.
            recorder.stop()
        } else {
            cleanupStream()
        }
    }, [cleanupStream])

    return { supported, listening, transcribing, error, start, stop }
}
