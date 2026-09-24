import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, subDays, addDays, isToday } from 'date-fns'
import {
    ArrowLeft, ChevronLeft, ChevronRight, Play, Pause,
    Crosshair, AppWindow, GitBranch, Clock, Activity, Waves,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { platform } from '@/services/platform'
import { useScreenTimeData } from '@/components/screentime/useScreenTimeData'
import { TrackingUnavailable } from '@/components/reports/components/TrackingUnavailable'
import { cn } from '@/utils/helpers'
import {
    buildAttentionModel, blockAt, getCategoryColor, fmtDuration, fmtClock, fmtHourLabel,
    type RawFocusSession, type AttentionBlock,
} from './attentionUtils'

const appTracking = platform.capabilities.appTracking

/* ═══════════════════════════════════════════════════════════════
   LAYOUT PRIMITIVES
═══════════════════════════════════════════════════════════════ */

function Tile({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-6', className)}>
            {children}
        </div>
    )
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {children}
        </p>
    )
}

/* ═══════════════════════════════════════════════════════════════
   TIMELINE LANE  (apps colored by category + focus overlay band)
═══════════════════════════════════════════════════════════════ */

interface LaneProps {
    appBlocks: AttentionBlock[]
    focusBlocks: AttentionBlock[]
    firstMs: number
    lastMs: number
    playheadMs: number
    onScrub: (ms: number) => void
}

function Lane({ appBlocks, focusBlocks, firstMs, lastMs, playheadMs, onScrub }: LaneProps) {
    const trackRef = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState(false)
    const span = Math.max(lastMs - firstMs, 1)

    const toFrac = (ms: number) => Math.min(1, Math.max(0, (ms - firstMs) / span))

    const scrubFromClientX = useCallback((clientX: number) => {
        const el = trackRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        onScrub(firstMs + frac * span)
    }, [firstMs, span, onScrub])

    useEffect(() => {
        if (!dragging) return
        const move = (e: PointerEvent) => scrubFromClientX(e.clientX)
        const up = () => setDragging(false)
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        return () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
        }
    }, [dragging, scrubFromClientX])

    // Hour ticks across the visible span.
    const ticks = useMemo(() => {
        const out: { frac: number; hour: number }[] = []
        const startHour = new Date(firstMs)
        startHour.setMinutes(0, 0, 0)
        for (let t = startHour.getTime(); t <= lastMs; t += 3600_000) {
            if (t < firstMs) continue
            out.push({ frac: toFrac(t), hour: new Date(t).getHours() })
        }
        return out
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstMs, lastMs, span])

    const playFrac = toFrac(playheadMs)

    return (
        <div className="select-none">
            {/* Hour axis */}
            <div className="relative h-4 mb-1.5">
                {ticks.map((t, i) => (
                    <span key={i} className="absolute -translate-x-1/2 text-[10px] font-medium text-[var(--text-muted)] tabular-nums"
                        style={{ left: `${t.frac * 100}%` }}>
                        {fmtHourLabel(t.hour)}
                    </span>
                ))}
            </div>

            <div
                ref={trackRef}
                className="relative cursor-pointer"
                onPointerDown={(e) => { setDragging(true); scrubFromClientX(e.clientX) }}
            >
                {/* Focus overlay band (top) */}
                <div className="relative h-2 mb-1">
                    <div className="absolute inset-0 rounded-full bg-[var(--track)] opacity-40" />
                    {focusBlocks.map(b => (
                        <div key={b.id}
                            className="absolute top-0 h-2 rounded-full"
                            title={`Focused · ${b.title} · ${fmtDuration(b.seconds)}`}
                            style={{
                                left: `${toFrac(b.startMs) * 100}%`,
                                width: `${Math.max((toFrac(b.endMs) - toFrac(b.startMs)) * 100, 0.4)}%`,
                                background: 'var(--focus)',
                                boxShadow: '0 0 0 1px color-mix(in srgb, var(--focus) 40%, transparent)',
                            }}
                        />
                    ))}
                </div>

                {/* App lane (category-colored) */}
                <div className="relative h-9 rounded-[10px] overflow-hidden bg-[var(--track)]">
                    {appBlocks.map(b => {
                        const left = toFrac(b.startMs)
                        const width = Math.max(toFrac(b.endMs) - left, 0.002)
                        const active = playheadMs >= b.startMs && playheadMs < b.endMs
                        return (
                            <div key={b.id}
                                className="absolute top-0 h-9 transition-opacity"
                                title={`${b.title} · ${fmtDuration(b.seconds)}`}
                                style={{
                                    left: `${left * 100}%`,
                                    width: `${width * 100}%`,
                                    backgroundColor: getCategoryColor(b.category),
                                    opacity: active ? 1 : 0.72,
                                }}
                            />
                        )
                    })}
                </div>

                {/* Playhead */}
                <div className="absolute -top-2 bottom-0 pointer-events-none"
                    style={{ left: `${playFrac * 100}%` }}>
                    <div className="w-[2px] h-[54px] -translate-x-1/2 rounded-full"
                        style={{ background: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }} />
                    <div className="w-3 h-3 -translate-x-1/2 -mt-[54px] rounded-full border-2 ml-[1px]"
                        style={{ background: 'var(--text-primary)', borderColor: 'var(--bg-card)' }} />
                </div>
            </div>

            {/* Endpoints */}
            <div className="flex justify-between mt-3 text-[11px] text-[var(--text-muted)] tabular-nums">
                <span>{fmtClock(new Date(firstMs).toISOString())}</span>
                <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--focus)' }} />
                    Deliberate focus overlaid on captured activity
                </span>
                <span>{fmtClock(new Date(lastMs).toISOString())}</span>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════
   READOUT  (what was in front at the playhead)
