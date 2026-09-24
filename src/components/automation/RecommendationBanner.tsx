// Global, single-recommendation banner for Safe Automation. It coordinates
// evaluation (a gentle interval plus one shortly after mount), shows at most one
// suggestion at a time, and routes an accepted recommendation: side-effecting
// actions run in the store; navigation actions route here. Calm by design — one
// card, slide-in, never a stack.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'

import { useAutomationStore } from '@/store/automationStore'

// Evaluate on a gentle cadence — this is assistance, not an alarm.
const EVAL_INTERVAL_MS = 60_000
// A short beat after mount so the app has hydrated tasks/session first.
const FIRST_EVAL_DELAY_MS = 4_000

export function RecommendationBanner() {
    const navigate = useNavigate()
    const current = useAutomationStore((s) => s.current)
    const evaluate = useAutomationStore((s) => s.evaluate)
    const accept = useAutomationStore((s) => s.accept)
    const dismiss = useAutomationStore((s) => s.dismiss)

    // Coordinator: first pass shortly after mount, then on a gentle interval.
    useEffect(() => {
        const first = setTimeout(() => void evaluate(), FIRST_EVAL_DELAY_MS)
        const interval = setInterval(() => void evaluate(), EVAL_INTERVAL_MS)
        return () => {
            clearTimeout(first)
            clearInterval(interval)
        }
    }, [evaluate])

    const handleAccept = () => {
        const rec = accept()
        if (!rec) return
        switch (rec.action) {
            case 'reviewCarryover':
            case 'chooseNextTask':
            case 'moveConflictingTask':
                navigate('/planner')
                break
            // Meeting prep is a calendar concern — land on the calendar timeline.
            case 'prepareForMeeting':
                navigate('/calendar')
                break
            // startFocus / takeBreak already handled in the store.
            default:
                break
        }
    }

    return (
        <AnimatePresence>
            {current && (
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="fixed inset-x-0 bottom-6 z-[9999] flex justify-center px-4 pointer-events-none"
                    role="status"
                    aria-live="polite"
                >
                    <div
                        className="pointer-events-auto w-full max-w-md flex items-start gap-3.5 pl-4 pr-3 py-3.5 rounded-[var(--radius-card)] border shadow-[var(--shadow-lifted,0_16px_48px_rgba(0,0,0,0.28))]"
                        style={{
                            background: 'var(--bg-card)',
                            borderColor: 'var(--border-default)',
                            backdropFilter: 'blur(20px) saturate(1.4)',
                            WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
                        }}
                    >
                        <div
                            className="mt-0.5 w-8 h-8 rounded-[calc(var(--radius-card)-6px)] flex items-center justify-center shrink-0"
                            style={{
                                background: 'var(--focus-100)',
                                color: 'var(--focus)',
                            }}
                        >
                            <Sparkles className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">
                                {current.title}
                            </p>
                            <p className="text-xs leading-relaxed text-[var(--text-muted)] mt-0.5">
                                {current.reason}
                            </p>
                            <div className="flex items-center gap-2 mt-2.5">
                                <button
                                    onClick={handleAccept}
                                    className="inline-flex items-center px-3.5 py-1.5 rounded-[calc(var(--radius-card)-6px)] text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-105 active:scale-95 transition-all"
                                >
                                    {current.actionLabel}
                                </button>
                                <button
                                    onClick={dismiss}
                                    className="inline-flex items-center px-3 py-1.5 rounded-[calc(var(--radius-card)-6px)] text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Not now
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={dismiss}
                            aria-label="Dismiss suggestion"
                            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
