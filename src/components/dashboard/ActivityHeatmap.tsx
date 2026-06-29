import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
    subMonths,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isToday,
    startOfMonth,
    isAfter
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

    // 2. Generate date grid for the last 6 months (aligned to week start/end)
    const { days } = useMemo(() => {
        const endDate = endOfWeek(new Date())
        const startDate = startOfWeek(subMonths(endDate, 6))

        const allDays = eachDayOfInterval({ start: startDate, end: endDate })

        const weeks = []
        for (let i = 0; i < allDays.length; i += 7) {
            weeks.push(allDays.slice(i, i + 7))
        }

        return { days: weeks }
    }, [])

    // GitHub's exact contribution-graph palette (light: L0–L4, dark: L0–L4)
    const getColorClass = (minutes: number) => {
        if (minutes === 0) return 'bg-[var(--gh-l0)]'
        if (minutes < 30) return 'bg-[var(--gh-l1)]'
        if (minutes < 60) return 'bg-[var(--gh-l2)]'
        if (minutes < 120) return 'bg-[var(--gh-l3)]'
        return 'bg-[var(--gh-l4)]'
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
            <div className="flex items-start justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Focus map</h2>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Daily deep work</p>
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
            <div className="flex flex-col w-full">
                <div className="flex items-stretch mb-4">
                    {/* Day Labels (Y-axis) */}
                    <div className="flex flex-col gap-[3px] pr-2 text-[10px] font-bold text-[var(--text-muted)] text-right opacity-60">
                        {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                            <div key={i} className="flex-1 flex items-center justify-end leading-none">{label}</div>
                        ))}
                    </div>

                    {/* Grid — columns flex to fill the full width, cells stay square */}
                    <div className="flex-1 min-w-0">
                        <div className="flex gap-[3px] w-full">
                            {days.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-1 flex-col gap-[3px]">
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
                                                className={cn(
                                                    "w-full aspect-square rounded-[2px] transition-all duration-300",
                                                    isFuture ? "opacity-10 bg-[var(--text-muted)]" : "cursor-crosshair hover:scale-125 z-0 hover:z-10",
                                                    !isFuture && getColorClass(mins),
                                                    today && "ring-1 ring-[var(--text-primary)] ring-offset-1 ring-offset-[var(--bg-card)] !opacity-100"
                                                )}
                                            />
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-3 border-t border-[var(--border-default)]">
                    <span className="mr-1">Less</span>
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--gh-l0)]" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--gh-l1)]" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--gh-l2)]" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--gh-l3)]" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--gh-l4)]" />
                    <span className="ml-1">More</span>
                </div>
            </div>

            <Tooltip
                id="heatmap-tooltip"
                className="!bg-[var(--bg-secondary)] border border-[var(--border-default)] !text-[var(--text-primary)] !text-xs !font-bold shadow-xl !rounded-lg z-50"
                delayShow={100}
            />
        </div>

        {/* Streak card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] shadow-[var(--shadow-soft)] p-4 w-full lg:w-[220px] shrink-0 flex flex-col relative overflow-hidden">
            {/* Hero streak */}
            <div className="relative flex flex-col items-center justify-center text-center py-2 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-primary)]/12 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent-primary)]/15 mb-2">
                    <Flame size={18} className="text-[var(--accent-primary)]" />
                </div>
                <div className="relative flex items-baseline gap-1">
                    <span className="text-[32px] font-extrabold leading-none tabular-nums text-[var(--text-primary)]">{stats.streak}</span>
                    <span className="text-[13px] font-bold text-[var(--text-muted)]">{stats.streak === 1 ? 'day' : 'days'}</span>
                </div>
                <span className="relative mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Current streak</span>
            </div>

            {/* Sub-stats */}
            <div className="grid grid-cols-2 mt-3 border-y border-[var(--border-default)] divide-x divide-[var(--border-default)]">
                <div className="flex flex-col items-center justify-center py-2.5 gap-0.5">
                    <span className="text-[15px] font-bold tabular-nums text-[var(--text-primary)] leading-none">{stats.activeDays}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Active</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2.5 gap-0.5">
                    <span className="text-[15px] font-bold tabular-nums text-[var(--text-primary)] leading-none">{stats.totalStr}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                </div>
            </div>

            {/* Share */}
            <button
                onClick={openShare}
                className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-[12px] bg-[var(--accent-primary)] text-[var(--bg-card)] text-[12px] font-bold uppercase tracking-wider transition-all hover:opacity-90 active:scale-[0.98]"
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
                            {copied ? <Check size={15} className="text-[var(--gh-l4)]" /> : <Link2 size={15} />}
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
