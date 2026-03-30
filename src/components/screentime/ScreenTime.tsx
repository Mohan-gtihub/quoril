import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, subDays, addDays, isToday } from 'date-fns'
import {
    ArrowLeft, ChevronLeft, ChevronRight, Monitor, Globe, Clock,
    Zap, TrendingUp, TrendingDown, Minus, Layers, Activity, Smartphone
} from 'lucide-react'
import { useScreenTimeData, type CategoryEntry, type ProductivityBucket } from './useScreenTimeData'

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-white/[0.04] rounded-2xl ${className}`} />
}

// ── Hourly Usage Heatmap ─────────────────────────────────

function HourlyHeatmap({ hourly, peakHour }: { hourly: { hour: number; totalSeconds: number; uniqueApps: number }[]; peakHour: number }) {
    const maxSec = Math.max(1, ...hourly.map(h => h.totalSeconds))

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Usage by Hour</p>
                <p className="text-[10px] text-white/20">Peak: {fmtHour(peakHour)}</p>
            </div>
            <div className="flex gap-[3px] items-end h-24">
                {hourly.map(h => {
                    const intensity = h.totalSeconds / maxSec
                    const height = Math.max(3, intensity * 100)
                    const isPeak = h.hour === peakHour && h.totalSeconds > 0
                    return (
                        <div key={h.hour} className="flex-1 flex flex-col items-center justify-end group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                <p className="text-[10px] font-bold text-white">{fmtHour(h.hour)} — {fmt(h.totalSeconds)}</p>
                                <p className="text-[9px] text-white/40">{h.uniqueApps} app{h.uniqueApps !== 1 ? 's' : ''}</p>
                            </div>
                            <div
                                className="w-full rounded-sm transition-all duration-500"
                                style={{
                                    height: `${height}%`,
                                    backgroundColor: h.totalSeconds > 0
                                        ? isPeak
                                            ? 'var(--accent-primary)'
                                            : `rgba(139, 92, 246, ${0.2 + intensity * 0.6})`
                                        : 'rgba(255,255,255,0.03)',
                                    boxShadow: isPeak ? '0 0 12px rgba(139,92,246,0.4)' : 'none',
                                }}
                            />
                        </div>
                    )
                })}
            </div>
            <div className="flex gap-[3px] mt-1">
                {hourly.map(h => (
                    <div key={h.hour} className="flex-1 text-center text-[7px] text-white/15">
                        {h.hour % 3 === 0 ? fmtHour(h.hour) : ''}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Weekly Trend Chart ───────────────────────────────────

function WeeklyChart({ weekly, selectedDate }: { weekly: { day: string; totalSeconds: number }[]; selectedDate: string }) {
    const maxSec = Math.max(1, ...weekly.map(d => d.totalSeconds))

    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">7-Day Trend</p>
            <div className="flex items-end gap-2 h-20">
                {weekly.map(d => {
                    const isSelected = d.day === selectedDate
                    const height = Math.max(4, pct(d.totalSeconds, maxSec))
                    return (
                        <div key={d.day} className="flex-1 flex flex-col items-center justify-end group relative">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                <p className="text-[10px] font-bold text-white">{fmt(d.totalSeconds)}</p>
                            </div>
                            <div
                                className="w-full rounded-t transition-all duration-500"
                                style={{
                                    height: `${height}%`,
                                    backgroundColor: isSelected ? 'var(--accent-primary)' : d.totalSeconds > 0 ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.04)',
                                    boxShadow: isSelected ? '0 0 12px rgba(139,92,246,0.3)' : 'none',
                                }}
                            />
                            <p className={`text-[9px] mt-1.5 font-medium ${isSelected ? 'text-[var(--accent-primary)]' : 'text-white/20'}`}>
                                {format(parseISO(d.day), 'EEE')[0]}
                            </p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Category Donut ───────────────────────────────────────

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
            <div className="flex items-center justify-center h-full opacity-20">
                <p className="text-xs text-white/40">No data</p>
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
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
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
                    <p className="text-lg font-black text-white leading-none">{fmt(totalSeconds)}</p>
                    <p className="text-[8px] text-white/25 uppercase tracking-wider mt-0.5">total</p>
                </div>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
                {categories.slice(0, 6).map(c => (
                    <div key={c.category} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(c.category) }} />
                        <span className="text-[11px] text-white/50 flex-1 truncate">{c.category}</span>
                        <span className="text-[11px] font-bold text-white/70 tabular-nums">{fmt(c.totalSeconds)}</span>
                        <span className="text-[9px] text-white/20 tabular-nums w-8 text-right">{pct(c.totalSeconds, totalSeconds)}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Productivity Bar ─────────────────────────────────────

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
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Productivity Split</p>
                <p className="text-[10px] text-white/20">{prodPct}% productive</p>
            </div>
            <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden flex">
                {data.productive > 0 && (
                    <div className="h-full transition-all duration-700 rounded-l-full" style={{ width: `${prodPct}%`, backgroundColor: '#22c55e' }} />
                )}
                {data.neutral > 0 && (
                    <div className="h-full transition-all duration-700" style={{ width: `${neutralPct}%`, backgroundColor: '#6b7280' }} />
                )}
                {data.unproductive > 0 && (
                    <div className="h-full transition-all duration-700 rounded-r-full" style={{ width: `${unprodPct}%`, backgroundColor: '#ef4444' }} />
                )}
            </div>
            <div className="flex justify-between mt-2">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[10px] text-white/30">Productive {fmt(data.productive)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-[10px] text-white/30">Neutral {fmt(data.neutral)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] text-white/30">Distracting {fmt(data.unproductive)}</span>
                </div>
            </div>
        </div>
    )
}

// ── App Usage List ───────────────────────────────────────

function AppList({ apps }: { apps: { appName: string; category: string; totalSeconds: number; sessionCount: number }[] }) {
    const maxSec = apps[0]?.totalSeconds ?? 1
    if (apps.length === 0) {
        return (
            <div className="py-8 text-center">
                <Monitor className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25">No app activity recorded</p>
            </div>
        )
    }
    return (
        <div className="space-y-2">
            {apps.slice(0, 12).map((app, i) => (
                <div key={i} className="group">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] text-white/15 w-4 text-right tabular-nums">{i + 1}</span>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(app.category) }} />
                        <span className="text-[12px] text-white/70 flex-1 truncate font-medium">{app.appName}</span>
                        <span className="text-[11px] text-white/40 tabular-nums">{fmt(app.totalSeconds)}</span>
                    </div>
                    <div className="ml-[30px]">
                        <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct(app.totalSeconds, maxSec)}%`, backgroundColor: getCategoryColor(app.category) }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Domain List ──────────────────────────────────────────

