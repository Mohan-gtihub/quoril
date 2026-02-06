import { useMemo, useEffect, useState } from 'react'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useSettingsStore } from '@/store/settingsStore'
import {
    format,
    subDays,
    isSameDay,
    parseISO,
    startOfDay,
    eachDayOfInterval,
    endOfDay,
    isWithinInterval
} from 'date-fns'
import type { DateRange } from '../components/DateRangePicker'
import type { ReportStats, TimelineGroup, SessionItem } from '../types/reports.types'

export function useReportsController() {
    const { sessions, fetchSessions } = useFocusStore()
    const { tasks, fetchTasks } = useTaskStore()
    const { lists, fetchLists } = useListStore()
    const { dailyFocusGoalMinutes } = useSettingsStore()

    const [dateRange, setDateRange] = useState<DateRange>({
        start: subDays(startOfDay(new Date()), 6),
        end: startOfDay(new Date()),
        label: 'Last 7 Days'
    })

    useEffect(() => {
        fetchSessions()
        fetchTasks()
        fetchLists()
    }, [fetchSessions, fetchTasks, fetchLists])

    const stats = useMemo<ReportStats>(() => {
        // Filter sessions within range
        const filteredSessions = sessions.filter(s => {
            const start = parseISO(s.start_time)
            return isWithinInterval(start, { start: dateRange.start, end: endOfDay(dateRange.end) })
        })

        // Filter valid tasks
        const activeTasks = tasks.filter(t => !t.deleted_at)

        // --- 1. Total Stats ---
        const totalFocusSeconds = filteredSessions
            .filter(s => s.type !== 'break')
            .reduce((acc, s) => acc + (s.seconds ?? 0), 0)

        const totalBreakSeconds = filteredSessions
            .filter(s => s.type === 'break')
            .reduce((acc, s) => acc + (s.seconds ?? 0), 0)

        const totalSeconds = totalFocusSeconds + totalBreakSeconds
        const efficiencyScore = totalSeconds > 0
            ? Math.round((totalFocusSeconds / totalSeconds) * 100)
            : 0

        // --- 2. Chart Data (Daily) ---
        const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })

        const chartData = days.map(day => {
            const daySessions = filteredSessions.filter(s => isSameDay(parseISO(s.start_time), day))

            const focusSec = daySessions
                .filter(s => s.type !== 'break')
                .reduce((acc, s) => acc + (s.seconds ?? 0), 0)

            const breakSec = daySessions
                .filter(s => s.type === 'break')
                .reduce((acc, s) => acc + (s.seconds ?? 0), 0)

            return {
                date: day,
                label: format(day, 'MMM dd'),
                focusHours: Number((focusSec / 3600).toFixed(1)),
                breakHours: Number((breakSec / 3600).toFixed(1)),
                totalMinutes: Math.round((focusSec + breakSec) / 60),
                focusMinutes: Math.round(focusSec / 60),
                goalMet: Math.round(focusSec / 60) >= dailyFocusGoalMinutes
            }
        })

        // --- 3. Streak Logic (Global Check) ---
        const allDaysWithActivity = new Set<string>()
        sessions.forEach(s => {
            if (s.type !== 'break' && (s.seconds ?? 0) > 0) {
                allDaysWithActivity.add(format(parseISO(s.start_time), 'yyyy-MM-dd'))
            }
        })

        let currentStreak = 0
        let checkDate = startOfDay(new Date())

        if (allDaysWithActivity.has(format(checkDate, 'yyyy-MM-dd'))) {
            currentStreak++
            checkDate = subDays(checkDate, 1)
            while (allDaysWithActivity.has(format(checkDate, 'yyyy-MM-dd'))) {
                currentStreak++
                checkDate = subDays(checkDate, 1)
            }
        } else {
            checkDate = subDays(checkDate, 1)
            while (allDaysWithActivity.has(format(checkDate, 'yyyy-MM-dd'))) {
                currentStreak++
                checkDate = subDays(checkDate, 1)
            }
        }

        // Consistency
        const daysWithFocus = chartData.filter(d => d.focusMinutes > 0).length
        const rangeConsistency = days.length > 0 ? Math.round((daysWithFocus / days.length) * 100) : 0

        // --- 4. Timeline / Session Log (Grouped by Day) ---
        const sessionsByDay = filteredSessions.reduce((acc, s) => {
            const dKey = format(parseISO(s.start_time), 'yyyy-MM-dd')
            if (!acc[dKey]) acc[dKey] = []

            // Map to strict SessionItem to avoid type errors
            const item: SessionItem = {
                id: s.id,
                task_id: s.task_id,
                start_time: s.start_time,
                end_time: s.end_time || null,
                seconds: s.seconds,
                type: s.type,
                // Cast or fallback for fields that might not be in generic FocusSession
                planned_seconds: (s as any).planned_seconds
            }

            acc[dKey].push(item)
            return acc
        }, {} as Record<string, SessionItem[]>)

        const timelineData: TimelineGroup[] = Object.entries(sessionsByDay)
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
            .map(([date, items]) => {
                return {
                    date,
                    items: items.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                }
            })

        // --- 5. Today's Progress ---
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const todayStats = chartData.find(d => format(d.date, 'yyyy-MM-dd') === todayStr)
        const minutesToday = todayStats ? todayStats.focusMinutes : 0

        // --- 6. Distribution Pie ---
        const listDist = lists.map(l => {
            const listSec = filteredSessions
                .filter(s => {
                    if (s.type === 'break') return false
                    const task = activeTasks.find(t => t.id === s.task_id)
                    return task?.list_id === l.id
                })
                .reduce((acc, s) => acc + (s.seconds ?? 0), 0)

            return {
                name: l.name,
                value: Math.round(listSec / 60),
                color: l.color
            }
        }).filter(item => item.value > 0).sort((a, b) => b.value - a.value)


        return {
            totalFocusDisplay: `${Math.floor(totalFocusSeconds / 3600)}h ${Math.floor((totalFocusSeconds % 3600) / 60)}m`,
            totalBreakDisplay: `${Math.floor(totalBreakSeconds / 3600)}h ${Math.floor((totalBreakSeconds % 3600) / 60)}m`,
            efficiencyScore,
            chartData,
            currentStreak,
            rangeConsistency,
            minutesToday,
            timelineData,
            activeTasks,
            listDist
        }
    }, [sessions, tasks, lists, dateRange, dailyFocusGoalMinutes])

    return {
        stats,
        dateRange,
        setDateRange,
        dailyFocusGoalMinutes
    }
}
