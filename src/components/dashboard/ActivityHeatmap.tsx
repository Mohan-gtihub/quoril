import { useMemo } from 'react'
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
import { Award, CalendarDays } from 'lucide-react'
import { isFocusType } from '@/utils/timeCalculations'

export function ActivityHeatmap() {
    const { sessions, isActive, startTime, sessionType } = useFocusStore()

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

    const getColorClass = (minutes: number) => {
        if (minutes === 0) return 'bg-[var(--track)]'
        if (minutes < 30) return 'bg-[var(--accent-primary)]/25'
        if (minutes < 60) return 'bg-[var(--accent-primary)]/50'
        if (minutes < 120) return 'bg-[var(--accent-primary)]/75'
        return 'bg-[var(--accent-primary)]'
    }

    // 3. Contextual Stats (This Month, Best Day, Current Streak)
    const stats = useMemo(() => {
        let monthMins = 0
        let bestDay = { date: '', mins: 0 }

        const thisMonthStart = startOfMonth(new Date())

        Object.entries(activityMap).forEach(([dateStr, mins]) => {
            const d = new Date(dateStr)

            // This month total
            if (isAfter(d, thisMonthStart) || d.getTime() === thisMonthStart.getTime()) {
                monthMins += mins
            }
            // Best day
            if (mins > bestDay.mins) {
                bestDay = { date: dateStr, mins }
            }
        })

        const fmtHrs = (m: number) => {
            if (m < 60) return `${Math.round(m)}m`
            const h = Math.floor(m / 60)
            const remainingMins = Math.round(m % 60)
            return remainingMins > 0 ? `${h}h ${remainingMins}m` : `${h}h`
        }

        return {
            monthStr: fmtHrs(monthMins),
            bestStr: bestDay.date ? `${format(new Date(bestDay.date), 'EEEE')} (${fmtHrs(bestDay.mins)})` : 'None yet',
        }
    }, [activityMap])

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] shadow-[var(--shadow-soft)] p-5 w-full flex flex-col animate-in fade-in duration-500 relative overflow-hidden">
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
                <div className="flex mb-4">
                    {/* Day Labels (Y-axis) */}
                    <div className="grid grid-rows-7 gap-[3px] pr-3 text-[11px] font-bold text-[var(--text-muted)] text-right opacity-60">
                        <div className="h-[12px] leading-[12px]"></div>
                        <div className="h-[12px] leading-[12px]">Mon</div>
                        <div className="h-[12px] leading-[12px]"></div>
                        <div className="h-[12px] leading-[12px]">Wed</div>
                        <div className="h-[12px] leading-[12px]"></div>
                        <div className="h-[12px] leading-[12px]">Fri</div>
                        <div className="h-[12px] leading-[12px]"></div>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <div className="flex gap-[3px] min-w-max">
                            {days.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-[3px]">
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
                                                    "w-[12px] h-[12px] rounded-[3px] transition-all duration-300",
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
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--track)]" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--accent-primary)]/25" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--accent-primary)]/50" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--accent-primary)]/75" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--accent-primary)]" />
                    <span className="ml-1">More</span>
                </div>
            </div>

            <Tooltip
                id="heatmap-tooltip"
                className="!bg-[var(--bg-secondary)] border border-[var(--border-default)] !text-[var(--text-primary)] !text-xs !font-bold shadow-xl !rounded-lg z-50"
                delayShow={100}
            />
        </div>
    )
}
