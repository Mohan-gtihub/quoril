import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, subDays, addDays, isToday } from 'date-fns'
import {
    ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus,
    Settings as SettingsIcon
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useScreenTimeData, type CategoryEntry, type ProductivityBucket } from './useScreenTimeData'
import { cn } from '@/utils/helpers'
import { platform } from '@/services/platform'
import { useTrackingDetail } from '@/hooks/useTrackingDetail'
import { ROUTES } from '@/constants'
import { TrackingUnavailable } from '@/components/reports/components/TrackingUnavailable'

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
    if (h === 0) return '12 AM'
    if (h < 12) return `${h} AM`
    if (h === 12) return '12 PM'
    return `${h - 12} PM`
}

function pct(v: number, max: number) {
    return max > 0 ? Math.min(100, Math.round((v / max) * 100)) : 0
}

// Category palette aligned to the app's functional accents (focus / break /
// wellbeing) plus a few restrained companions — calm, not loud.
const CATEGORY_COLORS: Record<string, string> = {
    Development: 'var(--focus)',     // blue — focus work
    Work: 'var(--focus)',
    Communication: 'var(--wellbeing)', // teal — messaging
    Web: 'var(--break)',             // amber — browsing
    Entertainment: '#8b5cf6',        // violet — leisure
    Gaming: '#f08050',               // orange
    Other: '#94a3b8',                // neutral slate
    Idle: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
}

// Ordered accent palette for charts where there's no category mapping.
const CHART_PALETTE = ['var(--focus)', 'var(--break)', 'var(--wellbeing)', '#8b5cf6', '#f08050', '#94a3b8']

function getCategoryColor(cat: string) {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other
}

/* ═══════════════════════════════════════════════════════════════
   LAYOUT PRIMITIVES
═══════════════════════════════════════════════════════════════ */

