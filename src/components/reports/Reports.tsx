import { useState, useMemo } from 'react'
import {
    ArrowLeft, RefreshCw, AlertCircle, CheckCircle2,
    Gauge as GaugeIcon, Activity, Layers, AppWindow, Repeat, Zap, Clock
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useReportsData, getLast7DaysRange } from './hooks/useReportsData'
import { DateRangePicker, type DateRange } from './components/ReportsDatePicker'
import { FocusTrendChart } from './components/charts/FocusTrendChart'
import { PeakHoursChart } from './components/charts/PeakHoursChart'

/* ─── Helpers ───────────────────────────────────────────────── */

function fmt(sec: number) {
    if (!sec) return '0m'
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function pct(v: number, max: number) {
    return max > 0 ? Math.min(100, Math.round((v / max) * 100)) : 0
}

// Focus-blue leads; the rest are semantic (meaning-driven), used sparingly.
const C = {
    focus: 'var(--focus)',      // primary — focus, deep work, peaks
    well: 'var(--wellbeing)',   // completion / healthy
    break: 'var(--break)',      // warnings / in-progress
    error: 'var(--error)',      // distraction / scattered / idle
    ink: 'var(--text-tertiary)',
}

/* ─── Primitives ────────────────────────────────────────────── */

function Skeleton({ h = 'h-20', className = '' }: { h?: string; className?: string }) {
    return <div className={`animate-pulse bg-[var(--bg-hover)] rounded-[var(--radius-tile)] ${h} ${className}`} />
}

function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-xs text-[var(--text-muted)] max-w-[220px] leading-relaxed">{msg}</p>
        </div>
    )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{children}</p>
}

// Section header inside the grid — separates personal metrics from screen activity.
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="lg:col-span-2 flex items-center gap-3 pt-4 pb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{children}</span>
            <span className="flex-1 h-px bg-[var(--border-default)]" />
        </div>
    )
}

// Bento card with icon + title header, gentle mount animation.
function Card({
    title, icon: Icon, accent = 'var(--text-secondary)', hint, className, children,
}: {
    title: string; icon: any; accent?: string; hint?: string; className?: string; children: React.ReactNode
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`flex flex-col rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-6 ${className || ''}`}
        >
            <div className="flex items-center gap-2.5 mb-5">
                <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
                >
                    <Icon className="w-4 h-4" />
                </span>
                <h2 className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)] flex-1">{title}</h2>
                {hint && <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{hint}</span>}
            </div>
            <div className="flex-1">{children}</div>
        </motion.section>
    )
}

