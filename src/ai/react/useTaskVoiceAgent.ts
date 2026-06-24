import { useCallback, useEffect, useRef, useState } from 'react'
import type { TaskDraft } from '../types'
import { TaskVoiceAgent } from '../agent'
import { chat, isAiConfigured } from '../client'
import { useSpeechRecognition } from '../voice/useSpeechRecognition'
import { useAudioRecorder } from '../voice/useAudioRecorder'
import { useSpeechSynthesis } from '../voice/useSpeechSynthesis'

/**
 * High-level orchestration hook for the voice task flow.
 *
 * Wires three pieces together:
 *   microphone (STT)  ->  TaskVoiceAgent (LLM)  ->  speaker (TTS)
 *
 * and reports the evolving draft back to the host form via callbacks.
 */

export type VoiceAgentStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

/**
 * Rough upper bound on how long it takes to speak `text`, used to size the
 * resume-listening watchdog. Deliberately generous (slow ~2.5 words/sec plus a
 * buffer) so we never cut the question off, and capped so we never hang.
 */
function estimateSpeechMs(text: string): number {
    const words = text.trim().split(/\s+/).filter(Boolean).length
    return Math.min(12000, Math.round((words / 2.5) * 1000) + 1500)
}

export interface UseTaskVoiceAgentOptions {
    /** Called on every turn with the latest (cumulative) draft, to autofill the form. */
    onDraft: (draft: TaskDraft) => void
    /** Called once when the agent considers the task ready to create. */
    onComplete: (draft: TaskDraft) => void
}

export interface TaskVoiceAgentApi {
    status: VoiceAgentStatus
    /** Whether voice capture is available (Web Speech in-browser, or Groq STT recording elsewhere). */
    sttSupported: boolean
    aiConfigured: boolean
    listening: boolean
    interimTranscript: string
    /** Latest follow-up question the agent asked, if any. */
    question: string | null
    error: string | null
    /** Begin a fresh voice conversation (resets prior context). */
    start: () => void
    /** Resume listening to answer a follow-up question, keeping conversation context. */
    resume: () => void
    /** Stop listening / speaking and return to idle. */
    stop: () => void
    /** Feed a typed utterance through the same pipeline (fallback path). */
    submitText: (text: string) => void
}

