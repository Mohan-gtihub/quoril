import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import {
    ArrowLeft, ChevronDown, ChevronUp,
    RefreshCw, AlertCircle
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useReportsData, getLast7DaysRange } from './hooks/useReportsData'
import { INTERRUPT_PENALTY_SECONDS } from './hooks/useFocusReport'
import { DateRangePicker, type DateRange } from './components/ReportsDatePicker'

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

/* ─── Primitive components ──────────────────────────────────── */

function Skeleton({ h = 'h-20' }: { h?: string }) {
    return <div className={`animate-pulse bg-[var(--bg-hover)] rounded-[var(--radius-card)] ${h}`} />
}

function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="flex flex-col items-center gap-2 py-10">
            <p className="text-xs text-[var(--text-muted)]">{msg}</p>
        </div>
    )
}

// ── KPI Card ─────────────────────────────────────────────────

function Kpi({
    label, value, sub, color = 'default'
}: {
    label: string; value: string; sub?: string
    color?: 'default' | 'blue' | 'emerald' | 'purple' | 'amber' | 'red'
}) {
    const text = {
        default: 'text-[var(--text-primary)]',
        blue: 'text-[var(--text-primary)]',
        emerald: 'text-[var(--text-primary)]',
        purple: 'text-[var(--text-primary)]',
        amber: 'text-[var(--warning)]',
        red: 'text-[var(--error)]',
    }[color]
    return (
        <div className="rounded-[var(--radius-card)] p-5 bg-[var(--bg-secondary)]">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">{label}</p>
            <p className={`text-2xl font-semibold leading-tight tracking-tight tabular-nums ${text}`}>{value}</p>
            {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1">{sub}</p>}
        </div>
    )
}

// ── Collapsible Section ───────────────────────────────────────

function Section({
    title, children, defaultOpen = true
}: {
    title: string
    children: React.ReactNode; defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="rounded-[var(--radius-card)] overflow-hidden bg-[var(--bg-card)] border border-[var(--border-default)]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 px-6 py-5 hover:bg-[var(--bg-hover)] transition-colors"
            >
                <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] text-left flex-1">{title}</span>
                <span className="text-[var(--text-muted)]">
                    {open
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                </span>
            </button>
            {open && (
                <div className="px-6 pb-6 space-y-5">
                    <div className="space-y-5">{children}</div>
                </div>
            )}
        </div>
    )
}

// ── Horizontal bar ────────────────────────────────────────────

function Bar({ value, max, color = 'var(--accent-primary)', label, sub }: {
    value: number; max: number; color?: string; label: string; sub?: string
}) {
    return (
        <div>
            <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-[var(--text-secondary)] font-medium">{label}</span>
                {sub && <span className="text-[var(--text-muted)] tabular-nums">{sub}</span>}
            </div>
            <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct(value, max)}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ backgroundColor: color }} />
            </div>
        </div>
    )
}

// ── Day bar chart ────────────────────────────────────────────

