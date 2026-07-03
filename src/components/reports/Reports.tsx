import { useState, useMemo } from 'react'
import {
    ArrowLeft, RefreshCw, AlertCircle, Timer, CheckCircle2,
    Gauge as GaugeIcon, Activity, Layers, AppWindow, Repeat, Zap
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

const C = {
    focus: 'var(--focus)',
    well: 'var(--wellbeing)',
    break: 'var(--break)',
    violet: '#8b5cf6',
    error: 'var(--error)',
    ink: 'var(--text-tertiary)',
}

/* ─── Primitives ────────────────────────────────────────────── */

function Skeleton({ h = 'h-20' }: { h?: string }) {
    return <div className={`animate-pulse bg-[var(--bg-hover)] rounded-[var(--radius-tile)] ${h}`} />
}

function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="text-xs text-[var(--text-muted)] max-w-[200px]">{msg}</p>
        </div>
    )
}

// Bento card with icon + title header
function Card({
    title, icon: Icon, accent = 'var(--text-secondary)', hint, className, children,
}: {
    title: string; icon: any; accent?: string; hint?: string; className?: string; children: React.ReactNode
}) {
    return (
        <section className={`flex flex-col rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-6 ${className || ''}`}>
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
        </section>
    )
}

// Headline stat used in the top strip
function Stat({ label, value, sub, accent, icon: Icon }: {
    label: string; value: string; sub?: string; accent: string; icon: any
}) {
    return (
        <div className="rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-5">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}>
                    <Icon className="w-4 h-4" />
                </span>
            </div>
            <p className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-[var(--text-primary)]">{value}</p>
            {sub && <p className="text-[11px] text-[var(--text-tertiary)] mt-2">{sub}</p>}
        </div>
    )
}