function DomainList({ domains }: { domains: { domain: string; totalSeconds: number; sessionCount: number }[] }) {
    const maxSec = domains[0]?.totalSeconds ?? 1
    if (domains.length === 0) {
        return (
            <div className="py-8 text-center">
                <Globe className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25">No website activity recorded</p>
            </div>
        )
    }
    return (
        <div className="space-y-2">
            {domains.slice(0, 10).map((d, i) => (
                <div key={i}>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] text-white/15 w-4 text-right tabular-nums">{i + 1}</span>
                        <Globe className="w-3 h-3 text-purple-400/50 flex-shrink-0" />
                        <span className="text-[12px] text-white/70 flex-1 truncate font-medium">{d.domain}</span>
                        <span className="text-[11px] text-white/40 tabular-nums">{fmt(d.totalSeconds)}</span>
                    </div>
                    <div className="ml-[30px]">
                        <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct(d.totalSeconds, maxSec)}%`, backgroundColor: '#8b5cf6' }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Activity Timeline ────────────────────────────────────

function Timeline({ entries }: { entries: { appName: string; category: string; startTime: string; endTime: string; durationSeconds: number }[] }) {
    if (entries.length === 0) {
        return (
            <div className="py-8 text-center">
                <Activity className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25">No activity timeline yet</p>
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
                    <span className="text-[9px] text-white/20 tabular-nums w-10 flex-shrink-0 text-right">
                        {format(parseISO(e.startTime), 'h:mm a')}
                    </span>
                    <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full border-2 flex-shrink-0"
                            style={{ borderColor: getCategoryColor(e.category), backgroundColor: i === grouped.length - 1 ? getCategoryColor(e.category) : 'transparent' }}
                        />
                        {i < grouped.length - 1 && <div className="w-px h-4 bg-white/[0.06]" />}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-[11px] text-white/60 truncate">{e.appName}</span>
                        <span className="text-[9px] text-white/15 flex-shrink-0 tabular-nums">{fmt(e.totalSeconds)}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */

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
        <div className="h-full flex flex-col bg-transparent select-none">

            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                        <ArrowLeft className="w-4 h-4 text-white/50" />
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-white">Screen Time</h1>
                        <p className="text-[9px] text-white/25 uppercase tracking-widest">Digital Wellbeing</p>
                    </div>
                </div>

                {/* Date navigation */}
                <div className="flex items-center gap-1">
                    <button onClick={goBack} className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                        <ChevronLeft className="w-3.5 h-3.5 text-white/40" />
                    </button>
                    <button
                        onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-bold text-white/60 transition-colors min-w-[90px] text-center"
                    >
                        {displayDate}
                    </button>
                    <button onClick={goForward} disabled={!canGoForward}
                        className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                        <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                    </button>
                    {isViewingToday && (
                        <div className="ml-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">Live</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-4">

                {loading ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-3">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                        </div>
                        <Skeleton className="h-36" />
                        <div className="grid grid-cols-2 gap-3">
                            <Skeleton className="h-48" />
                            <Skeleton className="h-48" />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ══ KPI Row ═════════════════════════════════════════ */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Total Screen Time */}
                            <div className="rounded-2xl p-4 border border-purple-500/20 bg-purple-500/[0.06]">
                                <div className="flex items-center gap-2 mb-1">
                                    <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Screen Time</p>
                                </div>
                                <p className="text-xl font-black text-purple-300 leading-tight">{fmt(totals.totalScreenTime)}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    {todayVsAvg > 0 ? <TrendingUp className="w-3 h-3 text-red-400" /> : todayVsAvg < 0 ? <TrendingDown className="w-3 h-3 text-green-400" /> : <Minus className="w-3 h-3 text-white/20" />}
                                    <p className="text-[10px] text-white/25">
                                        {todayVsAvg === 0 ? 'On average' : `${Math.abs(todayVsAvg)}% ${todayVsAvg > 0 ? 'above' : 'below'} avg`}
                                    </p>
                                </div>
                            </div>

                            {/* Apps Used */}
                            <div className="rounded-2xl p-4 border border-blue-500/20 bg-blue-500/[0.06]">
                                <div className="flex items-center gap-2 mb-1">
                                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Apps Used</p>
                                </div>
                                <p className="text-xl font-black text-blue-300 leading-tight">{totals.totalApps}</p>
                                <p className="text-[10px] text-white/25 mt-1">{totals.totalSessions} sessions</p>
                            </div>

                            {/* Peak Hour */}
                            <div className="rounded-2xl p-4 border border-amber-500/20 bg-amber-500/[0.06]">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Peak Hour</p>
                                </div>
                                <p className="text-xl font-black text-amber-300 leading-tight">{fmtHour(peakHour)}</p>
                                <p className="text-[10px] text-white/25 mt-1">{fmt(hourly[peakHour]?.totalSeconds ?? 0)} usage</p>
                            </div>

                            {/* Longest Session */}
                            <div className="rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/[0.06]">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Longest Session</p>
                                </div>
                                <p className="text-xl font-black text-emerald-300 leading-tight">{fmt(totals.longestSession)}</p>
                                <p className="text-[10px] text-white/25 mt-1">Single stretch</p>
                            </div>
                        </div>

                        {/* ══ Hourly Heatmap ══════════════════════════════════ */}
                        <div className="border border-white/[0.07] rounded-2xl p-5">
                            <HourlyHeatmap hourly={hourly} peakHour={peakHour} />
                        </div>

                        {/* ══ Productivity Split ═════════════════════════════ */}
                        <div className="border border-white/[0.07] rounded-2xl p-5">
                            <ProductivityBar productivity={productivity} totalSeconds={totals.totalScreenTime} />
                        </div>

                        {/* ══ Category Donut + Weekly Trend ══════════════════ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-white/[0.07] rounded-2xl p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-4">Categories</p>
                                <CategoryDonut categories={categories} totalSeconds={totals.totalScreenTime} />
                            </div>
                            <div className="border border-white/[0.07] rounded-2xl p-5">
                                <WeeklyChart weekly={weekly} selectedDate={date} />
                                <div className="mt-3 flex items-center justify-between">
                                    <p className="text-[10px] text-white/20">7-day avg: {fmt(avgDailySeconds)}</p>
                                    <p className="text-[10px] text-white/20">{weekly.filter(d => d.totalSeconds > 0).length}/7 active days</p>
                                </div>
                            </div>
                        </div>

                        {/* ══ Apps + Domains Side by Side ════════════════════ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-white/[0.07] rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Monitor className="w-3.5 h-3.5 text-blue-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Applications</p>
                                    <span className="ml-auto text-[10px] text-white/15 tabular-nums">{apps.length} total</span>
                                </div>
                                <AppList apps={apps} />
                            </div>
                            <div className="border border-white/[0.07] rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Globe className="w-3.5 h-3.5 text-purple-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Websites</p>
                                    <span className="ml-auto text-[10px] text-white/15 tabular-nums">{domains.length} total</span>
                                </div>
                                <DomainList domains={domains} />
                            </div>
                        </div>

                        {/* ══ Activity Timeline ══════════════════════════════ */}
                        <div className="border border-white/[0.07] rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">Activity Timeline</p>
                                <span className="ml-auto text-[10px] text-white/15">Most recent</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                <Timeline entries={timeline} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