function DayBars({ points, max, color = 'var(--accent-primary)', days }: {
    points: number[]; max: number; color?: string; days: string[]
}) {
    if (max === 0) return <EmptyState msg="No data yet for this range" />
    const peakIdx = points.indexOf(Math.max(...points))
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-end gap-1.5 h-24">
                {points.map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end relative group" title={`${format(parseISO(days[i]), 'EEE MMM d')}: ${v}`}>
                        {/* Peak label */}
                        {i === peakIdx && v > 0 && (
                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[11px] font-bold whitespace-nowrap tabular-nums" style={{ color }}>
                                {v}
                            </span>
                        )}
                        <motion.div
                            className="rounded-full w-full"
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(2, pct(v, max))}%` }}
                            transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                            style={{
                                backgroundColor: v > 0 ? color : 'var(--bg-hover)',
                                minHeight: '4px',
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="flex gap-1.5">
                {days.map((d, i) => (
                    <div key={i} className="flex-1 text-center text-[11px] text-[var(--text-muted)]">
                        {format(parseISO(d), 'EEE')[0]}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Score gauge ───────────────────────────────────────────────

function Gauge({ score, size = 80 }: { score: number; size?: number }) {
    const r = (size / 2) - 8
    const circ = 2 * Math.PI * r
    const dash = circ * (score / 100)
    const color = 'var(--accent-primary)'
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth="7" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth="7"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                fill="var(--text-primary)" fontSize={size * 0.22} fontWeight="900">{score}</text>
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
    const { loading, error, focusSummary, focusReport, taskReport, appReport, workspaceStats, days } = data
    const { trendByDay, qualityByDay, movingAvg } = focusReport
    const { topApps, categoryBreakdown, productivityScore, contextByDay, avgDailySwitches, idleRatio } = appReport
    const { total, completed, completionRate, overallAccuracy, mostUnderestimated, mostOverestimated, recurringData, recurringCompletedCount } = taskReport

    /* derived */
    const todayMinutes = Math.round((focusSummary?.totalSeconds ?? 0) / 60)
    const sessions = focusSummary?.sessionCount ?? 0
    const topDistract = topApps.find(a => ['Social', 'Entertainment', 'Gaming', 'News'].includes(a.category))
    const maxFocusMin = useMemo(() => Math.max(1, ...trendByDay.map(d => d.focusMinutes)), [trendByDay])
    const maxTaskComp = useMemo(() => Math.max(1, total), [total])
    const todaySwitches = contextByDay[contextByDay.length - 1]?.sessionCount ?? 0
    const maxWsFocus = useMemo(() => Math.max(1, ...workspaceStats.map((w: any) => w.focusSeconds ?? 0)), [workspaceStats])

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar select-none pb-24">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10 space-y-5">

            {/* ── Header ── */}
            <header className="flex flex-wrap items-end justify-between gap-4 mb-3">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors">
                        <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">Performance report</p>
                        <h1 className="text-[30px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">Analytics</h1>
                    </div>
                </div>
                <DateRangePicker value={range} onChange={setRange} />
            </header>

                {/* Error banner */}
                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)] bg-[var(--bg-card)] border border-[var(--border-default)]">
                        <AlertCircle className="w-4 h-4 text-[var(--error)] flex-shrink-0" />
                        <p className="text-xs text-[var(--text-secondary)] flex-1">{error}</p>
                        <button onClick={() => setRetryKey(k => k + 1)} className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} h="h-20" />)}</div>
                        <Skeleton h="h-48" />
                        <Skeleton h="h-40" />
                    </div>
                ) : (
                    <>
                        {/* ══ 1. DAILY SNAPSHOT ═══════════════════════════════ */}
                        <div className="rounded-[var(--radius-card)] bg-[var(--bg-card)] border border-[var(--border-default)] p-6">
                            <p className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] mb-5">
                                Daily Snapshot
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <Kpi label="Focus Time" value={fmt(focusSummary?.totalSeconds ?? 0)} sub={`${todayMinutes}m · ${sessions} sessions`} color="blue" />
                                <Kpi label="Tasks Done" value={`${completed}/${total}`} sub={`${completionRate}% rate`} color="emerald" />
                                <Kpi label="Productivity" value={`${productivityScore.score}%`} sub="focus + work apps" color="purple" />
                                <Kpi label="Avg Session" value={fmt(focusSummary?.avgSeconds ?? 0)} sub={sessions > 0 ? `${sessions} total` : 'No sessions'} color="default" />
                                <Kpi label="App Switches" value={String(todaySwitches)} sub={todaySwitches <= 20 ? 'Deep work' : todaySwitches <= 60 ? 'Balanced' : 'Scattered'} color={todaySwitches > 60 ? 'red' : todaySwitches > 20 ? 'amber' : 'emerald'} />
                                <Kpi label="Top Distraction" value={topDistract?.appName ?? '—'} sub={topDistract ? fmt(topDistract.activeSeconds) : 'None found'} color={topDistract ? 'amber' : 'default'} />
                            </div>
                        </div>

                        {/* ══ 2. PERFORMANCE TRENDS ════════════════════════════ */}
                        <Section title="Performance Trends">
                            {/* Focus trend */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Focus minutes / day</p>
                                    <p className="text-[11px] text-[var(--text-muted)]">7d avg: {movingAvg[movingAvg.length - 1]}m</p>
                                </div>
                                <DayBars points={trendByDay.map(d => d.focusMinutes)} max={maxFocusMin} color="var(--accent-primary)" days={days} />
                            </div>

                            {/* Focus quality trend */}
                            <div>
                                <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
                                    Focus quality / day
                                    <span className="ml-1 text-[var(--text-muted)] normal-case">(penalty: {INTERRUPT_PENALTY_SECONDS}s/interruption)</span>
                                </p>
                                <DayBars points={qualityByDay.map(d => d.qualityScore)} max={100} color="var(--text-muted)" days={days} />
                            </div>

                            {/* Productivity score */}
                            <div className="flex items-center gap-5 pt-1">
                                <Gauge score={productivityScore.score} />
                                <div className="flex-1 space-y-2.5">
                                    <Bar value={productivityScore.focusSeconds} max={productivityScore.totalActiveSeconds}
                                        color="var(--accent-primary)" label="Focus time" sub={fmt(productivityScore.focusSeconds)} />
                                    <Bar value={productivityScore.productiveAppSeconds} max={productivityScore.totalActiveSeconds}
                                        color="var(--text-muted)" label="Productive apps" sub={fmt(productivityScore.productiveAppSeconds)} />
                                    <p className="text-[11px] text-[var(--text-muted)]">score = (focus + work apps) / total active</p>
                                </div>
                            </div>
                        </Section>

                        {/* ══ 3. WORK EXECUTION ════════════════════════════════ */}
                        <Section title="Work Execution">
                            {/* Completion breakdown */}
                            <div className="space-y-2.5">
                                <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Task Breakdown</p>
                                {[
                                    { label: 'Completed', v: completed, color: 'var(--accent-primary)' },
                                    { label: 'In Progress', v: taskReport.inProgress, color: 'var(--text-muted)' },
                                    { label: 'Todo', v: taskReport.todo, color: 'var(--bg-hover)' },
                                ].map(({ label, v, color }) => (
                                    <Bar key={label} label={label} value={v} max={maxTaskComp} color={color} sub={String(v)} />
                                ))}
                            </div>

                            {/* Estimation accuracy */}
                            {overallAccuracy !== null && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4 py-2">
                                        <Gauge score={Math.min(100, overallAccuracy)} size={72} />
                                        <div>
                                            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Estimation Accuracy</p>
                                            <p className="text-lg font-semibold text-[var(--text-primary)]">{overallAccuracy}%</p>
                                            <p className="text-[11px] text-[var(--text-muted)]">100% = perfect estimate</p>
                                        </div>
                                    </div>
                                    {mostUnderestimated.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Most Underestimated</p>
                                            {mostUnderestimated.slice(0, 3).map(t => (
                                                <div key={t.id} className="flex justify-between text-[11px] py-1.5 border-b border-[var(--border-default)]/60 last:border-0">
                                                    <span className="text-[var(--text-secondary)] truncate max-w-[60%]">{t.title}</span>
                                                    <span className="text-[var(--error)] font-medium tabular-nums">{t.estimatedMin}m est → {t.actualMin}m actual</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {mostOverestimated.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Most Overestimated</p>
                                            {mostOverestimated.slice(0, 3).map(t => (
                                                <div key={t.id} className="flex justify-between text-[11px] py-1.5 border-b border-[var(--border-default)]/60 last:border-0">
                                                    <span className="text-[var(--text-secondary)] truncate max-w-[60%]">{t.title}</span>
                                                    <span className="text-[var(--warning)] font-medium tabular-nums">{t.estimatedMin}m est → {t.actualMin}m actual</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {overallAccuracy === null && (
                                <EmptyState msg="Complete tasks with estimates to see accuracy" />
                            )}

                            {/* Workspace breakdown */}
                            {workspaceStats.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">Workspace Productivity</p>
                                    <div className="space-y-3">
                                        {workspaceStats.map((ws: any) => (
                                            <div key={ws.workspaceId}>
                                                <div className="flex justify-between text-[11px] mb-1">
                                                    <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                                                            style={{ backgroundColor: ws.workspaceColor || 'var(--accent-primary)' }} />
                                                        {ws.workspaceName}
                                                    </span>
                                                    <span className="text-[var(--text-muted)]">{ws.completedCount}/{ws.taskCount} · {fmt(ws.focusSeconds ?? 0)}</span>
                                                </div>
                                                <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full"
                                                        style={{ width: `${pct(ws.focusSeconds ?? 0, maxWsFocus)}%`, backgroundColor: ws.workspaceColor || 'var(--accent-primary)' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Section>

                        {/* ══ 4. ATTENTION & BEHAVIOR ═══════════════════════════ */}
                        <Section title="Attention & Behavior">
                            {/* Idle ratio */}
                            <div className="grid grid-cols-2 gap-3">
                                <Kpi label="Active Ratio" value={`${100 - idleRatio}%`} color="emerald" />
                                <Kpi label="Idle Ratio" value={`${idleRatio}%`} color={idleRatio > 40 ? 'red' : 'default'} />
                            </div>

                            {/* Top apps */}
                            <div>
                                <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">Top Apps — Active Time</p>
                                {topApps.length === 0
                                    ? <EmptyState msg="Screen time is tracked while the app is running" />
                                    : <div className="space-y-2.5">
                                        {topApps.slice(0, 8).map((app, i) => (
                                            <Bar key={i} label={app.appName} value={app.activeSeconds}
                                                max={topApps[0]?.activeSeconds ?? 1} color="var(--accent-primary)"
                                                sub={`${app.category} · ${fmt(app.activeSeconds)}`} />
                                        ))}
                                    </div>
                                }
                            </div>

                            {/* Category breakdown */}
                            {categoryBreakdown.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">By Category</p>
                                    <div className="space-y-2">
                                        {categoryBreakdown.map(c => (
                                            <Bar key={c.category} label={c.category} value={c.seconds}
                                                max={categoryBreakdown[0]?.seconds ?? 1} color="var(--text-muted)" sub={fmt(c.seconds)} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Context switching per day */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Context Switches / Day</p>
                                    <p className="text-[11px] text-[var(--text-muted)]">avg: {avgDailySwitches}/day</p>
                                </div>
                                {contextByDay.length === 0
                                    ? <EmptyState msg="App tracking records context switches automatically" />
                                    : <div className="space-y-1.5">
                                        {contextByDay.map(d => (
                                            <div key={d.day} className="flex items-center gap-2">
                                                <span className="text-[11px] text-[var(--text-muted)] w-16 flex-shrink-0">{d.day}</span>
                                                <div className="flex-1 h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${pct(d.sessionCount, Math.max(...contextByDay.map(x => x.sessionCount)) || 1)}%`,
                                                            backgroundColor: d.label === 'Deep Work' ? 'var(--accent-primary)' : d.label === 'Balanced' ? 'var(--warning)' : 'var(--error)'
                                                        }} />
                                                </div>
                                                <span className={`text-[11px] font-semibold tabular-nums flex-shrink-0 ${d.label === 'Deep Work' ? 'text-[var(--text-primary)]' : d.label === 'Balanced' ? 'text-[var(--warning)]' : 'text-[var(--error)]'}`}>
                                                    {d.sessionCount}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        </Section>

                        {/* ══ 5. HABIT CONSISTENCY ════════════════════════════ */}
                        <Section title="Habit Consistency" defaultOpen={false}>
                            <div className="grid grid-cols-2 gap-3">
                                <Kpi label="Recurring Tasks" value={String(recurringData.length)} />
                                <Kpi label="Done Today" value={String(recurringCompletedCount)} color={recurringCompletedCount > 0 ? 'emerald' : 'default'} />
                            </div>
                            {recurringData.length === 0
                                ? <EmptyState msg="Mark tasks as recurring to track habit consistency" />
                                : <div className="-mx-2">
                                    {recurringData.map(r => (
                                        <div key={r.id} className="flex items-center gap-3 px-2 py-2 rounded-[var(--radius-tile)] hover:bg-[var(--bg-hover)] transition-colors">
                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.isCompleted ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-hover)]'}`} />
                                            <span className="text-sm text-[var(--text-secondary)] flex-1 truncate">{r.title}</span>
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.isCompleted ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                                                {r.isCompleted ? '✓ Done' : 'Pending'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            }
                        </Section>
                    </>
                )}
            </div>
        </div>
    )
}