// Horizontal labelled bar
function Bar({ value, max, color = 'var(--accent-primary)', label, sub }: {
    value: number; max: number; color?: string; label: string; sub?: string
}) {
    return (
        <div>
            <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-[var(--text-secondary)] font-medium truncate pr-2">{label}</span>
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

// Ring gauge
function Gauge({ score, size = 92, color = 'var(--focus)' }: { score: number; size?: number; color?: string }) {
    const r = (size / 2) - 9
    const circ = 2 * Math.PI * r
    const dash = circ * (score / 100)
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth="8" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth="8"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                fill="var(--text-primary)" fontSize={size * 0.26} fontWeight="700" className="tabular-nums">{score}</text>
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
    const maxTaskComp = useMemo(() => Math.max(1, total), [total])
    const maxWsFocus = useMemo(() => Math.max(1, ...workspaceStats.map((w: any) => w.focusSeconds ?? 0)), [workspaceStats])

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar select-none pb-24">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10 space-y-5">

                {/* ── Header ── */}
                <header className="flex flex-wrap items-end justify-between gap-4 mb-1">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)}
                            className="w-9 h-9 rounded-full hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors">
                            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Performance report</p>
                            <h1 className="text-[30px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">Analytics</h1>
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
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} h="h-28" />)}</div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} h="h-64" />)}</div>
                    </div>
                ) : (
                    <>
                        {/* ══ HEADLINE STATS ══════════════════════════════════ */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Stat label="Deep Work" accent={C.focus} icon={Timer}
                                value={`${deepWorkTotals.hours}h`} sub={`${deepWorkTotals.blocks} deep blocks (≥25m)`} />
                            <Stat label="Focus Quality" accent={C.well} icon={GaugeIcon}
                                value={`${productivityScore.score}%`} sub="focus + work apps" />
                            <Stat label="Tasks Done" accent={C.violet} icon={CheckCircle2}
                                value={`${completed}/${total}`} sub={`${completionRate}% completion`} />
                            {hasAppData ? (
                                <Stat label="Distraction" accent={C.error} icon={Zap}
                                    value={`${distractionDuringFocus.pct}%`} sub="of focus time" />
                            ) : (
                                <Stat label="Avg Session" accent={C.break} icon={Zap}
                                    value={fmt(focusSummary?.avgSeconds ?? 0)} sub={sessions > 0 ? `across ${sessions}` : 'No sessions'} />
                            )}
                        </div>

                        {/* ══ BENTO GRID ══════════════════════════════════════ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                            {/* Focus trend */}
                            <Card title="Focus & Deep Work" icon={Activity} accent={C.focus}
                                hint={`7d avg ${movingAvg[movingAvg.length - 1] ?? 0}m`} className="lg:col-span-2">
                                <FocusTrendChart data={focusTrend} />
                                <div className="flex gap-4 mt-3 text-[11px] text-[var(--text-muted)]">
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--focus)' }} />Focus minutes</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.violet }} />Deep work</span>
                                </div>
                            </Card>

                            {/* Peak productivity hours */}
                            <Card title="Peak Productivity Hours" icon={Activity} accent={C.focus}
                                hint="by focus time">
                                <PeakHoursChart bins={peakHourBins} />
                            </Card>

                            {/* Task <-> focus linkage */}
                            <Card title="Tasks Powered by Focus" icon={CheckCircle2} accent={C.well}
                                hint={`${focusLinkage.linkedPct}% of done tasks`}>
                                <div className="flex items-center gap-5 mb-4">
                                    <Gauge score={focusLinkage.linkedPct} color={C.well} />
                                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed flex-1">
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

                            {/* Productivity score */}
                            <Card title="Productivity Score" icon={GaugeIcon} accent={C.violet}>
                                <div className="flex items-center gap-5">
                                    <Gauge score={productivityScore.score} color={C.violet} />
                                    <div className="flex-1 space-y-3 min-w-0">
                                        <Bar value={productivityScore.focusSeconds} max={productivityScore.totalActiveSeconds}
                                            color={C.focus} label="Focus time" sub={fmt(productivityScore.focusSeconds)} />
                                        <Bar value={productivityScore.productiveAppSeconds} max={productivityScore.totalActiveSeconds}
                                            color={C.violet} label="Productive apps" sub={fmt(productivityScore.productiveAppSeconds)} />
                                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">Score = (focus + work apps) ÷ total active time.</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Task breakdown */}
                            <Card title="Task Breakdown" icon={CheckCircle2} accent={C.well}
                                hint={`${completionRate}% done`}>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Completed', v: completed, color: C.well },
                                        { label: 'In Progress', v: taskReport.inProgress, color: C.break },
                                        { label: 'Todo', v: taskReport.todo, color: C.ink },
                                    ].map(({ label, v, color }) => (
                                        <Bar key={label} label={label} value={v} max={maxTaskComp} color={color} sub={String(v)} />
                                    ))}
                                </div>
                            </Card>

                            {/* Estimation accuracy */}
                            <Card title="Estimation Accuracy" icon={GaugeIcon} accent={C.focus}>
                                {overallAccuracy === null ? (
                                    <EmptyState msg="Complete tasks with time estimates to see how accurate they were" />
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-default)]">
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
                                <Card title="Workspace Productivity" icon={Layers} accent={C.violet}>
                                    <div className="space-y-3.5">
                                        {workspaceStats.map((ws: any) => (
                                            <div key={ws.workspaceId}>
                                                <div className="flex justify-between text-[11px] mb-1.5">
                                                    <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium truncate pr-2">
                                                        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                                                            style={{ backgroundColor: ws.workspaceColor || C.focus }} />
                                                        {ws.workspaceName}
                                                    </span>
                                                    <span className="text-[var(--text-muted)] tabular-nums shrink-0">{ws.completedCount}/{ws.taskCount} · {fmt(ws.focusSeconds ?? 0)}</span>
                                                </div>
                                                <div className="h-2 bg-[var(--track)] rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full"
                                                        style={{ width: `${pct(ws.focusSeconds ?? 0, maxWsFocus)}%`, backgroundColor: ws.workspaceColor || C.focus }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {hasAppData && (
                                <>
                                    {/* Top apps */}
                                    <Card title="Top Apps" icon={AppWindow} accent={C.break} hint="active time">
                                        {topApps.length === 0
                                            ? <EmptyState msg="Screen time is tracked while the app is running" />
                                            : <div className="space-y-3">
                                                {topApps.slice(0, 6).map((app, i) => (
                                                    <Bar key={i} label={app.appName} value={app.activeSeconds}
                                                        max={topApps[0]?.activeSeconds ?? 1} color={C.break}
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
                                                            <span className="text-[11px] font-semibold tabular-nums flex-shrink-0 w-6 text-right" style={{ color: col }}>{d.sessionCount}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        }
                                    </Card>
                                </>
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

                            {hasAppData && (
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
                            )}

                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
