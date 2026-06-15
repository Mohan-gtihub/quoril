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
 *
 * Capture ends automatically — no second button press — via lightweight
 * voice-activity detection: once the user has spoken, a short trailing silence
 * stops the clip; a hard cap and a no-speech timeout bound the worst case.
 */

/** RMS amplitude (0..1) above which a frame counts as speech. */
const SPEECH_THRESHOLD = 0.025
/** Trailing silence after speech that ends the clip. */
const SILENCE_MS = 1100
/** Give up (quietly) if the user never speaks. */
const NO_SPEECH_MS = 7000
/** Absolute ceiling on a single clip. */
const MAX_CLIP_MS = 20000
/** How often to sample the mic level. */
const SAMPLE_MS = 100

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

    // Voice-activity detection plumbing.
    const audioCtxRef = useRef<AudioContext | null>(null)
    const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null)
    // True once we've heard speech in the current clip — gates auto-stop and
    // lets us discard a clip where nothing was ever said.
    const spokeRef = useRef(false)

    const onFinalResultRef = useRef(onFinalResult)
    onFinalResultRef.current = onFinalResult

    const stopMonitor = useCallback(() => {
        if (monitorRef.current !== null) {
            clearInterval(monitorRef.current)
            monitorRef.current = null
        }
        audioCtxRef.current?.close().catch(() => {})
        audioCtxRef.current = null
    }, [])

    const cleanupStream = useCallback(() => {
        stopMonitor()
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        recorderRef.current = null
    }, [stopMonitor])

    // Stop the mic if the component unmounts mid-recording.
    useEffect(() => cleanupStream, [cleanupStream])

    // Held in a ref so the VAD loop (set up inside start) can trigger a stop
    // without depending on `stop`'s declaration order.
    const stopRef = useRef<() => void>(() => {})

    /** Begin sampling the mic and auto-stop on silence / timeout. */
    const startVad = useCallback((stream: MediaStream) => {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctx) return // No analysis available — rely on manual / max-duration stop.

        const ctx = new Ctx()
        audioCtxRef.current = ctx
        void ctx.resume().catch(() => {})

        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        const samples = new Uint8Array(analyser.fftSize)

        const startedAt = Date.now()
        let lastLoudAt = startedAt
        spokeRef.current = false

        monitorRef.current = setInterval(() => {
            analyser.getByteTimeDomainData(samples)
            let sum = 0
            for (let i = 0; i < samples.length; i++) {
                const v = (samples[i] - 128) / 128
                sum += v * v
            }
            const rms = Math.sqrt(sum / samples.length)
            const now = Date.now()

            if (rms > SPEECH_THRESHOLD) {
                spokeRef.current = true
                lastLoudAt = now
            }

            const elapsed = now - startedAt
            const endedTalking = spokeRef.current && now - lastLoudAt > SILENCE_MS
            const neverSpoke = !spokeRef.current && elapsed > NO_SPEECH_MS

            if (endedTalking || neverSpoke || elapsed > MAX_CLIP_MS) {
                stopRef.current()
            }
        }, SAMPLE_MS)
    }, [])

    const start = useCallback(async () => {
        if (!supported || listening || transcribing) return
        setError(null)
        chunksRef.current = []
        spokeRef.current = false

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
                const heardSpeech = spokeRef.current
                chunksRef.current = []
                cleanupStream()

                // Nothing was said (mistaken open / immediate stop) — discard
                // silently and let the caller fall back to idle.
                if (!heardSpeech || blob.size === 0) {
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
            startVad(stream)
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
    }, [supported, listening, transcribing, cleanupStream, startVad])

    const stop = useCallback(() => {
        stopMonitor()
        const recorder = recorderRef.current
        setListening(false)
        if (recorder && recorder.state !== 'inactive') {
            // Fires onstop, which transcribes the captured audio.
            recorder.stop()
        } else {
            cleanupStream()
        }
    }, [cleanupStream, stopMonitor])

    // Keep the VAD loop's stop trigger pointing at the latest `stop`.
    stopRef.current = stop

    return { supported, listening, transcribing, error, start, stop }
}