═══════════════════════════════════════════════════════════════ */

function Readout({ block, focus, ms }: { block: AttentionBlock | null; focus: AttentionBlock | null; ms: number }) {
    const inFocus = !!focus
    const tint = inFocus ? 'var(--focus)' : block ? getCategoryColor(block.category) : 'var(--text-muted)'
    return (
        <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-[var(--radius-card)] flex items-center justify-center flex-shrink-0"
                style={{ background: `color-mix(in srgb, ${tint} 12%, transparent)`, color: tint }}>
                {inFocus ? <Crosshair size={18} /> : <AppWindow size={18} />}
            </div>
            <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate">
                    {block ? block.title : 'Nothing captured yet'}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] truncate tabular-nums">
                    {block ? (
                        <>
                            {fmtClock(new Date(ms).toISOString())}
                            {inFocus
                                ? <> · Focused on {focus!.title}</>
                                : <> · {block.category} · {fmtDuration(block.seconds)} stretch</>}
                        </>
                    ) : 'Replay forms from local app activity'}
                </p>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════
   SUMMARY RAIL
═══════════════════════════════════════════════════════════════ */

function RailStat({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `color-mix(in srgb, ${tint} 12%, transparent)`, color: tint }}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] text-[var(--text-tertiary)]">{label}</p>
                <p className="text-[15px] font-semibold text-[var(--text-primary)] tabular-nums leading-snug">{value}</p>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════ */

