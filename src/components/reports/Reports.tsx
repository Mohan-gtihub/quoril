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
import { DonutChart } from './components/charts/DonutChart'
import { InsightsModal } from './components/InsightsModal'
import { getPlatform } from '@/services/platform'
import { useSettingsStore } from '@/store/settingsStore'
import { buildInsightSummary, DISTRACTING } from '@/services/insights/buildSummary'

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

// Categorical palette for donut slices, matched 1:1 to the landing site's
// "By category" donut (Dev → Work → Comms → Other): focus blue, wellbeing teal,
// break amber, then the landing's neutral SLATE (#8a8a82, tuned to read on light
// *and* dark). Tail slots reuse muted slate tints so extra categories stay calm
// instead of the loud purple/red used before.
const CAT_SLATE = '#8a8a82'
const CAT_PALETTE = ['var(--focus)', 'var(--wellbeing)', 'var(--break)', CAT_SLATE, '#a8a8a0', 'var(--text-tertiary)']

// Thresholds that flip a metric from "fine" to "needs attention" (drives colour).
// Kept here so the numbers are named and consistent, not scattered magic values.
const THRESHOLDS = {
    distractionPct: 20, // >20% of focus time lost to distraction reads as red
    idlePct: 40,        // >40% idle reads as red
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

// A "good outcome" empty state — icon + headline + sub, tinted with an accent.
// Reads as an achievement (e.g. distraction-free) rather than missing data.
function EmptyWin({ icon: Icon, title, sub, accent }: {
    icon: any; title: string; sub: string; accent: string
}) {
    return (
        <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-[var(--radius-card)] flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}>
                <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
                <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{sub}</p>
            </div>
        </div>
    )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{children}</p>
}

// Section header inside the grid — separates personal metrics from screen activity.
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 pt-1 pb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{children}</span>
            <span className="flex-1 h-px bg-[var(--border-default)]" />
        </div>
    )
}

// Bento card with icon + title header, gentle mount animation.
// `center` vertically centers light content so a stretched (equal-height) card
// reads as intentional instead of leaving whitespace at the bottom.
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
            style={{ ['--card-accent' as any]: accent }}
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
            <div className={`flex-1 ${center ? 'flex flex-col justify-center' : ''}`}>{children}</div>
        </motion.section>
    )
}

// Compact stat in the hero rail. Numbers stay neutral ink — matching the rest of
// the app and the landing KPI cards — while colour rides on a small accent dot by
// the label. Keeps the rail calm instead of three loud saturated numbers.
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

// Hero mini-bars — one slim column per day, mirroring the landing "Insights"
// 7-day trend: fixed-width columns (never stretched to fill), top-rounded only,
// most-recent day at full opacity while the rest fade back. Reads cleanly with
// sparse data instead of blowing one tall day into a fat block.
function Sparkline({ points, color = 'var(--focus)', height = 56 }: { points: number[]; color?: string; height?: number }) {
    if (points.length === 0 || points.every(p => p === 0)) {
        return <div style={{ height }} className="flex items-center text-[11px] text-[var(--text-muted)]">No focus sessions in this range</div>
    }
    const max = Math.max(1, ...points)
    const last = points.length - 1
    return (
        // A grounded strip: bars sit on a hairline baseline so empty days read as
        // "no work that day" rather than floating dashes, and columns align on one
        // line — the same visual language as the Focus & Deep Work chart below.
        <div className="relative" style={{ height: height + 1 }}>
            <div className="flex items-end gap-2.5" style={{ height }}>
                {points.map((v, i) => {
                    const h = Math.max(3, (v / max) * height)
                    const isLast = i === last
                    // Landing heatmap fade: today at full strength, other days blue
                    // with opacity graduated by height so busier days read stronger.
                    const opacity = v === 0 ? 0.16 : isLast ? 1 : 0.22 + (v / max) * 0.5
                    return (
                        // flex-1 column keeps spacing even; the bar inside stays slim
                        // (max-w) so a single tall day reads as a column, not a block.
                        <div key={i} className="flex flex-1 items-end justify-center">
                            <motion.div
                                className="w-full max-w-[18px] rounded-t-[4px]"
                                style={{ background: color, opacity }}
                                initial={{ height: 3 }}
                                animate={{ height: h }}
                                transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.03 }}
                            />
                        </div>
                    )
                })}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--border-default)]" />
        </div>
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

