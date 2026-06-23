import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, subDays, addDays, isToday } from 'date-fns'
import {
    ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useScreenTimeData, type CategoryEntry, type ProductivityBucket } from './useScreenTimeData'
import { cn } from '@/utils/helpers'

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

function fmt(sec: number) {
    if (!sec || sec <= 0) return '0m'
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
}

function fmtHour(h: number) {
    if (h === 0) return '12a'
    if (h < 12) return `${h}a`
    if (h === 12) return '12p'
    return `${h - 12}p`
}

function pct(v: number, max: number) {
    return max > 0 ? Math.min(100, Math.round((v / max) * 100)) : 0
}

const CATEGORY_COLORS: Record<string, string> = {
    Development: '#3b82f6',
    Work: '#22c55e',
    Communication: '#f59e0b',
    Web: '#8b5cf6',
    Entertainment: '#ef4444',
    Gaming: '#f97316',
    Other: '#6b7280',
    Idle: '#374151',
}

function getCategoryColor(cat: string) {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other
}

/* ═══════════════════════════════════════════════════════════════
   LAYOUT PRIMITIVES
═══════════════════════════════════════════════════════════════ */

function Tile({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] p-5 shadow-sm', className)}>
            {children}
        </div>
    )
}

function TileHead({ title, hint }: { title: string; hint?: string }) {
    return (
        <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
            {hint && <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{hint}</span>}
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════ */

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={cn('animate-pulse bg-[var(--bg-hover)] rounded-[var(--radius-tile)]', className)} />
}

// ── Hourly Usage Heatmap ───────────────────────────────────

function HourlyHeatmap({ hourly, peakHour }: { hourly: { hour: number; totalSeconds: number; uniqueApps: number }[]; peakHour: number }) {
    const maxSec = Math.max(1, ...hourly.map(h => h.totalSeconds))

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Usage by Hour</h2>
                <span className="text-xs text-[var(--text-tertiary)] tabular-nums">Peak: {fmtHour(peakHour)}</span>
            </div>
            <div className="flex gap-[3px] items-end h-28 mt-5">
                {hourly.map((h, i) => {
                    const intensity = h.totalSeconds / maxSec
                    const height = Math.max(3, intensity * 100)
                    const isPeak = h.hour === peakHour && h.totalSeconds > 0
                    return (
                        <div key={h.hour} className="flex-1 flex flex-col items-center justify-end group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-hover)] rounded-xl px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-sm">
                                <p className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">{fmtHour(h.hour)} — {fmt(h.totalSeconds)}</p>
                                <p className="text-[11px] text-[var(--text-tertiary)]">{h.uniqueApps} app{h.uniqueApps !== 1 ? 's' : ''}</p>
                            </div>
                            <motion.div
                                className="w-full rounded-full"
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 0.5, delay: i * 0.012, ease: 'easeOut' }}
                                style={{
                                    backgroundColor: h.totalSeconds > 0
                                        ? isPeak
                                            ? 'var(--accent-primary)'
                                            : `rgba(99, 102, 241, ${0.3 + intensity * 0.6})`
                                        : 'var(--bg-hover)',
                                }}
                            />
                        </div>
                    )
                })}
            </div>
            <div className="flex gap-[3px] mt-2">
                {hourly.map(h => (
                    <div key={h.hour} className="flex-1 text-center text-[11px] text-[var(--text-muted)] tabular-nums">
                        {h.hour % 3 === 0 ? fmtHour(h.hour) : ''}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Weekly Trend Chart ─────────────────────────────────────

function WeeklyChart({ weekly, selectedDate }: { weekly: { day: string; totalSeconds: number }[]; selectedDate: string }) {
    const maxSec = Math.max(1, ...weekly.map(d => d.totalSeconds))

    return (
        <div>
            <TileHead title="7-Day Trend" />
            <div className="flex items-end gap-2 h-24 mt-5">
                {weekly.map((d, i) => {
                    const isSelected = d.day === selectedDate
                    const height = Math.max(4, pct(d.totalSeconds, maxSec))
                    return (
                        <div key={d.day} className="flex-1 flex flex-col items-center justify-end group relative">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-hover)] rounded-xl px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-sm">
                                <p className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">{fmt(d.totalSeconds)}</p>
                            </div>
                            <motion.div
                                className="w-full rounded-full"
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                                style={{
                                    backgroundColor: isSelected ? 'var(--accent-primary)' : d.totalSeconds > 0 ? 'rgba(99,102,241,0.5)' : 'var(--bg-hover)',
                                }}
                            />
                            <span className={cn('text-[11px] mt-2 font-medium', isSelected ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)]')}>
                                {format(parseISO(d.day), 'EEE')[0]}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Category Donut ─────────────────────────────────────────

function CategoryDonut({ categories, totalSeconds }: { categories: CategoryEntry[]; totalSeconds: number }) {
    const segments = useMemo(() => {
        if (totalSeconds === 0 || categories.length === 0) return []
        let cumulativeAngle = 0
        return categories.map(c => {
            const angle = (c.totalSeconds / totalSeconds) * 360
            const start = cumulativeAngle
            cumulativeAngle += angle
            return { ...c, startAngle: start, angle, color: getCategoryColor(c.category) }
        })
    }, [categories, totalSeconds])

    if (segments.length === 0) {
        return (
            <div className="flex items-center justify-center h-full min-h-[140px]">
                <p className="text-sm text-[var(--text-tertiary)]">No data</p>
            </div>
        )
    }

    const size = 140
    const cx = size / 2
    const cy = size / 2
    const r = 52
    const strokeWidth = 18

    function arcPath(startAngle: number, angle: number) {
        const startRad = ((startAngle - 90) * Math.PI) / 180
        const endRad = (((startAngle + angle) - 90) * Math.PI) / 180
        const x1 = cx + r * Math.cos(startRad)
        const y1 = cy + r * Math.sin(startRad)
        const x2 = cx + r * Math.cos(endRad)
        const y2 = cy + r * Math.sin(endRad)
        const large = angle > 180 ? 1 : 0
        return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
    }

    return (
        <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={strokeWidth} />
                    {segments.map((s, i) => (
                        <path
                            key={i}
                            d={arcPath(s.startAngle, Math.max(s.angle - 1, 0.5))}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            style={{ transition: 'all 0.6s ease' }}
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums leading-none">{fmt(totalSeconds)}</p>
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mt-1">total</p>
                </div>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
                {categories.slice(0, 6).map(c => (
                    <div key={c.category} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(c.category) }} />
                        <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">{c.category}</span>
                        <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{fmt(c.totalSeconds)}</span>
                        <span className="text-[11px] text-[var(--text-muted)] tabular-nums w-8 text-right">{pct(c.totalSeconds, totalSeconds)}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Productivity Bar ───────────────────────────────────────

function ProductivityBar({ productivity, totalSeconds }: { productivity: ProductivityBucket[]; totalSeconds: number }) {
    const data = useMemo(() => {
        const map: Record<string, number> = { productive: 0, neutral: 0, unproductive: 0 }
        productivity.forEach(p => { map[p.bucket] = p.totalSeconds })
        return map
    }, [productivity])

    if (totalSeconds === 0) return null

    const prodPct = pct(data.productive, totalSeconds)
    const neutralPct = pct(data.neutral, totalSeconds)
    const unprodPct = pct(data.unproductive, totalSeconds)

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Productivity Split</h2>
                <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{prodPct}% productive</span>
            </div>
            <div className="h-3 bg-[var(--bg-hover)] rounded-full overflow-hidden flex">
                {data.productive > 0 && (
                    <motion.div className="h-full rounded-l-full" initial={{ width: 0 }} animate={{ width: `${prodPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} style={{ backgroundColor: '#22c55e' }} />
                )}
                {data.neutral > 0 && (
                    <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${neutralPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} style={{ backgroundColor: '#6b7280' }} />
                )}
                {data.unproductive > 0 && (
                    <motion.div className="h-full rounded-r-full" initial={{ width: 0 }} animate={{ width: `${unprodPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} style={{ backgroundColor: '#ef4444' }} />
                )}
            </div>
            <div className="flex justify-between mt-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">Productive {fmt(data.productive)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">Neutral {fmt(data.neutral)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">Distracting {fmt(data.unproductive)}</span>
                </div>
            </div>
        </div>
    )
}

// ── App Usage List ─────────────────────────────────────────

function AppList({ apps }: { apps: { appName: string; category: string; totalSeconds: number; sessionCount: number }[] }) {
    const maxSec = apps[0]?.totalSeconds ?? 1
    if (apps.length === 0) {
        return (
            <div className="py-8 text-center">
                <p className="text-sm text-[var(--text-tertiary)]">No app activity recorded</p>
            </div>
        )
    }
    return (
        <div className="space-y-2.5">
            {apps.slice(0, 12).map((app, i) => (
                <div key={i} className="group">
                    <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-[11px] text-[var(--text-muted)] w-4 text-right tabular-nums">{i + 1}</span>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(app.category) }} />
                        <span className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors flex-1 truncate font-medium">{app.appName}</span>
                        <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{fmt(app.totalSeconds)}</span>
                    </div>
                    <div className="ml-[30px]">
                        <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct(app.totalSeconds, maxSec)}%` }}
                                transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
                                style={{ backgroundColor: getCategoryColor(app.category) }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Domain List ────────────────────────────────────────────

function DomainList({ domains }: { domains: { domain: string; totalSeconds: number; sessionCount: number }[] }) {
    const maxSec = domains[0]?.totalSeconds ?? 1
    if (domains.length === 0) {
        return (
            <div className="py-8 text-center">
                <p className="text-sm text-[var(--text-tertiary)]">No website activity recorded</p>
            </div>
        )
    }
    return (
        <div className="space-y-2.5">
            {domains.slice(0, 10).map((d, i) => (
                <div key={i} className="group">
                    <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-[11px] text-[var(--text-muted)] w-4 text-right tabular-nums">{i + 1}</span>
                        <span className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors flex-1 truncate font-medium">{d.domain}</span>
                        <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{fmt(d.totalSeconds)}</span>
                    </div>
                    <div className="ml-[30px]">
                        <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct(d.totalSeconds, maxSec)}%` }}
                                transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
                                style={{ backgroundColor: 'var(--accent-violet)' }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Activity Timeline ──────────────────────────────────────

function Timeline({ entries }: { entries: { appName: string; category: string; startTime: string; endTime: string; durationSeconds: number }[] }) {
    if (entries.length === 0) {
        return (
            <div className="py-8 text-center">
                <p className="text-sm text-[var(--text-tertiary)]">No activity timeline yet</p>
            </div>
        )
    }

    // Group consecutive entries by app to reduce visual noise
    const grouped: { appName: string; category: string; startTime: string; endTime: string; totalSeconds: number }[] = []
    for (const e of entries) {
        const last = grouped[grouped.length - 1]
        if (last && last.appName === e.appName) {
            last.endTime = e.endTime
            last.totalSeconds += e.durationSeconds
        } else {
            grouped.push({ appName: e.appName, category: e.category, startTime: e.startTime, endTime: e.endTime, totalSeconds: e.durationSeconds })
        }
    }

    return (
        <div className="space-y-0">
            {grouped.slice(-30).map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 group">
                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums w-10 flex-shrink-0 text-right">
                        {format(parseISO(e.startTime), 'h:mm a')}
                    </span>
                    <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
                            style={{ borderColor: getCategoryColor(e.category), backgroundColor: i === grouped.length - 1 ? getCategoryColor(e.category) : 'transparent' }}
                        />
                        {i < grouped.length - 1 && <div className="w-px h-4 bg-[var(--border-default)]" />}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-xs text-[var(--text-secondary)] truncate">{e.appName}</span>
                        <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0 tabular-nums">{fmt(e.totalSeconds)}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── KPI card ───────────────────────────────────────────────

function Kpi({ label, value, children }: { label: string; value: string | number; children?: React.ReactNode }) {
    return (
        <Tile className="flex flex-col">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
            <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums leading-tight mt-2">{value}</p>
            <div className="mt-1.5">{children}</div>
        </Tile>
    )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */

export function ScreenTime() {
    const navigate = useNavigate()
    const data = useScreenTimeData()
    const { loading, date, setDate, hourly, apps, categories, domains, weekly, timeline, totals, productivity, peakHour, avgDailySeconds, todayVsAvg } = data

    const isViewingToday = isToday(parseISO(date))
    const displayDate = isViewingToday ? 'Today' : format(parseISO(date), 'EEE, MMM d')

    const goBack = () => setDate(format(subDays(parseISO(date), 1), 'yyyy-MM-dd'))
    const goForward = () => {
        const next = addDays(parseISO(date), 1)
        if (!isToday(next) && next > new Date()) return
        setDate(format(next, 'yyyy-MM-dd'))
    }
    const canGoForward = !isViewingToday

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar select-none pb-24">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10">

                {/* ── Header ── */}
                <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)}
                            className="w-9 h-9 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <p className="text-sm font-medium text-[var(--text-tertiary)] mb-1.5">Digital Wellbeing</p>
                            <h1 className="text-[30px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">Screen Time</h1>
                        </div>
                    </div>

                    {/* Date navigation */}
                    <div className="flex items-center gap-2">
                        {isViewingToday && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-[0_8px_24px_var(--accent-glow)]">
                                <span className="w-1.5 h-1.5 bg-[var(--accent-contrast)] rounded-full animate-pulse" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Live</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <button onClick={goBack} className="w-8 h-8 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
                                className="px-4 py-1.5 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-colors min-w-[96px] text-center"
                            >
                                {displayDate}
                            </button>
                            <button onClick={goForward} disabled={!canGoForward}
                                className="w-8 h-8 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] flex items-center justify-center text-[var(--text-secondary)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── Body ── */}
                {loading ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                        </div>
                        <Skeleton className="h-44" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-56" />
                            <Skeleton className="h-56" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* ══ KPI Row ══════════════════════════════════ */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Kpi label="Screen Time" value={fmt(totals.totalScreenTime)}>
                                <div className="flex items-center gap-1">
                                    {todayVsAvg > 0 ? <TrendingUp className="w-3.5 h-3.5 text-red-400" /> : todayVsAvg < 0 ? <TrendingDown className="w-3.5 h-3.5 text-green-400" /> : <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                                    <p className="text-[11px] text-[var(--text-tertiary)]">
                                        {todayVsAvg === 0 ? 'On average' : `${Math.abs(todayVsAvg)}% ${todayVsAvg > 0 ? 'above' : 'below'} avg`}
                                    </p>
                                </div>
                            </Kpi>
                            <Kpi label="Apps Used" value={totals.totalApps}>
                                <p className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{totals.totalSessions} sessions</p>
                            </Kpi>
                            <Kpi label="Peak Hour" value={fmtHour(peakHour)}>
                                <p className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{fmt(hourly[peakHour]?.totalSeconds ?? 0)} usage</p>
                            </Kpi>
                            <Kpi label="Longest Session" value={fmt(totals.longestSession)}>
                                <p className="text-[11px] text-[var(--text-tertiary)]">Single stretch</p>
                            </Kpi>
                        </div>

                        {/* ══ Hourly Heatmap ══════════════════════════ */}
                        <Tile>
                            <HourlyHeatmap hourly={hourly} peakHour={peakHour} />
                        </Tile>

                        {/* ══ Productivity Split ══════════════════════ */}
                        <Tile>
                            <ProductivityBar productivity={productivity} totalSeconds={totals.totalScreenTime} />
                        </Tile>

                        {/* ══ Category Donut + Weekly Trend ═══════════ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Tile>
                                <TileHead title="Categories" />
                                <div className="mt-5">
                                    <CategoryDonut categories={categories} totalSeconds={totals.totalScreenTime} />
                                </div>
                            </Tile>
                            <Tile>
                                <WeeklyChart weekly={weekly} selectedDate={date} />
                                <div className="mt-4 flex items-center justify-between border-t border-[var(--border-default)] pt-3">
                                    <p className="text-[11px] text-[var(--text-tertiary)] tabular-nums">7-day avg: {fmt(avgDailySeconds)}</p>
                                    <p className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{weekly.filter(d => d.totalSeconds > 0).length}/7 active days</p>
                                </div>
                            </Tile>
                        </div>

                        {/* ══ Apps + Domains Side by Side ═════════════ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Tile>
                                <TileHead title="Applications" hint={`${apps.length} total`} />
                                <div className="mt-5">
                                    <AppList apps={apps} />
                                </div>
                            </Tile>
                            <Tile>
                                <TileHead title="Websites" hint={`${domains.length} total`} />
                                <div className="mt-5">
                                    <DomainList domains={domains} />
                                </div>
                            </Tile>
                        </div>

                        {/* ══ Activity Timeline ═══════════════════════ */}
                        <Tile>
                            <TileHead title="Activity Timeline" hint="Most recent" />
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar mt-4">
                                <Timeline entries={timeline} />
                            </div>
                        </Tile>
                    </div>
                )}
            </div>
        </div>
    )
}