export function AttentionScreen() {
    const navigate = useNavigate()
    const { loading, trackingAvailable, date, setDate, timeline } = useScreenTimeData()

    const [sessions, setSessions] = useState<RawFocusSession[]>([])
    useEffect(() => {
        if (!appTracking) return
        let cancelled = false
        const from = date + 'T00:00:00'
        const to = date + 'T23:59:59'
        Promise.resolve(platform.data.listSessions({ from, to }))
            .then((rows: any[]) => { if (!cancelled) setSessions(rows ?? []) })
            .catch(() => { if (!cancelled) setSessions([]) })
        return () => { cancelled = true }
    }, [date])

    const model = useMemo(() => buildAttentionModel(timeline, sessions, date), [timeline, sessions, date])

    // ── Playhead / playback ──
    const [playheadMs, setPlayheadMs] = useState<number | null>(null)
    const [playing, setPlaying] = useState(false)
    const rafRef = useRef<number>(0)

    // Reset playhead to the day's start whenever the day (or its bounds) changes.
    useEffect(() => {
        setPlaying(false)
        setPlayheadMs(model.firstMs)
    }, [date, model.firstMs, model.lastMs])

    useEffect(() => {
        if (!playing || model.firstMs == null || model.lastMs == null) return
        const span = Math.max(model.lastMs - model.firstMs, 1)
        const durationMs = 9000 // full-day replay in 9s
        let raf = 0
        let last = performance.now()
        const tick = (now: number) => {
            const dt = now - last
            last = now
            setPlayheadMs(prev => {
                const base = prev ?? model.firstMs!
                const next = base + (dt / durationMs) * span
                if (next >= model.lastMs!) { setPlaying(false); return model.lastMs! }
                return next
            })
            raf = requestAnimationFrame(tick)
            rafRef.current = raf
        }
        raf = requestAnimationFrame(tick)
        rafRef.current = raf
        return () => cancelAnimationFrame(raf)
    }, [playing, model.firstMs, model.lastMs])

    const togglePlay = () => {
        if (model.firstMs == null) return
        setPlaying(p => {
            const next = !p
            if (next && (playheadMs == null || playheadMs >= (model.lastMs ?? 0))) {
                setPlayheadMs(model.firstMs)
            }
            return next
        })
    }

    const onScrub = (ms: number) => { setPlaying(false); setPlayheadMs(ms) }

    const effMs = playheadMs ?? model.firstMs ?? Date.now()
    const currentApp = blockAt(model.appBlocks, effMs)
    const currentFocus = blockAt(model.focusBlocks, effMs)

    const isViewingToday = isToday(parseISO(date))
    const displayDate = isViewingToday ? 'Today' : format(parseISO(date), 'EEE, MMM d')
    const goBack = () => setDate(format(subDays(parseISO(date), 1), 'yyyy-MM-dd'))
    const goForward = () => {
        const next = addDays(parseISO(date), 1)
        if (!isToday(next) && next > new Date()) return
        setDate(format(next, 'yyyy-MM-dd'))
    }

    const replayPct = model.firstMs != null && model.lastMs != null && model.lastMs > model.firstMs
        ? Math.round(((effMs - model.firstMs) / (model.lastMs - model.firstMs)) * 100)
        : 0

    /* ── Desktop-only guard ── */
    if (!appTracking || (!loading && !trackingAvailable)) {
        return (
            <Shell navigate={navigate}>
                <TrackingUnavailable
                    title={appTracking ? undefined : 'Screen Time tracking is desktop-only'}
                    description={appTracking
                        ? undefined
                        : 'Attention reconstructs your day from locally captured app activity and focus sessions. That capture runs on the desktop app only — open Quoril on your Mac or PC to see your attention replay.'}
                />
            </Shell>
        )
    }

    return (
        <Shell
            navigate={navigate}
            nav={
                <div className="flex items-center gap-1 rounded-full bg-[var(--bg-hover)] p-1">
                    <button onClick={goBack}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)] transition-colors">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="min-w-[110px] text-center text-sm font-semibold text-[var(--text-primary)] tabular-nums">{displayDate}</span>
                    <button onClick={goForward} disabled={isViewingToday}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <ChevronRight size={16} />
                    </button>
                </div>
            }
        >
            {!model.hasData ? (
                <Tile className="flex flex-col items-center justify-center text-center py-20">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-muted)] mb-4">
                        <Waves size={22} />
                    </div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">Nothing captured for this day</p>
                    <p className="text-sm text-[var(--text-tertiary)] mt-1.5 max-w-sm">
                        Your attention replay forms from local app activity and focus sessions — no manual logging. Use Quoril normally and this day will fill in.
                    </p>
                </Tile>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
                    {/* ── Replay hero ── */}
                    <Tile className="p-7">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="min-w-0 flex-1">
                                <Readout block={currentApp} focus={currentFocus} ms={effMs} />
                            </div>
                            <span className="text-sm font-mono text-[var(--text-muted)] tabular-nums">{replayPct}%</span>
                            <button onClick={togglePlay}
                                className="flex items-center gap-2 px-4 h-9 rounded-full bg-[var(--focus)] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                                {playing ? <Pause size={15} /> : <Play size={15} />}
                                {playing ? 'Pause' : replayPct >= 100 ? 'Replay' : 'Play'}
                            </button>
                        </div>

                        <Lane
                            appBlocks={model.appBlocks}
                            focusBlocks={model.focusBlocks}
                            firstMs={model.firstMs!}
                            lastMs={model.lastMs!}
                            playheadMs={effMs}
                            onScrub={onScrub}
                        />

                        {/* Category ribbon */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-2.5">
                                <Label>Where the day went</Label>
                                <span className="text-[11px] text-[var(--text-tertiary)]">Captured app time</span>
                            </div>
                            <div className="flex gap-[3px] h-4">
                                {model.categoryTotals.map(c => (
                                    <div key={c.category}
                                        title={`${c.category} · ${fmtDuration(c.seconds)}`}
                                        className="rounded-[4px] first:rounded-l-full last:rounded-r-full"
                                        style={{
                                            flex: Math.max(c.seconds, 1),
                                            backgroundColor: getCategoryColor(c.category),
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
                                {model.categoryTotals.slice(0, 5).map(c => (
                                    <span key={c.category} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(c.category) }} />
                                        {c.category}
                                        <span className="text-[var(--text-muted)] tabular-nums">{fmtDuration(c.seconds)}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Tile>

                    {/* ── Summary rail ── */}
                    <Tile className="space-y-6">
                        <Label>The shape of the day</Label>
                        <div className="space-y-5">
                            <RailStat icon={<Clock size={14} />} tint="var(--wellbeing)"
                                label="Total tracked" value={fmtDuration(model.trackedSeconds)} />
                            <RailStat icon={<Crosshair size={14} />} tint="var(--focus)"
                                label="Deliberate focus" value={fmtDuration(model.focusSeconds)} />
                            <RailStat icon={<Activity size={14} />} tint="var(--break)"
                                label="Longest unbroken stretch"
                                value={model.longestStretch ? `${fmtDuration(model.longestStretch.seconds)} · ${model.longestStretch.title}` : '—'} />
                            <RailStat icon={<GitBranch size={14} />} tint="#8b5cf6"
                                label="Context switches" value={`${model.contextSwitches}`} />
                        </div>

                        <div className="border-t border-[var(--border-default)] pt-5">
                            <Label>Top categories</Label>
                            <div className="space-y-2.5 mt-3">
                                {model.categoryTotals.slice(0, 5).map(c => {
                                    const max = model.categoryTotals[0]?.seconds || 1
                                    return (
                                        <div key={c.category}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(c.category) }} />
                                                <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">{c.category}</span>
                                                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{fmtDuration(c.seconds)}</span>
                                            </div>
                                            <div className="h-1 rounded-full bg-[var(--track)] overflow-hidden ml-4">
                                                <motion.div className="h-full rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.round((c.seconds / max) * 100)}%` }}
                                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    style={{ backgroundColor: getCategoryColor(c.category) }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </Tile>
                </div>
            )}
        </Shell>
    )
}

/* ─── Page shell (header + date nav) ─── */

function Shell({ children, navigate, nav }: {
    children: React.ReactNode
    navigate: ReturnType<typeof useNavigate>
    nav?: React.ReactNode
}) {
    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar select-none pb-24">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10">
                <header className="mb-8 flex items-end gap-4">
                    <button onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-tertiary)] mb-1.5">Digital Wellbeing</p>
                        <h1 className="text-[30px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">Attention</h1>
                    </div>
                    {nav}
                </header>
                {children}
            </div>
        </div>
    )
}

export default AttentionScreen