// Ring gauge with animated draw.
function Gauge({ score, size = 96, color = 'var(--focus)', suffix }: { score: number; size?: number; color?: string; suffix?: string }) {
    const stroke = 8
    const r = (size / 2) - stroke
    const circ = 2 * Math.PI * r
    const dash = circ * Math.max(0, Math.min(100, score)) / 100
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
            <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                initial={{ strokeDasharray: `0 ${circ}` }}
                animate={{ strokeDasharray: `${dash} ${circ}` }}
                transition={{ duration: 0.9, ease: 'easeOut' }} />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                fill="var(--text-primary)" fontSize={size * 0.26} fontWeight="700" className="tabular-nums">{score}</text>
            {suffix && (
                <text x={size / 2} y={size / 2 + size * 0.20} textAnchor="middle" dominantBaseline="central"
                    fill="var(--text-muted)" fontSize={size * 0.11} fontWeight="600" className="uppercase" style={{ letterSpacing: '0.08em' }}>{suffix}</text>
            )}
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
    const [insightsOpen, setInsightsOpen] = useState(false)
    const aiInsightsEnabled = useSettingsStore(s => s.aiInsightsEnabled)
    const aiAvailable = getPlatform().capabilities.aiInsights && aiInsightsEnabled
    const data = useReportsData(range, retryKey)
    const { loading, error, focusSummary, focusReport, taskReport, appReport, workspaceStats, hasAppData } = data
    const { movingAvg, deepWorkTotals, peakHourBins, focusTrend } = focusReport
    const { topApps, categoryBreakdown, productivityScore, contextByDay, avgDailySwitches, idleRatio, distractionDuringFocus } = appReport
    const { total, completed, completionRate, overallAccuracy, mostUnderestimated, mostOverestimated, recurringData, recurringCompletedCount, focusLinkage, plannedToday } = taskReport

    /* derived */
    const sessions = focusSummary?.sessionCount ?? 0
    const topDistract = topApps.find(a => DISTRACTING.includes(a.category))
    const maxWsFocus = useMemo(() => Math.max(1, ...workspaceStats.map((w: any) => w.focusSeconds ?? 0)), [workspaceStats])
    const avg7 = movingAvg[movingAvg.length - 1] ?? 0

    // Privacy-safe aggregated summary for the AI Insights module.
    const insightSummary = useMemo(() => buildInsightSummary({
        rangeLabel: range.label,
        activeSeconds: productivityScore.totalActiveSeconds,
        deepWorkHours: deepWorkTotals.hours,
        deepWorkBlocks: deepWorkTotals.blocks,
        focusSessions: focusSummary?.sessionCount ?? 0,
        focusSeconds: focusSummary?.totalSeconds ?? 0,
        avgSessionSeconds: focusSummary?.avgSeconds ?? 0,
        contextSwitchesPerDay: avgDailySwitches,
        idlePercent: idleRatio,
        tasksCompleted: completed,
        tasksTotal: total,
        completionRate,
        focusLinkedPercent: focusLinkage.linkedPct,
        distractionDuringFocusSeconds: distractionDuringFocus.distractionSeconds,
        distractionPercent: distractionDuringFocus.pct,
        peakHours: peakHourBins,
        topCategories: categoryBreakdown.map(c => ({ name: c.category, seconds: c.seconds })),
        distractingApps: topApps.filter(a => DISTRACTING.includes(a.category)).map(a => ({ name: a.appName, seconds: a.activeSeconds })),
    }), [range.label, productivityScore, deepWorkTotals, focusSummary, avgDailySwitches, idleRatio, completed, total, completionRate, focusLinkage, distractionDuringFocus, peakHourBins, categoryBreakdown, topApps])

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
                            <h1 className="text-[32px] leading-none font-semibold tracking-tight text-[var(--text-primary)] mt-1.5">Reports</h1>
                            <p className="text-[12.5px] text-[var(--text-muted)] mt-2">Understand your focus, distractions, and work patterns.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {aiAvailable && (
                            <button
                                onClick={() => setInsightsOpen(true)}
                                title="Get suggestions based on this report"
                                className="h-9 px-3.5 rounded-[var(--radius-card)] text-[12.5px] font-semibold text-white flex items-center gap-1.5 transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] shadow-[var(--shadow-soft)]"
                                style={{ background: 'var(--focus)' }}
                            >
                                Generate Insights
                            </button>
                        )}
                        <DateRangePicker value={range} onChange={setRange} />
                    </div>
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
                                {/* Stat rail — same card surface as the headline, separated by a
                                    single hairline; stats are spaced, not boxed into a segmented control. */}
                                <div className="grid grid-cols-3 items-center gap-x-2 px-3 py-7 md:py-8 border-t lg:border-t-0 lg:border-l border-[var(--border-default)]">
                                    <HeroStat label="Focus quality" accent={C.well}
                                        value={`${productivityScore.score}%`} sub="focus + work apps" />
                                    <HeroStat label="Tasks done" accent={C.focus}
                                        value={`${completed}/${total}`} sub={`${completionRate}% completed`} />
                                    {hasAppData ? (
                                        <HeroStat label="Distraction" accent={distractionDuringFocus.pct > THRESHOLDS.distractionPct ? C.error : C.break}
                                            value={`${distractionDuringFocus.pct}%`} sub="during focus" />
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

                        {/* ══ BENTO — 2-col grid; cards stretch to equal height per row
                            (items-stretch + h-full). If the card count is odd the final
                            card spans both columns so the last row never half-empties. ══ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch [&>*:last-child:nth-child(odd)]:lg:col-span-2">

                            {/* Peak productivity hours */}
                            <Card title="Peak Productivity Hours" icon={Activity} accent={C.focus}
                                hint="by focus time" center>
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
                                hint={`${completionRate}% done`} center>
                                <SegBar segments={[
                                    { label: 'Completed', value: completed, color: C.well },
                                    { label: 'In progress', value: taskReport.inProgress, color: C.break },
                                    { label: 'Todo', value: taskReport.todo, color: C.ink },
                                ]} />
                            </Card>

                            {/* Productivity score */}
                            <Card title="Productivity Score" icon={GaugeIcon} accent={C.focus} center>
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
                            <Card title="Estimation Accuracy" icon={GaugeIcon} accent={C.break}>
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
                                            <Gauge score={Math.min(100, overallAccuracy)} size={84} color={C.break} />
                                            <div>
                                                <p className="text-2xl font-semibold text-[var(--text-primary)] tabular-nums leading-none">{overallAccuracy}%</p>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">100% = perfect estimate</p>
                                            </div>
                                        </div>
                                        {mostUnderestimated.length > 0 && (
                                            <div>
                                                <div className="mb-1.5"><Eyebrow>Most underestimated</Eyebrow></div>
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
                                                <div className="mb-1.5"><Eyebrow>Most overestimated</Eyebrow></div>
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

                        </div>

                        {/* ── Screen activity (desktop only) ── */}
                        {hasAppData && (
                            <>
                                <SectionLabel>Screen activity</SectionLabel>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch [&>*:last-child:nth-child(odd)]:lg:col-span-2">
                                    {/* Top apps — ranked, iconographic */}
                                    <Card title="Top Apps" icon={AppWindow} accent={C.focus} hint="active time">
                                        {topApps.length === 0
                                            ? <EmptyState msg="Screen time is tracked while the app is running" />
                                            : <div className="space-y-3.5">
                                                {topApps.slice(0, 6).map((app, i) => (
                                                    <div key={app.appName} className="flex items-center gap-3">
                                                        <span className="w-4 text-[11px] font-semibold tabular-nums text-[var(--text-muted)] text-right shrink-0">{i + 1}</span>
                                                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-semibold shrink-0"
                                                            style={{ background: `color-mix(in srgb, ${C.focus} 12%, transparent)`, color: C.focus }}>
                                                            {app.appName.charAt(0).toUpperCase()}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between text-[11px] mb-1 gap-2">
                                                                <span className="truncate text-[var(--text-secondary)] font-medium">{app.appName}</span>
                                                                <span className="tabular-nums text-[var(--text-muted)] shrink-0">{fmt(app.activeSeconds)}</span>
                                                            </div>
                                                            <div className="h-1.5 bg-[var(--track)] rounded-full overflow-hidden">
                                                                <motion.div className="h-full rounded-full"
                                                                    initial={{ width: 0 }} animate={{ width: `${pct(app.activeSeconds, topApps[0]?.activeSeconds ?? 1)}%` }}
                                                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                                                    style={{ background: C.focus }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        }
                                    </Card>

                                    {/* Category breakdown — donut */}
                                    {categoryBreakdown.length > 0 && (
                                        <Card title="By Category" icon={Layers} accent={C.well}>
                                            <DonutChart
                                                centerValue={fmt(categoryBreakdown.reduce((s, c) => s + c.seconds, 0))}
                                                centerSub="active"
                                                data={categoryBreakdown.slice(0, 6).map((c, i) => ({
                                                    name: c.category,
                                                    value: c.seconds,
                                                    color: CAT_PALETTE[i % CAT_PALETTE.length],
                                                    label: fmt(c.seconds),
                                                }))} />
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
                                                <p className="text-xl font-semibold tabular-nums" style={{ color: idleRatio > THRESHOLDS.idlePct ? C.error : 'var(--text-primary)' }}>{idleRatio}%</p>
                                            </div>
                                        </div>
                                        {contextByDay.length === 0
                                            ? <EmptyState msg="App tracking records context switches automatically" />
                                            : <div className="space-y-2">
                                                <div className="mb-1"><Eyebrow>Context switches / day</Eyebrow></div>
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
                                    <Card
                                        title="Top Distraction"
                                        icon={Zap}
                                        accent={C.error}
                                        hint={distractionDuringFocus.pct > 0 ? `${distractionDuringFocus.pct}% during focus` : undefined}
                                        center
                                    >
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
                                            <EmptyWin icon={CheckCircle2} accent={C.well}
                                                title="Distraction-free"
                                                sub="No entertainment usage this range" />
                                        )}
                                    </Card>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {aiAvailable && (
                <InsightsModal
                    open={insightsOpen}
                    onClose={() => setInsightsOpen(false)}
                    summary={insightSummary}
                    cacheKey={range.label}
                />
            )}
        </div>
    )
}