export function useTaskVoiceAgent(options: UseTaskVoiceAgentOptions): TaskVoiceAgentApi {
    const { onDraft, onComplete } = options

    const [status, setStatus] = useState<VoiceAgentStatus>('idle')
    const [question, setQuestion] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Latest status, readable from timers/callbacks without re-subscribing.
    const statusRef = useRef(status)
    statusRef.current = status

    // Fallback timer that resumes listening if a spoken question's `onEnd`
    // never fires (Electron's Chromium speechSynthesis is unreliable here).
    const resumeWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const clearResumeWatchdog = useCallback(() => {
        if (resumeWatchdogRef.current !== null) {
            clearTimeout(resumeWatchdogRef.current)
            resumeWatchdogRef.current = null
        }
    }, [])

    // Stable agent instance for the lifetime of the hook.
    const agentRef = useRef<TaskVoiceAgent>()
    if (!agentRef.current) {
        agentRef.current = new TaskVoiceAgent({
            chat: (messages) => chat({ messages }),
        })
    }

    // Keep callbacks fresh without re-creating handlers.
    const onDraftRef = useRef(onDraft)
    onDraftRef.current = onDraft
    const onCompleteRef = useRef(onComplete)
    onCompleteRef.current = onComplete

    const synthesis = useSpeechSynthesis()
    // Refs so the STT result handler always sees current values.
    const synthesisRef = useRef(synthesis)
    synthesisRef.current = synthesis

    const startListeningRef = useRef<() => void>(() => {})

    const handleUtterance = useCallback(async (utterance: string) => {
        const agent = agentRef.current
        if (!agent) return

        setStatus('thinking')
        setError(null)

        try {
            const turn = await agent.send(utterance)
            onDraftRef.current(turn.draft)

            if (turn.status === 'complete') {
                // Commit immediately — don't make the user wait through a spoken
                // sentence before the task is created. The host typically closes
                // on complete, so a confirmation utterance would be cut off mid-
                // word anyway; the filled form is the confirmation.
                setQuestion(null)
                setStatus('idle')
                onCompleteRef.current(turn.draft)
                return
            }

            // needs_input: speak the question, then resume listening for the
            // answer. We resume on TTS end OR on a watchdog timeout — whichever
            // first — so a missed `onEnd` can't strand us on 'speaking' forever.
            const ask = turn.question ?? 'Could you tell me a bit more?'
            setQuestion(ask)
            setStatus('speaking')

            let resumed = false
            const resumeListening = () => {
                if (resumed) return
                resumed = true
                clearResumeWatchdog()
                startListeningRef.current()
            }

            synthesisRef.current.speak(ask, resumeListening)
            clearResumeWatchdog()
            resumeWatchdogRef.current = setTimeout(() => {
                if (statusRef.current === 'speaking') resumeListening()
            }, estimateSpeechMs(ask))
        } catch (err) {
            const message = err instanceof Error ? err.message : 'The voice assistant failed.'
            setError(message)
            setStatus('error')
            synthesisRef.current.speak('Sorry, something went wrong. Please try again.')
        }
    }, [clearResumeWatchdog])

    const handleUtteranceRef = useRef(handleUtterance)
    handleUtteranceRef.current = handleUtterance

    // Two STT backends. Web Speech works in a real browser; the recorder (Groq
    // Whisper) works everywhere else, notably the Electron desktop app. We use
    // whichever is available, preferring Web Speech for its live interim text.
    const recognition = useSpeechRecognition({
        onFinalResult: (transcript) => handleUtteranceRef.current(transcript),
    })
    const recorder = useAudioRecorder({
        onFinalResult: (transcript) => handleUtteranceRef.current(transcript),
    })

    const usingRecorder = !recognition.supported && recorder.supported
    const sttSupported = recognition.supported || recorder.supported
    const listening = recognition.listening || recorder.listening

    // Expose a stable "start listening" that the TTS callback can call.
    useEffect(() => {
        startListeningRef.current = () => {
            if (!sttSupported) {
                setStatus('idle')
                return
            }
            setStatus('listening')
            if (usingRecorder) recorder.start()
            else recognition.start()
        }
    }, [sttSupported, usingRecorder, recognition.start, recorder.start])

    // Reflect raw mic state into our status while a phrase is in progress.
    useEffect(() => {
        const err = recognition.error ?? recorder.error
        if (err) {
            setError(err)
            setStatus('error')
        }
    }, [recognition.error, recorder.error])

    // Uploading a recorded clip is its own "thinking"-like wait.
    useEffect(() => {
        if (recorder.transcribing) setStatus('thinking')
    }, [recorder.transcribing])

    // If the mic stops without producing a result, fall back to idle (but never
    // clobber 'thinking'/'speaking', which a result transition has already set).
    useEffect(() => {
        if (!listening) {
            setStatus((s) => (s === 'listening' ? 'idle' : s))
        }
    }, [listening])

    const start = useCallback(() => {
        clearResumeWatchdog()
        agentRef.current?.reset()
        setQuestion(null)
        setError(null)
        synthesisRef.current.cancel()
        startListeningRef.current()
    }, [clearResumeWatchdog])

    // Resume listening to answer the pending follow-up — keeps the agent's
    // conversation history (unlike `start`, which begins a fresh task). Also the
    // manual escape hatch when a spoken question didn't auto-resume the mic.
    const resume = useCallback(() => {
        clearResumeWatchdog()
        setError(null)
        synthesisRef.current.cancel()
        startListeningRef.current()
    }, [clearResumeWatchdog])

    const stop = useCallback(() => {
        clearResumeWatchdog()
        recognition.stop()
        recorder.stop()
        synthesisRef.current.cancel()
        setStatus('idle')
    }, [recognition, recorder, clearResumeWatchdog])

    const submitText = useCallback((text: string) => {
        const trimmed = text.trim()
        if (!trimmed) return
        void handleUtteranceRef.current(trimmed)
    }, [])

    // Don't leave the resume watchdog running after unmount.
    useEffect(() => clearResumeWatchdog, [clearResumeWatchdog])

    return {
        status,
        sttSupported,
        aiConfigured: isAiConfigured(),
        listening,
        interimTranscript: recognition.interimTranscript,
        question,
        error,
        start,
        resume,
        stop,
        submitText,
    }
}
