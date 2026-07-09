import { useMemo, useRef, useState, useEffect, type CSSProperties } from 'react'
import { toPng } from 'html-to-image'
import {
    subMonths,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isToday,
    startOfMonth,
    isAfter,
    addDays
} from 'date-fns'
import { Tooltip } from 'react-tooltip'
import { useFocusStore } from '@/store/focusStore'
import { cn } from '@/utils/helpers'
import { Award, CalendarDays, Flame, Share2, Link2, Check, ImageDown, X, Loader2 } from 'lucide-react'
import { isFocusType } from '@/utils/timeCalculations'
import { createFocusMapShareLink } from '@/services/shareFocusMap'

export function ActivityHeatmap() {
    const { sessions, isActive, startTime, sessionType } = useFocusStore()
    const heatmapCardRef = useRef<HTMLDivElement>(null)
    const gridAreaRef = useRef<HTMLDivElement>(null)
    // How many months of history to render — derived from the available width so
    // the map always fills the card edge-to-edge with comfortably-sized cells.
    const [monthsToShow, setMonthsToShow] = useState(6)

    useEffect(() => {
        const el = gridAreaRef.current
        if (!el || typeof ResizeObserver === 'undefined') return

        const PX_PER_WEEK = 16 // target column width incl. gap → keeps cells legible
        const WEEKS_PER_MONTH = 4.345
        const compute = (width: number) => {
            const weeks = Math.max(8, Math.floor(width / PX_PER_WEEK))
            const months = Math.round(weeks / WEEKS_PER_MONTH)
            // Clamp to a sane window: at least a quarter, at most ~14 months.
            setMonthsToShow(Math.min(14, Math.max(3, months)))
        }

        compute(el.clientWidth)
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) compute(entry.contentRect.width)
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    const [isSharing, setIsSharing] = useState(false)
    const [shareOpen, setShareOpen] = useState(false)
    const [shareLink, setShareLink] = useState<string | null>(null)
    const [linkError, setLinkError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    // 1. Process all historical focus sessions into a map: { "YYYY-MM-DD": minutes }
    const activityMap = useMemo(() => {
        const map: Record<string, number> = {}
        sessions.forEach(s => {
            if (!isFocusType(s.type)) return
            const day = s.start_time?.split('T')[0]
            if (day) {
                map[day] = (map[day] || 0) + (s.seconds || 0) / 60
            }
        })

        if (isActive && isFocusType(sessionType) && startTime) {
            const today = new Date().toISOString().split('T')[0]
            const delta = Math.floor((Date.now() - startTime) / 1000)
            map[today] = (map[today] || 0) + (delta / 60)
        }

        return map
    }, [sessions, isActive, startTime, sessionType])

    // 2. Generate date grid for the last N months (width-driven; week-aligned)
    const { days, monthLabels } = useMemo(() => {
        const endDate = endOfWeek(new Date())
        const startDate = startOfWeek(subMonths(endDate, monthsToShow))

        const allDays = eachDayOfInterval({ start: startDate, end: endDate })

        const weeks = []
        for (let i = 0; i < allDays.length; i += 7) {
            weeks.push(allDays.slice(i, i + 7))
        }

        // Month tick per column — labelled only when a new month first appears
        // in that week's top row, so the axis reads left→right without crowding.
        let lastMonth = -1
        const labels = weeks.map(week => {
            const first = week[0]
            const m = first.getMonth()
            if (m !== lastMonth) {
                lastMonth = m
                // Suppress a label sitting in the first two columns (no room to render).
                return format(first, 'MMM')
            }
            return ''
        })

        return { days: weeks, monthLabels: labels }
    }, [monthsToShow])

    // Single green intensity ramp — one coherent scale in every theme.
    // Anchored to --gh-l4 (theme-aware green) with opacity steps so faint→full
    // reads cleanly on both dark and light cards. Empty cells use neutral track.
    const getCellStyle = (minutes: number): CSSProperties => {
        if (minutes === 0) return { background: 'var(--track)' }
        const green = 'var(--gh-l4)'
        if (minutes < 30) return { background: green, opacity: 0.3 }
        if (minutes < 60) return { background: green, opacity: 0.52 }
        if (minutes < 120) return { background: green, opacity: 0.76 }
        return { background: green, opacity: 1 }
    }

    // 3. Contextual Stats (This Month, Best Day, Current Streak)
    const stats = useMemo(() => {
        let monthMins = 0
        let totalMins = 0
        let activeDays = 0
        let bestDay = { date: '', mins: 0 }

        const thisMonthStart = startOfMonth(new Date())

        Object.entries(activityMap).forEach(([dateStr, mins]) => {
            const d = new Date(dateStr)

            totalMins += mins
            if (mins > 0) activeDays += 1

            // This month total
            if (isAfter(d, thisMonthStart) || d.getTime() === thisMonthStart.getTime()) {
                monthMins += mins
            }
            // Best day
            if (mins > bestDay.mins) {
                bestDay = { date: dateStr, mins }
            }
        })

        // Current streak — consecutive days with focus up to today (yesterday counts if today empty)
        let streak = 0
        const cursor = new Date()
        cursor.setHours(0, 0, 0, 0)
        if (!activityMap[format(cursor, 'yyyy-MM-dd')]) {
            cursor.setDate(cursor.getDate() - 1)
        }
        while (activityMap[format(cursor, 'yyyy-MM-dd')]) {
            streak += 1
            cursor.setDate(cursor.getDate() - 1)
        }

        const fmtHrs = (m: number) => {
            if (m < 60) return `${Math.round(m)}m`
            const h = Math.floor(m / 60)
            const remainingMins = Math.round(m % 60)
            return remainingMins > 0 ? `${h}h ${remainingMins}m` : `${h}h`
        }

        return {
            monthStr: fmtHrs(monthMins),
            totalStr: fmtHrs(totalMins),
            activeDays,
            streak,
            bestStr: bestDay.date ? `${format(new Date(bestDay.date), 'EEEE')} (${fmtHrs(bestDay.mins)})` : 'None yet',
            bestMinsStr: bestDay.date ? fmtHrs(bestDay.mins) : '—',
        }
    }, [activityMap])

    // Duolingo-style current-week strip (Mon→Sun) with per-day focus state.
    const weekDays = useMemo(() => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 })
        return Array.from({ length: 7 }, (_, i) => {
            const d = addDays(start, i)
            const key = format(d, 'yyyy-MM-dd')
            const mins = activityMap[key] || 0
            return {
                key,
                label: format(d, 'EEEEE'), // single-letter weekday
                mins,
                active: mins > 0,
                today: isToday(d),
                future: d > new Date(),
            }
        })
    }, [activityMap])

    const weekActiveCount = weekDays.filter(d => d.active).length

    // Open the share dialog and mint a public link (uploads a snapshot to Supabase).
    const openShare = async () => {
        if (isSharing) return
        setShareOpen(true)
        setCopied(false)

        // Reuse an already-minted link for this dashboard view.
        if (shareLink || isSharing) return

        setLinkError(null)
        setIsSharing(true)
        try {
            const link = await createFocusMapShareLink({
                activity: Object.fromEntries(
                    Object.entries(activityMap).map(([d, m]) => [d, Math.round(m)])
                ),
                stats: {
                    monthStr: stats.monthStr,
                    totalStr: stats.totalStr,
                    activeDays: stats.activeDays,
                    streak: stats.streak,
                    bestStr: stats.bestStr,
                },
                generatedAt: new Date().toISOString(),
            })
            setShareLink(link)
        } catch (err) {
            console.error('Failed to create share link', err)
            setLinkError('Could not create a share link. Please try again.')
        } finally {
            setIsSharing(false)
        }
    }

    const handleCopyLink = async () => {
        if (!shareLink) return
        try {
            await navigator.clipboard.writeText(shareLink)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy link', err)
        }
    }

    const handleWhatsApp = () => {
        if (!shareLink) return
        const text = `My Quoril focus map — ${stats.streak}-day focus streak 🔥\n${shareLink}`
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    }

    // Export the card as a PNG (download / native share sheet).
    const handleShareImage = async () => {
        const node = heatmapCardRef.current
        if (!node) return
        try {
            const bg = getComputedStyle(node).backgroundColor || '#0b0d12'
            const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: bg, cacheBust: true })

            const res = await fetch(dataUrl)
            const blob = await res.blob()
            const file = new File([blob], 'quoril-focus-map.png', { type: 'image/png' })

            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'My Quoril focus map',
                    text: `${stats.streak}-day focus streak 🔥`,
                })
            } else {
                const a = document.createElement('a')
                a.href = dataUrl
                a.download = 'quoril-focus-map.png'
                a.click()
            }
        } catch (err) {
            if ((err as Error)?.name !== 'AbortError') {
                console.error('Failed to share focus map image', err)
            }
        }
    }

    return (
      <div className="flex flex-col lg:flex-row gap-4 w-full items-stretch animate-in fade-in duration-500">
        <div ref={heatmapCardRef} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] shadow-[var(--shadow-soft)] p-5 flex-1 min-w-0 flex flex-col relative overflow-hidden">
            <div className="flex items-start justify-between mb-5 gap-4">
                <div>
                    <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">Focus map</h2>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Daily deep work</p>
                </div>

                {/* Contextual meta */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
                    <span className="flex items-center gap-1.5">
                        <CalendarDays size={13} className="text-[var(--text-muted)]" />
                        <span className="font-semibold tabular-nums text-[var(--text-primary)]">{stats.monthStr}</span>
                        <span className="text-[var(--text-tertiary)]">this month</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Award size={13} className="text-[var(--text-muted)]" />
                        <span className="text-[var(--text-tertiary)]">Best</span>
                        <span className="font-semibold text-[var(--text-primary)]">{stats.bestStr}</span>
                    </span>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="flex-1 flex flex-col w-full">
                <div className="mb-4">
                    {/* Month axis — aligned to the flexing columns below via matching gutter */}
                    <div className="flex pl-[34px]">
                        <div className="flex gap-[3px] flex-1">
                            {monthLabels.map((label, i) => (
                                <div key={i} className="flex-1 min-w-0 text-[9px] font-semibold text-[var(--text-muted)] leading-none whitespace-nowrap">
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-stretch mt-1.5">
                        {/* Day Labels (Y-axis) */}
                        <div className="flex flex-col gap-[3px] pr-2 shrink-0 w-[34px] text-[9px] font-semibold text-[var(--text-muted)] text-right">
                            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                                <div key={i} className="flex-1 flex items-center justify-end leading-none">{label}</div>
                            ))}
                        </div>

                        {/* Grid — columns flex to fill the full card width, cells stay square */}
                        <div ref={gridAreaRef} className="flex gap-[3px] flex-1 min-w-0">
                            {days.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-[3px] flex-1 min-w-0">
                                    {week.map((day, dIdx) => {
                                        const dateStr = format(day, 'yyyy-MM-dd')
                                        const mins = activityMap[dateStr] || 0
                                        const isFuture = day > new Date()
                                        const today = isToday(day)

                                        return (
                                            <div
                                                key={dIdx}
                                                data-tooltip-id="heatmap-tooltip"
                                                data-tooltip-content={isFuture ? undefined : `${format(day, 'MMM do, yyyy')}: ${Math.round(mins)} mins`}
                                                style={isFuture ? undefined : getCellStyle(mins)}
                                                className={cn(
                                                    "aspect-square rounded-[3px] transition-all duration-300",
                                                    isFuture ? "opacity-[0.06] bg-[var(--text-muted)]" : "cursor-crosshair hover:scale-125 z-0 hover:z-10",
                                                    today && "ring-1 ring-[var(--gh-l4)] ring-offset-1 ring-offset-[var(--bg-card)] !opacity-100"
                                                )}
                                            />
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Duolingo-style weekly streak strip — fills the card body */}
                <div className="flex-1 flex flex-col justify-center gap-3 py-4 border-t border-[var(--border-default)] mt-1">
                    <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
                            <Flame size={15} className="text-[var(--break)]" />
                            {stats.streak > 0 ? `${stats.streak}-day streak` : 'Start your streak'}
                        </span>
                        <span className="text-[11px] font-medium text-[var(--text-tertiary)] tabular-nums">
                            {weekActiveCount}/7 days this week
                        </span>
                    </div>

                    <div className="relative flex items-start justify-between">
                        {/* connecting track behind the day dots */}
                        <div className="absolute left-[7%] right-[7%] top-[18px] h-[3px] rounded-full bg-[var(--bg-tertiary)]" />
                        {weekDays.map(day => (
                            <div key={day.key} className="relative flex flex-col items-center gap-1.5 z-10">
                                <div
                                    className={cn(
                                        'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                                        day.active
                                            ? 'bg-[var(--break)] text-white shadow-[0_2px_8px_-1px_var(--break)]'
                                            : day.future
                                                ? 'bg-[var(--bg-tertiary)] opacity-40'
                                                : 'bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-hover)]',
                                        day.today && !day.active && 'ring-2 ring-[var(--break)] ring-offset-2 ring-offset-[var(--bg-card)]'
                                    )}
                                >
                                    {day.active && <Flame size={16} className="fill-current" />}
                                    {!day.active && !day.future && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                                    )}
                                </div>
                                <span className={cn(
                                    'text-[10px] font-bold uppercase',
                                    day.today ? 'text-[var(--break)]' : 'text-[var(--text-muted)]'
                                )}>
                                    {day.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-auto text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-3 border-t border-[var(--border-default)]">
                    <span className="mr-1">Less</span>
                    {[0, 15, 45, 90, 150].map(m => (
                        <div key={m} style={getCellStyle(m)} className="w-[10px] h-[10px] rounded-[2px]" />
                    ))}
                    <span className="ml-1">More</span>
                </div>
            </div>

            <Tooltip
                id="heatmap-tooltip"
                className="!bg-[var(--bg-secondary)] border border-[var(--border-default)] !text-[var(--text-primary)] !text-xs !font-bold shadow-xl !rounded-lg z-50"
                delayShow={100}
            />
        </div>

        {/* Streak card — balanced vertical rhythm so there's no dead space */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] shadow-[var(--shadow-soft)] p-5 w-full lg:w-[228px] shrink-0 flex flex-col relative overflow-hidden">
            {/* soft ambient wash behind the hero */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--accent-primary)]/[0.10] to-transparent pointer-events-none" />

            {/* Hero streak — centered, given room to breathe */}
            <div className="relative flex flex-1 flex-col items-center justify-center text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/12 mb-4">
                    <Flame size={24} className="text-[var(--accent-primary)]" />
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-[44px] font-extrabold leading-none tabular-nums text-[var(--text-primary)]">{stats.streak}</span>
                    <span className="text-[15px] font-bold text-[var(--text-muted)]">{stats.streak === 1 ? 'day' : 'days'}</span>
                </div>
                <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Current streak</span>

                <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-tertiary)] max-w-[170px]">
                    {stats.streak > 0
                        ? 'Keep it going — focus today to extend your streak.'
                        : 'Start a focus session today to begin your streak.'}
                </p>
            </div>

            {/* Sub-stats */}
            <div className="relative grid grid-cols-2 border-y border-[var(--border-default)] divide-x divide-[var(--border-default)]">
                <div className="flex flex-col items-center justify-center py-3 gap-1">
                    <span className="text-[17px] font-bold tabular-nums text-[var(--text-primary)] leading-none">{stats.activeDays}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Active days</span>
                </div>
                <div className="flex flex-col items-center justify-center py-3 gap-1">
                    <span className="text-[17px] font-bold tabular-nums text-[var(--text-primary)] leading-none">{stats.totalStr}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Total focus</span>
                </div>
            </div>

            {/* Share */}
            <button
                onClick={openShare}
                className="relative mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-[14px] bg-[var(--accent-primary)] text-[var(--bg-card)] text-[12px] font-bold uppercase tracking-wider transition-all hover:opacity-90 active:scale-[0.98]"
            >
                <Share2 size={14} />
                Share focus map
            </button>
        </div>

        {/* Share dialog */}
        {shareOpen && (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                onClick={() => setShareOpen(false)}
            >
                <div
                    className="w-full max-w-[420px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] shadow-2xl p-6 animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between mb-1">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Share focus map</p>
                            <h3 className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">Your {stats.streak}-day streak 🔥</h3>
                        </div>
                        <button
                            onClick={() => setShareOpen(false)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <p className="text-[13px] text-[var(--text-tertiary)] mb-4">
                        Anyone with this link can view your focus map. {stats.totalStr} total · {stats.activeDays} active days.
                    </p>

                    {/* Public link */}
                    <div className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-default)]">
                        <Link2 size={14} className="shrink-0 text-[var(--text-muted)]" />
                        <span className="flex-1 min-w-0 truncate text-[12px] text-[var(--text-secondary)]">
                            {isSharing ? 'Creating link…' : linkError ? linkError : shareLink}
                        </span>
                        {isSharing && <Loader2 size={14} className="shrink-0 animate-spin text-[var(--text-muted)]" />}
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleCopyLink}
                            disabled={!shareLink}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] font-semibold transition-all hover:bg-[var(--bg-secondary)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {copied ? <Check size={15} className="text-[var(--accent-primary)]" /> : <Link2 size={15} />}
                            {copied ? 'Copied!' : 'Copy link'}
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={handleWhatsApp}
                                disabled={!shareLink}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-[#25D366] text-white text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Share2 size={15} />
                                WhatsApp
                            </button>
                            <button
                                onClick={handleShareImage}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                            >
                                <ImageDown size={15} />
                                Image
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    )
}