function Tile({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-5', className)}>
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
                    const height = Math.max(2, intensity * 100)
                    const isPeak = h.hour === peakHour && h.totalSeconds > 0
                    return (
                        <div key={h.hour} className="flex-1 flex flex-col items-stretch justify-end group relative h-full">
                            {/* Tooltip */}
                            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-card)] px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-[var(--shadow-soft)]">
                                <p className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">{fmtHour(h.hour)} — {fmt(h.totalSeconds)}</p>
                                <p className="text-[11px] text-[var(--text-tertiary)]">{h.uniqueApps} app{h.uniqueApps !== 1 ? 's' : ''}</p>
                            </div>
                            {/* Baseline track — keeps the grid readable even with no usage */}
                            <div className="absolute inset-0 rounded-md bg-[var(--track)] opacity-40 group-hover:opacity-70 transition-opacity" />
                            <motion.div
                                className="relative w-full rounded-md"
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 0.5, delay: i * 0.012, ease: 'easeOut' }}
                                style={{
                                    backgroundColor: h.totalSeconds > 0
                                        ? isPeak
                                            ? 'var(--focus)'
                                            : `color-mix(in srgb, var(--focus) ${Math.round((0.35 + intensity * 0.55) * 100)}%, transparent)`
                                        : 'transparent',
                                }}
                            />
                        </div>
                    )
                })}
            </div>
            <div className="flex gap-[3px] mt-2.5">
                {hourly.map(h => (
                    <div key={h.hour} className="flex-1 text-center text-[10px] font-medium text-[var(--text-muted)] tabular-nums">
                        {h.hour % 6 === 0 ? fmtHour(h.hour) : ''}
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
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--bg-elevated)] rounded-[var(--radius-tile)] px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-sm">
                                <p className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">{fmt(d.totalSeconds)}</p>
                            </div>
                            <motion.div
                                className="w-full rounded-full"
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                                style={{
                                    backgroundColor: isSelected ? 'var(--focus)' : d.totalSeconds > 0 ? 'color-mix(in srgb, var(--focus) 50%, transparent)' : 'var(--track)',
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
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={strokeWidth} />
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
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mt-1">total</p>
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
            <div className="h-3 bg-[var(--track)] rounded-full overflow-hidden flex gap-0.5">
                {data.productive > 0 && (
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${prodPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} style={{ backgroundColor: 'var(--wellbeing)' }} />
                )}
                {data.neutral > 0 && (
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${neutralPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} style={{ backgroundColor: 'var(--break)' }} />
                )}
                {data.unproductive > 0 && (
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${unprodPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} style={{ backgroundColor: 'var(--error)' }} />
                )}
            </div>
            <div className="flex justify-between mt-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--wellbeing)' }} />
                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">Productive {fmt(data.productive)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--break)' }} />
                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">Neutral {fmt(data.neutral)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--error)' }} />
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
                        <div className="h-1.5 bg-[var(--track)] rounded-full overflow-hidden">
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
                        <div className="h-1.5 bg-[var(--track)] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct(d.totalSeconds, maxSec)}%` }}
                                transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
                                style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
            <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums leading-tight mt-2">{value}</p>
            <div className="mt-1.5">{children}</div>
        </Tile>
    )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */

const appTracking = platform.capabilities.appTracking

export function ScreenTime() {
    const navigate = useNavigate()
    // Hook must always run — capability is a module-level constant so conditional
    // rendering is safe: the hook result is simply unused on web.
    const data = useScreenTimeData()
    // Per-capability state: the Websites panel depends on `urls` alone.
    // `urlsPending` is opted-in-but-not-yet-granted, which deserves different
    // copy from "you haven't turned this on".
    const { detail: trackingDetail } = useTrackingDetail()
    const urlsLive = Boolean(trackingDetail?.urls.enabled && trackingDetail.urls.granted)
    const urlsPending = Boolean(trackingDetail?.urls.enabled && !trackingDetail.urls.granted)
    const { loading, trackingAvailable, date, setDate, hourly, apps, categories, domains, weekly, timeline, totals, productivity, peakHour, avgDailySeconds, todayVsAvg } = data

    const isViewingToday = isToday(parseISO(date))
    const displayDate = isViewingToday ? 'Today' : format(parseISO(date), 'EEE, MMM d')

    const goBack = () => setDate(format(subDays(parseISO(date), 1), 'yyyy-MM-dd'))
    const goForward = () => {
        const next = addDays(parseISO(date), 1)
        if (!isToday(next) && next > new Date()) return
        setDate(format(next, 'yyyy-MM-dd'))
    }
    const canGoForward = !isViewingToday

    // App tracking is optional. On web it is unavailable; on unsigned macOS builds
    // it may be disabled until the user opts into Accessibility permission.
    if (!appTracking || (!loading && !trackingAvailable)) {
        return (
            <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar select-none pb-24">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10">
                    <header className="mb-8 flex items-end gap-4">
                        <button onClick={() => navigate(-1)}
                            className="w-9 h-9 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <p className="text-sm font-medium text-[var(--text-tertiary)] mb-1.5">Digital Wellbeing</p>
                            <h1 className="text-[30px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">Screen Time</h1>
                        </div>
                    </header>
                    <TrackingUnavailable
                        title={appTracking ? 'App Tracking Optional' : undefined}
                        description={
                            appTracking
                                ? 'Screen Time works when macOS Accessibility access is enabled. You can keep using planner, focus sessions, and manual reports without it.'
                                : undefined
                        }
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar select-none pb-24">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10">

                {/* ── Header ── */}
                <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)}
                            className="w-9 h-9 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
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
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)]">
                                <span className="w-1.5 h-1.5 bg-[var(--accent-contrast)] rounded-full animate-pulse" />
                                <span className="text-[11px] font-semibold uppercase tracking-wide">Live</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <button onClick={goBack} className="w-8 h-8 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
                                className="px-4 py-1.5 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-xs font-semibold text-[var(--text-secondary)] transition-colors min-w-[96px] text-center"
                            >
                                {displayDate}
                            </button>
                            <button onClick={goForward} disabled={!canGoForward}
                                className="w-8 h-8 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] flex items-center justify-center text-[var(--text-secondary)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
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
                                    {todayVsAvg > 0 ? <TrendingUp className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> : todayVsAvg < 0 ? <TrendingDown className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> : <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                                    <p className="text-[11px] text-[var(--text-tertiary)]">
                                        {todayVsAvg === 0 ? 'On average' : `${Math.abs(todayVsAvg)}% ${todayVsAvg > 0 ? 'above' : 'below'} avg`}
                                    </p>
                                </div>
                            </Kpi>
                            <Kpi label="Apps Used" value={totals.totalApps}>
                                <p className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{totals.totalSessions} sessions</p>
                            </Kpi>
                            <Kpi label="Peak Hour" value={totals.totalScreenTime === 0 ? '—' : fmtHour(peakHour)}>
                                <p className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{totals.totalScreenTime === 0 ? 'No usage' : `${fmt(hourly[peakHour]?.totalSeconds ?? 0)} usage`}</p>
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
                                {/* This panel needs the `urls` capability specifically —
                                    the combined detailAvailable flag would also be true
                                    with only window titles on, and show an empty list. */}
                                <TileHead title="Websites" hint={urlsLive ? `${domains.length} total` : undefined} />
                                <div className="mt-5">
                                    {urlsLive ? (
                                        <DomainList domains={domains} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                            <p className="text-sm text-[var(--text-secondary)] font-medium">
                                                {urlsPending
                                                    ? 'Waiting on permission'
                                                    : 'Website breakdown is off'}
                                            </p>
                                            <p className="text-xs text-[var(--text-tertiary)] mt-1.5 max-w-xs leading-relaxed">
                                                {urlsPending
                                                    ? 'Grant Quoril Accessibility access in System Settings. If you already have, Quoril needs a restart to see it.'
                                                    : 'Turn on website addresses to split browser time into the sites you actually visited. It stays on this device.'}
                                            </p>
                                            <button
                                                onClick={() => navigate(`${ROUTES.SETTINGS}?section=about`)}
                                                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-card)] text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
                                            >
                                                <SettingsIcon className="w-3.5 h-3.5" />
                                                Open settings
                                            </button>
                                        </div>
                                    )}
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