// Compact stat in the hero rail.
function HeroStat({ label, value, sub, accent }: {
    label: string; value: string; sub?: string; accent: string
}) {
    return (
        <div className="p-5 flex flex-col justify-center min-w-0">
            <Eyebrow>{label}</Eyebrow>
            <p className="text-[24px] font-semibold tabular-nums leading-none mt-2.5 tracking-tight" style={{ color: accent }}>{value}</p>
            {sub && <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 truncate">{sub}</p>}
        </div>
    )
}

// Tiny inline area sparkline for the hero.
function Sparkline({ points, color = 'var(--focus)', height = 46 }: { points: number[]; color?: string; height?: number }) {
    if (points.length === 0 || points.every(p => p === 0)) {
        return <div style={{ height }} className="flex items-center text-[11px] text-[var(--text-muted)]">No focus sessions in this range</div>
    }
    const max = Math.max(1, ...points)
    const n = points.length
    const w = 100
    const step = n > 1 ? w / (n - 1) : 0
    const y = (v: number) => height - (v / max) * (height - 6) - 3
    const coords = points.map((v, i) => [n > 1 ? i * step : 0, y(v)] as const)
    const line = coords.map(([x, yy], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`).join(' ')
    const area = `${line} L${w},${height} L0,${height} Z`
    return (
        <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full block" style={{ height }}>
            <defs>
                <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={area} fill="url(#heroSpark)" />
            <motion.path d={line} fill="none" stroke={color} strokeWidth={2}
                vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
        </svg>
    )
}

// Horizontal labelled bar.
function Bar({ value, max, color = 'var(--accent-primary)', label, sub, dot }: {
    value: number; max: number; color?: string; label: string; sub?: string; dot?: string
}) {
    return (
        <div>
            <div className="flex justify-between text-[11px] mb-1.5 gap-2">
                <span className="text-[var(--text-secondary)] font-medium truncate pr-2 flex items-center gap-1.5 min-w-0">
                    {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />}
                    <span className="truncate">{label}</span>
                </span>
                {sub && <span className="text-[var(--text-muted)] tabular-nums shrink-0">{sub}</span>}
            </div>
            <div className="h-2 bg-[var(--track)] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct(value, max)}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ backgroundColor: color }} />
            </div>
        </div>
    )
}

// Single stacked bar (used for the task status breakdown).
function SegBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
    const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0))
    return (
        <div>
            <div className="flex h-3.5 rounded-full overflow-hidden bg-[var(--track)]">
                {segments.map(s => s.value > 0 && (
                    <motion.div key={s.label}
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.value / total) * 100}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{ background: s.color }} />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5 mt-4">
                {segments.map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                        <span className="text-[12px] text-[var(--text-secondary)]">{s.label}</span>
                        <span className="text-[12px] font-semibold tabular-nums text-[var(--text-primary)]">{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Ring gauge with animated draw + subtle glow.
function Gauge({ score, size = 96, color = 'var(--focus)' }: { score: number; size?: number; color?: string }) {
    const stroke = 9
    const r = (size / 2) - stroke
    const circ = 2 * Math.PI * r
    const dash = circ * Math.max(0, Math.min(100, score)) / 100
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0"
            style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 30%, transparent))` }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
            <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                initial={{ strokeDasharray: `0 ${circ}` }}
                animate={{ strokeDasharray: `${dash} ${circ}` }}
                transition={{ duration: 0.9, ease: 'easeOut' }} />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                fill="var(--text-primary)" fontSize={size * 0.28} fontWeight="700" className="tabular-nums">{score}</text>
        </svg>
    )
}

/* ════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════ */

export function Reports() {
    const navigate = useNavigate()
    const [range, setRange] = useState<DateRange>(getLast7DaysRange)
    const [retryKey, setRetryKey] = useState(0)
    const data = useReportsData(range, retryKey)
    const { loading, error, focusSummary, focusReport, taskReport, appReport, workspaceStats, hasAppData } = data
    const { movingAvg, deepWorkTotals, peakHourBins, focusTrend } = focusReport
    const { topApps, categoryBreakdown, productivityScore, contextByDay, avgDailySwitches, idleRatio, distractionDuringFocus } = appReport
    const { total, completed, completionRate, overallAccuracy, mostUnderestimated, mostOverestimated, recurringData, recurringCompletedCount, focusLinkage, plannedToday } = taskReport

    /* derived */
    const sessions = focusSummary?.sessionCount ?? 0
    const topDistract = topApps.find(a => ['Social', 'Entertainment', 'Gaming', 'News'].includes(a.category))
    const maxWsFocus = useMemo(() => Math.max(1, ...workspaceStats.map((w: any) => w.focusSeconds ?? 0)), [workspaceStats])
    const avg7 = movingAvg[movingAvg.length - 1] ?? 0

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
                            <Eyebrow>Performance</Eyebrow>
                            <h1 className="text-[32px] leading-none font-semibold tracking-tight text-[var(--text-primary)] mt-1.5">Analytics</h1>
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
                        <Skeleton h="h-44" />
                        <Skeleton h="h-64" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} h="h-56" />)}</div>
                    </div>
                ) : (
                    <>
                        {/* ══ HERO ════════════════════════════════════════════ */}
                        <motion.section
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}
                            className="rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] overflow-hidden">
                            <div className="grid lg:grid-cols-[1.15fr_1fr]">
                                {/* Deep work headline */}
                                <div className="relative p-7 md:p-8 overflow-hidden">
                                    <div className="pointer-events-none absolute -top-20 -left-16 w-64 h-64 rounded-full"
                                        style={{ background: 'var(--focus-glow)', filter: 'blur(64px)', opacity: 0.45 }} />
                                    <div className="relative">
                                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                            <Clock className="w-3.5 h-3.5" />
                                            <Eyebrow>Deep work · {range.label}</Eyebrow>
                                        </div>
                                        <div className="flex items-end gap-1.5 mt-3">
                                            <span className="text-[56px] leading-[0.85] font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">{deepWorkTotals.hours}</span>
                                            <span className="text-[24px] font-semibold text-[var(--text-tertiary)] mb-1">h</span>
                                        </div>
                                        <p className="text-[12px] text-[var(--text-tertiary)] mt-3">
                                            {deepWorkTotals.blocks} deep {deepWorkTotals.blocks === 1 ? 'block' : 'blocks'} (≥25m) · 7-day avg {avg7}m/day
                                        </p>
                                        <div className="mt-6">
                                            <Sparkline points={focusTrend.map(d => d.focusMinutes)} />
                                        </div>
                                    </div>
                                </div>
                                {/* Stat rail */}
                                <div className="grid grid-cols-3 border-t lg:border-t-0 lg:border-l border-[var(--border-default)] bg-[var(--bg-secondary)] divide-x divide-[var(--border-default)]">
                                    <HeroStat label="Focus quality" accent={C.well}
                                        value={`${productivityScore.score}%`} sub="focus + work apps" />
                                    <HeroStat label="Tasks done" accent={C.focus}
                                        value={`${completed}/${total}`} sub={`${completionRate}% completed`} />
                                    {hasAppData ? (
                                        <HeroStat label="Distraction" accent={distractionDuringFocus.pct > 20 ? C.error : C.break}
                                            value={`${distractionDuringFocus.pct}%`} sub="of focus time" />
                                    ) : (
                                        <HeroStat label="Avg session" accent={C.break}
                                            value={fmt(focusSummary?.avgSeconds ?? 0)} sub={sessions > 0 ? `${sessions} sessions` : 'No sessions'} />
                                    )}
                                </div>
                            </div>
                        </motion.section>

                        {/* ══ FOCUS TREND (anchor) ════════════════════════════ */}
                        <Card title="Focus & Deep Work" icon={Activity} accent={C.focus}
                            hint={`7d avg ${avg7}m`}>
                            <FocusTrendChart data={focusTrend} />
                            <div className="flex gap-4 mt-3 text-[11px] text-[var(--text-muted)]">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.focus }} />Focus minutes</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.well }} />Deep work</span>
                            </div>
                        </Card>

                        {/* ══ BENTO GRID ══════════════════════════════════════ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                            {/* Peak productivity hours */}
                            <Card title="Peak Productivity Hours" icon={Activity} accent={C.focus}
                                hint="by focus time">
                                <PeakHoursChart bins={peakHourBins} />
                            </Card>

                            {/* Task <-> focus linkage */}
                            <Card title="Tasks Powered by Focus" icon={CheckCircle2} accent={C.well}
                                hint={`${focusLinkage.linkedPct}% of done tasks`}>
                                <div className="flex items-center gap-5 mb-5">
                                    <Gauge score={focusLinkage.linkedPct} color={C.well} />
                                    <p className="text-[12px] text-[var(--text-muted)] leading-relaxed flex-1">
                                        Share of completed tasks that had at least one tracked focus session.
                                    </p>
                                </div>
                                {focusLinkage.topTasks.length === 0
                                    ? <EmptyState msg="Start a focus session on a task to see it here" />
                                    : <div className="space-y-3">
                                        {focusLinkage.topTasks.map(t => (
                                            <Bar key={t.taskId} label={t.title}
                                                value={t.focusSeconds}
                                                max={focusLinkage.topTasks[0].focusSeconds || 1}
                                                color={C.well} sub={fmt(t.focusSeconds)} />
                                        ))}
                                    </div>
                                }
                            </Card>

                            {/* Task breakdown — single stacked bar */}
                            <Card title="Task Breakdown" icon={CheckCircle2} accent={C.focus}
                                hint={`${completionRate}% done`}>
                                <SegBar segments={[
                                    { label: 'Completed', value: completed, color: C.well },
                                    { label: 'In progress', value: taskReport.inProgress, color: C.break },
                                    { label: 'Todo', value: taskReport.todo, color: C.ink },
                                ]} />
                            </Card>

                            {/* Productivity score */}
                            <Card title="Productivity Score" icon={GaugeIcon} accent={C.focus}>
                                <div className="flex items-center gap-5">
                                    <Gauge score={productivityScore.score} color={C.focus} />
                                    <div className="flex-1 space-y-3 min-w-0">
                                        <Bar value={productivityScore.focusSeconds} max={productivityScore.totalActiveSeconds}
                                            color={C.focus} label="Focus time" sub={fmt(productivityScore.focusSeconds)} />
                                        <Bar value={productivityScore.productiveAppSeconds} max={productivityScore.totalActiveSeconds}
                                            color={C.well} label="Productive apps" sub={fmt(productivityScore.productiveAppSeconds)} />
                                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">Score = (focus + work apps) ÷ total active time.</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Estimation accuracy */}
                            <Card title="Estimation Accuracy" icon={GaugeIcon} accent={C.focus}>
                                {overallAccuracy === null ? (
                                    <EmptyState msg="Complete tasks with time estimates to see how accurate they were" />
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                                            <span className="text-[11px] text-[var(--text-muted)]">Due today — completed</span>
                                            <span className="text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">
                                                {plannedToday.completedOfDue}/{plannedToday.dueToday}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            <Gauge score={Math.min(100, overallAccuracy)} size={84} color={C.focus} />
                                            <div>
                                                <p className="text-2xl font-semibold text-[var(--text-primary)] tabular-nums leading-none">{overallAccuracy}%</p>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">100% = perfect estimate</p>
                                            </div>
                                        </div>
                                        {mostUnderestimated.length > 0 && (
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Most underestimated</p>
                                                {mostUnderestimated.slice(0, 3).map(t => (
                                                    <div key={t.id} className="flex justify-between gap-2 text-[11px] py-1.5 border-b border-[var(--border-default)] last:border-0">
                                                        <span className="text-[var(--text-secondary)] truncate">{t.title}</span>
                                                        <span className="text-[var(--error)] font-medium tabular-nums shrink-0">{t.estimatedMin}m → {t.actualMin}m</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {mostOverestimated.length > 0 && (
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Most overestimated</p>
                                                {mostOverestimated.slice(0, 3).map(t => (
                                                    <div key={t.id} className="flex justify-between gap-2 text-[11px] py-1.5 border-b border-[var(--border-default)] last:border-0">
                                                        <span className="text-[var(--text-secondary)] truncate">{t.title}</span>
                                                        <span className="text-[var(--break)] font-medium tabular-nums shrink-0">{t.estimatedMin}m → {t.actualMin}m</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>

                            {/* Workspace productivity */}
                            {workspaceStats.length > 0 && (
                                <Card title="Workspace Productivity" icon={Layers} accent={C.focus}>
                                    <div className="space-y-3.5">
                                        {workspaceStats.map((ws: any) => (
                                            <Bar key={ws.workspaceId}
                                                label={ws.workspaceName}
                                                dot={ws.workspaceColor || C.focus}
                                                value={ws.focusSeconds ?? 0} max={maxWsFocus}
                                                color={ws.workspaceColor || C.focus}
                                                sub={`${ws.completedCount}/${ws.taskCount} · ${fmt(ws.focusSeconds ?? 0)}`} />
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Habit consistency */}
                            <Card title="Habit Consistency" icon={Repeat} accent={C.well}
                                hint={`${recurringCompletedCount}/${recurringData.length} today`}>
                                {recurringData.length === 0
                                    ? <EmptyState msg="Mark tasks as recurring to track habit consistency" />
                                    : <div className="space-y-1">
                                        {recurringData.map(r => (
                                            <div key={r.id} className="flex items-center gap-3 px-2.5 py-2 rounded-[var(--radius-card)] hover:bg-[var(--bg-hover)] transition-colors">
                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                    style={{ background: r.isCompleted ? C.well : 'var(--track)' }} />
                                                <span className="text-[13px] text-[var(--text-secondary)] flex-1 truncate">{r.title}</span>
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                                    style={r.isCompleted
                                                        ? { background: `color-mix(in srgb, ${C.well} 16%, transparent)`, color: C.well }
                                                        : { background: 'var(--track)', color: 'var(--text-muted)' }}>
                                                    {r.isCompleted ? 'Done' : 'Pending'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </Card>

                            {/* ── Screen activity (desktop only) ── */}
                            {hasAppData && (
                                <>
                                    <SectionLabel>Screen activity</SectionLabel>

                                    {/* Top apps */}
                                    <Card title="Top Apps" icon={AppWindow} accent={C.focus} hint="active time">
                                        {topApps.length === 0
                                            ? <EmptyState msg="Screen time is tracked while the app is running" />
                                            : <div className="space-y-3">
                                                {topApps.slice(0, 6).map((app, i) => (
                                                    <Bar key={i} label={app.appName} value={app.activeSeconds}
                                                        max={topApps[0]?.activeSeconds ?? 1} color={C.focus}
                                                        sub={fmt(app.activeSeconds)} />
                                                ))}
                                            </div>
                                        }
                                    </Card>

                                    {/* Category breakdown */}
                                    {categoryBreakdown.length > 0 && (
                                        <Card title="By Category" icon={Layers} accent={C.well}>
                                            <div className="space-y-3">
                                                {categoryBreakdown.slice(0, 6).map(c => (
                                                    <Bar key={c.category} label={c.category} value={c.seconds}
                                                        max={categoryBreakdown[0]?.seconds ?? 1} color={C.well} sub={fmt(c.seconds)} />
                                                ))}
                                            </div>
                                        </Card>
                                    )}

                                    {/* Attention / context switching */}
                                    <Card title="Attention" icon={Activity} accent={C.focus}
                                        hint={`${avgDailySwitches} switches / day`}>
                                        <div className="grid grid-cols-2 gap-3 mb-5">
                                            <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5">
                                                <p className="text-[11px] text-[var(--text-muted)] mb-1">Active</p>
                                                <p className="text-xl font-semibold tabular-nums" style={{ color: C.well }}>{100 - idleRatio}%</p>
                                            </div>
                                            <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5">
                                                <p className="text-[11px] text-[var(--text-muted)] mb-1">Idle</p>
                                                <p className="text-xl font-semibold tabular-nums" style={{ color: idleRatio > 40 ? C.error : 'var(--text-primary)' }}>{idleRatio}%</p>
                                            </div>
                                        </div>
                                        {contextByDay.length === 0
                                            ? <EmptyState msg="App tracking records context switches automatically" />
                                            : <div className="space-y-2">
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Context switches / day</p>
                                                {contextByDay.map(d => {
                                                    const col = d.label === 'Deep Work' ? C.well : d.label === 'Balanced' ? C.break : C.error
                                                    return (
                                                        <div key={d.day} className="flex items-center gap-2.5">
                                                            <span className="text-[11px] text-[var(--text-muted)] w-14 flex-shrink-0 truncate">{d.day}</span>
                                                            <div className="flex-1 h-2 bg-[var(--track)] rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full transition-all"
                                                                    style={{ width: `${pct(d.sessionCount, Math.max(...contextByDay.map(x => x.sessionCount)) || 1)}%`, backgroundColor: col }} />
                                                            </div>
                                                            <span className="text-[11px] font-semibold tabular-nums flex-shrink-0 w-8 text-right" style={{ color: col }}>{d.sessionCount}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        }
                                    </Card>

                                    {/* Top distraction */}
                                    <Card title="Top Distraction" icon={Zap} accent={C.error}>
                                        {topDistract ? (
                                            <div className="flex items-center gap-4">
                                                <span className="w-12 h-12 rounded-[var(--radius-card)] flex items-center justify-center text-lg font-semibold shrink-0"
                                                    style={{ background: `color-mix(in srgb, ${C.error} 14%, transparent)`, color: C.error }}>
                                                    {topDistract.appName.charAt(0).toUpperCase()}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-base font-semibold text-[var(--text-primary)] truncate">{topDistract.appName}</p>
                                                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{topDistract.category} · {fmt(topDistract.activeSeconds)}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <EmptyState msg="No distracting app usage found in this range" />
                                        )}
                                    </Card>
                                </>
                            )}

                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
