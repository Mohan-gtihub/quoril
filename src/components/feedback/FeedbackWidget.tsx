// Floating "Report" affordance. Drag the pill to any corner — it snaps to the
// nearest one and remembers where you left it. One click to open, one field to
// type, everything else auto-captured. Rendered once in App.tsx, gated on the
// tester role. Visual language matches the app's cards: light surface, soft
// shadow, hairline borders, quiet line icons, dark pill trigger.

import { useEffect, useRef, useState } from 'react'
import { submitFeedback, type FeedbackType } from '@/services/feedbackService'
import { platform } from '@/services/platform'
import { cn } from '@/utils/helpers'

type Phase = 'idle' | 'sending' | 'done'
type IconProps = { className?: string }

/* ── Line icons (1.6 stroke, rounded — matches the app's icon set) ── */

function FlagIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 21V5c1.6-.7 3-1 4.3-1 2.3 0 3.9 1.3 6.2 1.3 1 0 2-.2 3-.6v8.4c-1 .4-2 .6-3 .6-2.3 0-3.9-1.3-6.2-1.3-1.3 0-2.7.3-4.3 1" />
        </svg>
    )
}
function BugIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="8" width="8" height="10" rx="4" />
            <path d="M9.5 7.5 8.5 6M14.5 7.5 15.5 6" />
            <path d="M8 11H5M8 14.5H5.5M16 11h3M16 14.5h2.5" />
        </svg>
    )
}
function IdeaIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 18h5M10.5 21h3" />
            <path d="M12 3a5.5 5.5 0 0 0-3.6 9.6c.5.5.9 1.1 1 1.8l.1.6h5l.1-.6c.1-.7.5-1.3 1-1.8A5.5 5.5 0 0 0 12 3z" />
        </svg>
    )
}
function ConfusedIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M9.4 9.5a2.7 2.7 0 0 1 5.2 1c0 1.7-2.6 2.1-2.6 3.8" />
            <path d="M12 17.3h.01" />
        </svg>
    )
}
function CloseIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    )
}
function CheckIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5 5L20 6.5" />
        </svg>
    )
}

const TYPES: { id: FeedbackType; label: string; Icon: (p: IconProps) => JSX.Element }[] = [
    { id: 'bug', label: 'Bug', Icon: BugIcon },
    { id: 'idea', label: 'Idea', Icon: IdeaIcon },
    { id: 'confusing', label: 'Confusing', Icon: ConfusedIcon },
]

// Screenshots only work on the native desktop window.
const canScreenshot = platform.capabilities.nativeOverlay

/* ── Corner placement: drag the pill, snap to nearest corner, persist ── */

type Corner = 'tl' | 'tr' | 'bl' | 'br'
const CORNER_KEY = 'feedback-widget-corner'
const MARGIN = 20 // px gap from the window edge

// Fixed-position styles per corner. flex-direction keeps the panel stacked
// away from the edge the pill is docked to.
const CORNER_POS: Record<Corner, React.CSSProperties> = {
    tl: { top: MARGIN + 40, left: MARGIN },
    tr: { top: MARGIN + 40, right: MARGIN },
    bl: { bottom: MARGIN, left: MARGIN },
    br: { bottom: MARGIN, right: MARGIN },
}

function loadCorner(): Corner {
    try {
        const v = localStorage.getItem(CORNER_KEY)
        if (v === 'tl' || v === 'tr' || v === 'bl' || v === 'br') return v
    } catch { /* ignore */ }
    return 'tr'
}

function nearestCorner(x: number, y: number): Corner {
    const top = y < window.innerHeight / 2
    const left = x < window.innerWidth / 2
    return `${top ? 't' : 'b'}${left ? 'l' : 'r'}` as Corner
}

