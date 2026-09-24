import { useState } from 'react'
import {
    ArrowLeft, RefreshCw, AlertCircle, Brain, Layers, Timer, Clock,
    CheckCircle2, Hourglass,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'
import { DateRangePicker, type DateRange } from '@/components/reports/components/ReportsDatePicker'
import { PeakHoursChart } from '@/components/reports/components/charts/PeakHoursChart'
import { useDeepWorkData } from './useDeepWorkData'
import { fmtDuration, formatHour } from './deepWorkMetrics'
import { startOfDay, endOfDay, subDays } from 'date-fns'

/* ─── Default range: last 30 days ─────────────────────────────── */

function getLast30DaysRange(): DateRange {
    const today = new Date()
    return {
        startDate: startOfDay(subDays(today, 29)),
        endDate: endOfDay(today),
        label: 'Last 30 days',
    }
}

/* ─── Palette (matches Reports) ───────────────────────────────── */

const C = {
    focus: 'var(--focus)',
    well: 'var(--wellbeing)',
    break: 'var(--break)',
    ink: 'var(--text-tertiary)',
}

/* ─── Primitives (mirrors Reports conventions) ────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{children}</p>
}

function Skeleton({ h = 'h-20', className = '' }: { h?: string; className?: string }) {
    return <div className={`animate-pulse bg-[var(--bg-hover)] rounded-[var(--radius-tile)] ${h} ${className}`} />
}

function Card({
    title, icon: Icon, accent = 'var(--text-secondary)', hint, className, center, children,
}: {
    title: string; icon: any; accent?: string; hint?: string; className?: string; center?: boolean; children: React.ReactNode
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`group relative flex flex-col h-full rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-6 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-16px_rgba(15,23,42,0.35)] ${className || ''}`}
        >
            <div className="flex items-center gap-2.5 mb-5">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}>
                    <Icon className="w-4 h-4" />
                </span>
                <h2 className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)] flex-1">{title}</h2>
                {hint && <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{hint}</span>}
            </div>
            <div className={`flex-1 ${center ? 'flex flex-col justify-center' : ''}`}>{children}</div>
        </motion.section>
    )
}

function HeroStat({ label, value, sub, accent }: {
    label: string; value: string; sub?: string; accent: string
}) {
    return (
        <div className="px-3 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
                <Eyebrow>{label}</Eyebrow>
            </div>
            <p className="text-[28px] font-semibold tabular-nums leading-none mt-3 tracking-[-0.02em] text-[var(--text-primary)]">{value}</p>
            {sub && <p className="text-[11px] text-[var(--text-tertiary)] mt-2 truncate">{sub}</p>}
        </div>
    )
}

/* ─── Attention-span histogram ────────────────────────────────── */

function AttentionHistogram({ data }: { data: { label: string; count: number }[] }) {
    if (data.every(d => d.count === 0)) {
        return <div className="flex items-center justify-center h-40 text-xs text-[var(--text-muted)]">No deep blocks in this range yet</div>
    }
    const maxCount = Math.max(1, ...data.map(d => d.count))
    return (
        <ResponsiveContainer width="100%" height={168}>
            <BarChart data={data} margin={{ top: 10, right: 6, left: 6, bottom: 0 }} barCategoryGap={10}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dy={4} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip
                    cursor={{ fill: 'var(--bg-hover)' }}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v} ${v === 1 ? 'block' : 'blocks'}`, 'Deep blocks']}
                    labelFormatter={(l: string) => `${l} min`}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} animationDuration={600}>
                    {data.map((d, i) => {
                        const opacity = Math.round((0.28 + (d.count / maxCount) * 0.55) * 100)
                        return <Cell key={i} fill={`color-mix(in srgb, var(--focus) ${opacity}%, transparent)`} />
                    })}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}

/* ─── Deep-blocks-per-day trend ───────────────────────────────── */

function DeepTrendChart({ data }: { data: { day: string; deepMinutes: number; blocks: number }[] }) {
    if (data.length === 0 || data.every(d => d.deepMinutes === 0)) {
        return <div className="flex items-center justify-center h-52 text-xs text-[var(--text-muted)]">No deep work recorded in this range</div>
    }
    const rows = data.map(d => ({ ...d, label: d.day.slice(5) })) // MM-DD
    const interval = Math.max(0, Math.floor(rows.length / 8))
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rows} margin={{ top: 10, right: 6, left: 6, bottom: 0 }} barCategoryGap={rows.length > 20 ? 1 : 3}>
                <XAxis dataKey="label" interval={interval} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dy={4} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={34} allowDecimals={false} tickFormatter={(v: number) => `${v}m`} />
                <Tooltip
                    cursor={{ fill: 'var(--bg-hover)' }}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number, _n, p: any) => [`${v}m · ${p.payload.blocks} ${p.payload.blocks === 1 ? 'block' : 'blocks'}`, 'Deep work']}
                />
                <Bar dataKey="deepMinutes" radius={[3, 3, 0, 0]} fill="var(--focus)" animationDuration={600} />
            </BarChart>
        </ResponsiveContainer>
    )
}

/* ════════════════════════════════════════════════════════════════ */

export function DeepWorkScreen() {
    const navigate = useNavigate()
    const [range, setRange] = useState<DateRange>(getLast30DaysRange)
    const [retryKey, setRetryKey] = useState(0)
    const { loading, error, attention, tasks, peakBins, bestHour, totals, trend, hasData } =
        useDeepWorkData(range, retryKey)

    const maxTaskFocus = Math.max(1, ...tasks.map(t => t.focusSeconds))

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar select-none pb-24">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10 space-y-6">

                {/* ── Header ── */}
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)}
                            className="w-9 h-9 rounded-full hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors">
                            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <div>
                            <Eyebrow>Focus</Eyebrow>
                            <h1 className="text-[32px] leading-none font-semibold tracking-tight text-[var(--text-primary)] mt-1.5">Deep Work</h1>
                            <p className="text-[12.5px] text-[var(--text-muted)] mt-2">Your attention span and what you spent it on.</p>
                        </div>
                    </div>
                    <DateRangePicker value={range} onChange={setRange} />
                </header>

                {/* Error banner */}
                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)]">
                        <AlertCircle className="w-4 h-4 text-[var(--error)] flex-shrink-0" />
                        <p className="text-xs text-[var(--text-secondary)] flex-1">{error}</p>
                        <button onClick={() => setRetryKey(k => k + 1)} className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors">
                            <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-6">
                        <Skeleton h="h-40" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} h="h-56" />)}</div>
                    </div>
                ) : !hasData ? (
                    /* ── Empty / low-data state ── */
                    <motion.section
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                        className="rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-10 flex flex-col items-center text-center gap-4">
                        <span className="w-14 h-14 rounded-[var(--radius-card)] flex items-center justify-center"
                            style={{ background: `color-mix(in srgb, ${C.focus} 14%, transparent)`, color: C.focus }}>
                            <Hourglass className="w-6 h-6" />
                        </span>
                        <div>
                            <p className="text-base font-semibold text-[var(--text-primary)]">Learning your focus pattern</p>
                            <p className="text-[12.5px] text-[var(--text-muted)] mt-1.5 max-w-[360px] leading-relaxed">
                                Complete a few focus sessions of at least 25 minutes and your attention span, deep-work trend,
                                and best focus hours appear here.
                            </p>
                        </div>
                    </motion.section>
                ) : (
                    <>
                        {/* ══ HERO ════════════════════════════════════════════ */}
                        <motion.section
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}
                            className="rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] overflow-hidden">
                            <div className="grid lg:grid-cols-[1.15fr_1fr]">
                                <div className="relative p-7 md:p-8 overflow-hidden">
                                    <div className="pointer-events-none absolute -top-20 -left-16 w-64 h-64 rounded-full"
                                        style={{ background: 'var(--focus-glow)', filter: 'blur(64px)', opacity: 0.45 }} />
                                    <div className="relative">
                                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                            <Clock className="w-3.5 h-3.5" />
                                            <Eyebrow>Deep work · {range.label}</Eyebrow>
                                        </div>
                                        <div className="flex items-end gap-1.5 mt-3">
                                            <span className="text-[56px] leading-[0.85] font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">{totals.hours}</span>
                                            <span className="text-[24px] font-semibold text-[var(--text-tertiary)] mb-1">h</span>
                                        </div>
                                        <p className="text-[12px] text-[var(--text-tertiary)] mt-3">
                                            {totals.blocks} deep {totals.blocks === 1 ? 'block' : 'blocks'} (≥25m)
                                            {totals.longestMinutes > 0 && ` · longest ${totals.longestMinutes}m`}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center gap-x-2 px-3 py-7 md:py-8 border-t lg:border-t-0 lg:border-l border-[var(--border-default)]">
                                    <HeroStat label="Deep hours" accent={C.focus}
                                        value={`${totals.hours}h`} sub="uninterrupted focus" />
                                    <HeroStat label="Deep blocks" accent={C.well}
                                        value={`${totals.blocks}`} sub="≥25 min each" />
                                    <HeroStat label="Longest block" accent={C.break}
                                        value={totals.longestMinutes > 0 ? `${totals.longestMinutes}m` : '—'} sub="single stretch" />
                                </div>
                            </div>
                        </motion.section>

                        {/* ══ Attention span (the headline finding) ═══════════ */}
                        <Card title="Your attention span" icon={Timer} accent={C.focus}
                            hint={attention.ready ? `${attention.sampleSize} blocks measured` : `${attention.sampleSize}/5 blocks`}>
                            <div className="flex items-start gap-5 mb-5">
                                <div className="relative shrink-0 w-[68px] h-[68px] rounded-full flex items-center justify-center"
                                    style={{ background: `color-mix(in srgb, ${C.focus} 12%, transparent)` }}>
                                    <span className="text-[26px] font-bold tabular-nums" style={{ color: C.focus }}>
                                        {attention.ready ? attention.medianMinutes : '—'}
                                    </span>
                                    <span className="absolute -bottom-1 text-[8px] font-bold tracking-wider" style={{ color: C.focus }}>MIN</span>
                                </div>
                                <div className="min-w-0 pt-1">
                                    {attention.ready ? (
                                        <>
                                            <p className="text-[15px] font-medium text-[var(--text-primary)] leading-snug">
                                                Your typical uninterrupted deep-work block runs about {attention.medianMinutes} minutes.
                                            </p>
                                            <p className="text-[12px] text-[var(--text-muted)] mt-1.5">
                                                {attention.sampleSize} blocks measured · avg {attention.avgMinutes}m · longest {attention.longestMinutes}m
                                            </p>
                                            <p className="text-[12px] mt-1.5 flex items-center gap-1.5" style={{ color: C.well }}>
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                A session length near {attention.suggestedMinutes}m fits your rhythm.
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-[13px] text-[var(--text-secondary)] leading-snug">
                                            {attention.sampleSize} of 5 deep blocks analyzed. Complete {Math.max(5 - attention.sampleSize, 0)} more
                                            focus sessions of at least 25 minutes to unlock your measured attention span.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <AttentionHistogram data={attention.histogram} />
                            <p className="text-[11px] text-[var(--text-muted)] mt-3">Distribution of your deep-block lengths (minutes).</p>
                        </Card>

                        {/* ══ Deep-work per-day trend ═════════════════════════ */}
                        <Card title="Deep Work Blocks Per Day" icon={Layers} accent={C.focus}
                            hint={`${totals.blocks} blocks · ${range.label}`}>
                            <DeepTrendChart data={trend} />
                        </Card>

                        {/* ══ 2-col bento ═════════════════════════════════════ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch [&>*:last-child:nth-child(odd)]:lg:col-span-2">

                            {/* What you did deep work on */}
                            <Card title="What You Did Deep Work On" icon={Brain} accent={C.well}
                                hint={tasks.length > 0 ? `${tasks.length} tasks` : undefined}>
                                {tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                                        <p className="text-xs text-[var(--text-muted)] max-w-[240px] leading-relaxed">
                                            Start a focus session on a task and it shows up here, ranked by focus time.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3.5">
                                        {tasks.map((t, i) => (
                                            <div key={t.taskId} className="flex items-center gap-3">
                                                <span className="w-4 text-[11px] font-semibold tabular-nums text-[var(--text-muted)] text-right shrink-0">{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between text-[11px] mb-1 gap-2">
                                                        <span className="truncate text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                                                            {t.status === 'done' && <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: C.well }} />}
                                                            <span className="truncate">{t.title}</span>
                                                        </span>
                                                        <span className="tabular-nums text-[var(--text-muted)] shrink-0">
                                                            {fmtDuration(t.focusSeconds)} · {t.estBlocks} {t.estBlocks === 1 ? 'block' : 'blocks'}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-[var(--track)] rounded-full overflow-hidden">
                                                        <motion.div className="h-full rounded-full"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(100, Math.round((t.focusSeconds / maxTaskFocus) * 100))}%` }}
                                                            transition={{ duration: 0.7, ease: 'easeOut' }}
                                                            style={{ background: C.well }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>

                            {/* Best deep-work time of day */}
                            <Card title="Best Deep-Work Hours" icon={Clock} accent={C.focus}
                                hint={bestHour ? `peak ${formatHour(bestHour.hour)}` : undefined} center>
                                {bestHour && (
                                    <div className="mb-4 flex items-center gap-3">
                                        <span className="w-11 h-11 rounded-[var(--radius-card)] flex items-center justify-center shrink-0"
                                            style={{ background: `color-mix(in srgb, ${C.break} 14%, transparent)`, color: C.break }}>
                                            <Clock className="w-5 h-5" />
                                        </span>
                                        <div>
                                            <p className="text-base font-semibold text-[var(--text-primary)]">{formatHour(bestHour.hour)}</p>
                                            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Your most focused hour · {bestHour.minutes}m</p>
                                        </div>
                                    </div>
                                )}
                                <PeakHoursChart bins={peakBins} />
                            </Card>

                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
