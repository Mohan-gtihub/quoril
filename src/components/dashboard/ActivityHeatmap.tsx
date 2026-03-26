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
import { Award, CalendarDays, Flame } from 'lucide-react'
import { calculateStreak, isFocusType } from '@/utils/timeCalculations'

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
        if (minutes === 0) return 'bg-[var(--bg-hover)]'
        if (minutes < 30) return 'bg-[#10b981]/30'
        if (minutes < 60) return 'bg-[#10b981]/50'
        if (minutes < 120) return 'bg-[#10b981]/80 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
        return 'bg-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.5)]'
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
            streakCount: calculateStreak(sessions)
        }
    }, [activityMap, sessions])

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 w-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-[14px] font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        Focus Map
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] font-medium">Daily deep work</p>
                </div>

                {/* Contextual Badges */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                        <CalendarDays size={12} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-[var(--text-primary)]">{stats.monthStr} <span className="text-[var(--text-muted)] font-medium">this month</span></span>
                    </div>
                    <div className="bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                        <Award size={12} className="text-amber-400" />
                        <span className="text-[10px] font-bold text-[var(--text-primary)]">Best: <span className="text-[var(--text-muted)] font-medium">{stats.bestStr}</span></span>
                    </div>
                    <div className="bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                        <Flame size={12} className={stats.streakCount > 0 ? "text-orange-500 animate-pulse" : "text-[var(--text-muted)]"} />
                        <span className="text-[10px] font-bold text-[var(--text-primary)]">{stats.streakCount} Day <span className="text-[var(--text-muted)] font-medium">Streak</span></span>
                    </div>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="flex flex-col w-full">
                <div className="flex mb-4">
                    {/* Day Labels (Y-axis) */}
                    <div className="grid grid-rows-7 gap-[3px] pr-3 text-[9px] font-bold text-[var(--text-muted)] text-right opacity-60">
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

                <div className="flex items-center justify-end gap-1.5 mt-2 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest pt-2 border-t border-[var(--border-default)]">
                    <span className="mr-1">Less</span>
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[var(--bg-hover)]" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[#10b981]/30" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[#10b981]/50" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[#10b981]/80" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
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