export function FeedbackWidget() {
    const [corner, setCorner] = useState<Corner>(loadCorner)
    const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
    const [open, setOpen] = useState(false)
    const [type, setType] = useState<FeedbackType>('bug')
    const [message, setMessage] = useState('')
    const [includeShot, setIncludeShot] = useState(canScreenshot)
    const [phase, setPhase] = useState<Phase>('idle')
    const [error, setError] = useState('')
    const textRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (open) textRef.current?.focus()
    }, [open])

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    async function send() {
        if (!message.trim() || phase === 'sending') return
        setPhase('sending')
        setError('')
        try {
            await submitFeedback({ type, message, includeScreenshot: includeShot })
            setPhase('done')
            setMessage('')
            setTimeout(() => { setOpen(false); setPhase('idle') }, 1700)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
            setPhase('idle')
        }
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send() }
    }

    // Drag the pill by its handle. We track pointer position live so the pill
    // follows the cursor, then snap to the nearest corner on release. A tiny
    // move threshold keeps a plain click from being treated as a drag.
    function onDragStart(e: React.PointerEvent) {
        const startX = e.clientX
        const startY = e.clientY
        let moved = false
            ; (e.target as Element).setPointerCapture?.(e.pointerId)

        const onMove = (ev: PointerEvent) => {
            if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) moved = true
            if (moved) setDrag({ x: ev.clientX, y: ev.clientY })
        }
        const onUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            setDrag(null)
            if (moved) {
                const next = nearestCorner(ev.clientX, ev.clientY)
                setCorner(next)
                try { localStorage.setItem(CORNER_KEY, next) } catch { /* ignore */ }
            } else {
                setOpen((o) => !o) // treat as a click
            }
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
    }

    const isTop = corner === 'tl' || corner === 'tr'
    const isLeft = corner === 'tl' || corner === 'bl'
    // While dragging, float the pill under the cursor; otherwise dock to corner.
    const containerStyle: React.CSSProperties = drag
        ? { left: drag.x, top: drag.y, transform: 'translate(-50%, -50%)' }
        : CORNER_POS[corner]

    return (
        <div
            style={containerStyle}
            className={cn(
                'fixed z-[9999] flex flex-col gap-3 print:hidden',
                isTop ? 'flex-col-reverse' : 'flex-col',
                isLeft ? 'items-start' : 'items-end',
            )}
        >
            {open && (
                <div
                    role="dialog"
                    aria-label="Report an issue"
                    className="flex max-h-[calc(100vh-96px)] w-[min(344px,calc(100vw-32px))] flex-col overflow-hidden rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.28)]"
                >
                    {phase === 'done' ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--success)]/12 text-[var(--success)]">
                                <CheckIcon className="h-6 w-6" />
                            </span>
                            <p className="text-[15px] font-semibold text-[var(--text-primary)]">Report sent</p>
                            <p className="max-w-[220px] text-[13px] leading-relaxed text-[var(--text-muted)]">
                                Thanks — this goes straight to the team.
                            </p>
                        </div>
                    ) : (
                        <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-4">
                            {/* Header */}
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-primary)]">
                                        Report an issue
                                    </h3>
                                    <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
                                        Tell us what went wrong.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    aria-label="Close"
                                    className="grid h-7 w-7 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                                >
                                    <CloseIcon className="h-[15px] w-[15px]" />
                                </button>
                            </div>

                            {/* Type selector — segmented, borderless on a soft track */}
                            <div className="mb-4 flex gap-1 rounded-2xl bg-[var(--bg-primary)] p-1">
                                {TYPES.map(({ id, label, Icon }) => {
                                    const active = type === id
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => setType(id)}
                                            aria-pressed={active}
                                            className={cn(
                                                'flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[12px] font-medium transition',
                                                active
                                                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                                            )}
                                        >
                                            <Icon className={cn('h-[18px] w-[18px] transition-colors', active && 'text-[var(--accent-primary)]')} />
                                            {label}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Message — quiet field, no heavy box */}
                            <textarea
                                ref={textRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={onKeyDown}
                                rows={4}
                                maxLength={5000}
                                placeholder="Describe it in a line or two…"
                                className="w-full resize-none rounded-2xl bg-[var(--bg-primary)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent-primary)]/40"
                            />

                            {canScreenshot && (
                                <label className="mt-3 flex cursor-pointer select-none items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
                                    <input
                                        type="checkbox"
                                        checked={includeShot}
                                        onChange={(e) => setIncludeShot(e.target.checked)}
                                        className="h-3.5 w-3.5 rounded accent-[var(--accent-primary)]"
                                    />
                                    Attach a screenshot of this screen
                                </label>
                            )}

                            {error && (
                                <p className="mt-3 rounded-xl bg-[var(--danger,#ef4444)]/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--danger,#ef4444)]">
                                    {error}
                                </p>
                            )}

                            {/* Send — full-width, calm */}
                            <button
                                onClick={send}
                                disabled={!message.trim() || phase === 'sending'}
                                className="mt-4 w-full rounded-2xl bg-[var(--text-primary)] py-3 text-[13.5px] font-semibold text-[var(--bg-card)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
                            >
                                {phase === 'sending' ? 'Sending…' : 'Send report'}
                            </button>

                            <p className="mt-2.5 text-center text-[11px] text-[var(--text-muted)]">
                                Screen, version &amp; recent errors attached automatically
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Trigger — dark pill, matches the app's "SHARE FOCUS MAP" button */}
            <button
                onPointerDown={onDragStart}
                aria-label="Report an issue (drag to move)"
                aria-expanded={open}
                className={cn(
                    'flex touch-none select-none items-center gap-2 rounded-full bg-[var(--text-primary)] py-2.5 pl-3.5 pr-4 text-[13px] font-semibold text-[var(--bg-card)] shadow-[0_10px_28px_-8px_rgba(0,0,0,0.5)] transition active:translate-y-0',
                    drag ? 'cursor-grabbing shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]' : 'cursor-grab hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-10px_rgba(0,0,0,0.55)]',
                    open && 'opacity-95',
                )}
            >
                <FlagIcon className="h-[17px] w-[17px]" />
                Report
            </button>
        </div>
    )
}
