import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Loader2, Volume2, Keyboard, Send, AlertCircle, Sparkles } from 'lucide-react'
import { useTaskVoiceAgent } from '@/ai'
import type { TaskDraft } from '@/ai'
import { nextMicAction } from '@/ai/react/micAction'

interface Props {
    onDraft: (draft: TaskDraft) => void
    onComplete: (draft: TaskDraft) => void
    disabled?: boolean
    /** Begin listening as soon as the widget mounts (e.g. modal opened to capture a task). */
    autoStart?: boolean
}

/**
 * Voice-driven task capture. Speak (or type) a task and an LLM fills the form,
 * asking follow-up questions aloud when something essential is missing.
 */
export function VoiceTaskWidget({ onDraft, onComplete, disabled, autoStart }: Props) {
    const voice = useTaskVoiceAgent({ onDraft, onComplete })
    const [typed, setTyped] = useState('')
    const [showTyped, setShowTyped] = useState(false)

    // Kick off listening once when asked (and possible). Guarded so we never
    // re-trigger mid-conversation or when voice capture isn't available.
    const autoStarted = useRef(false)
    useEffect(() => {
        if (!autoStart || autoStarted.current) return
        if (disabled || !voice.aiConfigured || !voice.sttSupported) return
        autoStarted.current = true
        voice.start()
    }, [autoStart, disabled, voice.aiConfigured, voice.sttSupported, voice.start])

    // Not configured → render a quiet hint instead of a dead button.
    if (!voice.aiConfigured) {
        return (
            <div className="mb-6 px-4 py-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-default)] text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Set <code className="text-[var(--text-tertiary)]">VITE_NVIDIA_API_KEY</code> to enable voice task capture.
            </div>
        )
    }

    const busy = voice.status === 'thinking' || voice.status === 'speaking'
    const active = voice.listening || busy
    const useTypedInput = showTyped || !voice.sttSupported

    function handleMicClick() {
        switch (nextMicAction(voice.status, voice.question !== null)) {
            case 'stop':
                voice.stop()
                break
            case 'resume':
                voice.resume()
                break
            case 'start':
                voice.start()
                break
            case 'ignore':
                break
        }
    }

    function handleTypedSubmit(e: React.FormEvent) {
        e.preventDefault()
        const text = typed.trim()
        if (!text) return
        voice.submitText(text)
        setTyped('')
    }

    function statusLabel(): string {
        if (voice.status === 'listening') return 'Listening…'
        if (voice.status === 'thinking') return 'Thinking…'
        if (voice.status === 'speaking') return 'Speaking…'
        return 'Tap to speak your task'
    }

    return (
        <div className="mb-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4">
            <div className="flex items-center gap-3">
                {!useTypedInput && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={handleMicClick}
                        aria-label={
                            voice.status === 'listening'
                                ? 'Stop listening'
                                : voice.status === 'speaking'
                                    ? 'Answer now'
                                    : voice.question
                                        ? 'Answer the question'
                                        : 'Start voice capture'
                        }
                        className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                            voice.listening
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        {voice.listening && (
                            <motion.span
                                className="absolute inset-0 rounded-full bg-[var(--accent-primary)]"
                                animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                            />
                        )}
                        <span className="relative">
                            {voice.status === 'thinking' ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : voice.status === 'speaking' ? (
                                <Volume2 className="w-5 h-5" />
                            ) : active ? (
                                <Square className="w-4 h-4" />
                            ) : (
                                <Mic className="w-5 h-5" />
                            )}
                        </span>
                    </button>
                )}

                <div className="min-w-0 flex-1">
                    {useTypedInput ? (
                        <form onSubmit={handleTypedSubmit} className="flex items-center gap-2">
                            <input
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                                disabled={disabled || busy}
                                placeholder={voice.question ?? 'Describe your task…'}
                                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/50 placeholder:text-[var(--text-muted)]"
                            />
                            <button
                                type="submit"
                                disabled={disabled || busy || !typed.trim()}
                                aria-label="Send"
                                className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--accent-primary)] text-white shrink-0 disabled:opacity-40"
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </form>
                    ) : (
                        <p className="text-sm font-medium text-[var(--text-secondary)] truncate">
                            {voice.interimTranscript || statusLabel()}
                        </p>
                    )}
                </div>

                {voice.sttSupported && (
                    <button
                        type="button"
                        onClick={() => setShowTyped((v) => !v)}
                        aria-label={useTypedInput ? 'Use microphone' : 'Type instead'}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors shrink-0"
                    >
                        {useTypedInput ? <Mic className="w-4 h-4" /> : <Keyboard className="w-4 h-4" />}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {voice.question && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 text-xs text-[var(--text-tertiary)] italic"
                    >
                        “{voice.question}”
                    </motion.p>
                )}
            </AnimatePresence>

            {voice.error && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--error)]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {voice.error}
                </p>
            )}

            {!voice.sttSupported && (
                <p className="mt-2 text-[10px] text-[var(--text-muted)] italic">
                    Voice input isn’t available here — type your task and the assistant will parse it.
                </p>
            )}
        </div>
    )
}
