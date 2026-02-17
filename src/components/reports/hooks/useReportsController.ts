import { useState, useEffect, useMemo } from 'react'
import { endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks, eachDayOfInterval, format } from 'date-fns'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import {
    calculateRangeFocus,
    calculateMultiDayStats,
    calculateFocusDistribution,
    calculateStreak,
    formatTime
} from '@/utils/timeCalculations'
import type { FocusSession } from '@/types/database'
import type { DateRange } from '../components/DateRangePicker'

export type ViewMode = 'week' | 'month'

export const useReportsController = () => {
    // 1. STORE HOOKS
    // Removed 'elapsed' dependency as it's not needed for active session calculation (we use Date.now() - startTime)
    const { sessions, loading: sessionsLoading, fetchSessions, isActive, startTime, taskId, sessionType } = useFocusStore()
    const { tasks } = useTaskStore()
    const { lists } = useListStore()

    // 2. LOCAL STATE
    const [viewMode, setViewMode] = useState<ViewMode>('week')
    const [dateRange, setDateRange] = useState<DateRange>({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
        label: 'This Week'
    })

    // LIVE TICKER STATE: Force re-render every second when active
    const [tick, setTick] = useState(0)

    // 3. INITIAL DATA FETCH & LIVE TICKER
    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isActive) {
            interval = setInterval(() => {
                setTick(t => t + 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isActive])

    // helper to avoid duplication
    const activeVirtualSession = useMemo<FocusSession | null>(() => {
        if (!isActive || !startTime || !taskId) return null

        const now = Date.now()
        const activeBonus = Math.floor((now - startTime) / 1000)

        const dbType = (sessionType === 'focus' || sessionType === 'break' || sessionType === 'long_break')
            ? sessionType
            : 'focus'

        return {
            id: 'virtual-active',
            user_id: 'current',
            task_id: taskId,
            type: dbType,
            seconds: activeBonus,
            start_time: new Date(startTime).toISOString(),
            end_time: null,
            created_at: new Date(startTime).toISOString(),
            synced: 0,
            metadata: null
        }
    }, [isActive, startTime, taskId, sessionType, tick])

    // 4. MEMOIZED STATS CALCULATION
    const stats = useMemo(() => {
        // 1. Prepare Lists
        // Full list (for lifetime stats) - Prepend active session so it's fresh
        const allSessions = activeVirtualSession ? [activeVirtualSession, ...sessions] : sessions

        // Range list (for charts, distribution, period stats)
        const sessionsInWindow = allSessions.filter(s => {
            if (!s.start_time) return false
            const start = new Date(s.start_time)
            return start >= dateRange.start && start <= dateRange.end
        })

        // 2. Total Focus Time (Lifetime - All Sessions)
        const totalFocusSeconds = allSessions.reduce((sum, s) => sum + (s.seconds || 0), 0)

        // 3. Date Range Calculations (Period Focus - Windows Sessions)
        const rangeFocusSeconds = sessionsInWindow.reduce((sum, s) => sum + (s.seconds || 0), 0)

        const currentPeriodLabel = viewMode === 'week' ? 'This Week' : 'This Month'

        // 4. Comparison (Trend)
        let prevStart: Date, prevEnd: Date
        if (viewMode === 'week') {
            prevStart = subWeeks(dateRange.start, 1)
            prevEnd = endOfWeek(prevStart, { weekStartsOn: 1 })
        } else {
            prevStart = subMonths(dateRange.start, 1)
            prevEnd = endOfMonth(prevStart)
        }

        // Prev range uses full list but filtered internally by helper
        // Removed 'activeElapsed' arg (0) as it was dead logic
        const prevRangeSeconds = calculateRangeFocus(sessions, prevStart, prevEnd)

        const trendPercentage = prevRangeSeconds > 0
            ? Math.round(((rangeFocusSeconds - prevRangeSeconds) / prevRangeSeconds) * 100)
            : 0

        // 5. Daily Breakdown (Chart Data)
        // Removed 'activeElapsed' arg (0)
        const daysInInterval = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
        const dailyStats = calculateMultiDayStats(sessionsInWindow, tasks, daysInInterval)

        // 6. Focus Distribution (Per Task) - NOW RESPECTS RANGE
        const focusPerTask = calculateFocusDistribution(sessionsInWindow)
            .map(item => {
                const task = tasks.find(t => t.id === item.taskId)
                return {
                    ...item,
                    taskTitle: task?.title || 'Unknown Task',
                }
            })
            .slice(0, 10)

        // 7. Streak (Use allSessions because streak looks back in time beyond window)
        const currentStreak = calculateStreak(allSessions)

        // 8. Deep Work 
        // Correct logic: Type is 'deep_work' OR 'focus' > 25m
        const deepWorkSeconds = sessionsInWindow
            .filter(s => (s.type === 'focus' && (s.seconds || 0) > 25 * 60))
            .reduce((sum, s) => sum + (s.seconds || 0), 0)

        return {
            totalFocus: formatTime(totalFocusSeconds), // Lifetime
            periodFocus: formatTime(rangeFocusSeconds), // Window
            periodLabel: currentPeriodLabel,
            trend: {
                percentage: trendPercentage,
                isPositive: trendPercentage >= 0
            },
            chartData: dailyStats.map(d => ({
                day: format(d.date, 'EEE'),
                fullDate: format(d.date, 'yyyy-MM-dd'),
                minutes: d.focusMinutes,
                tasks: d.tasksCompleted
            })),
            focusPerTask,
            currentStreak,
            deepWorkHours: Math.round(deepWorkSeconds / 3600 * 10) / 10,

            rawTotalSeconds: totalFocusSeconds,
            rawPeriodSeconds: rangeFocusSeconds
        }

    }, [sessions, tasks, lists, dateRange, viewMode, activeVirtualSession])

    // 5. TIMELINE DATA (Session Log)
    const timelineItems = useMemo(() => {
        const sourceList = activeVirtualSession ? [activeVirtualSession, ...sessions] : sessions

        return sourceList
            .filter(s => {
                if (!s.start_time) return false
                const start = new Date(s.start_time)
                return start >= dateRange.start && start <= dateRange.end
            })
            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
            .map(s => {
                const task = tasks.find(t => t.id === s.task_id)
                let notes = null;
                try {
                    const meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
                    notes = meta?.notes || null
                } catch (e) { /* ignore */ }

                return {
                    id: s.id,
                    title: task?.title || 'Untitled Session',
                    duration: formatTime(s.seconds),
                    startTime: format(new Date(s.start_time), 'h:mm a'),
                    type: s.type,
                    notes: notes,
                    isRunning: s.id === 'virtual-active'
                }
            })
    }, [sessions, tasks, dateRange, activeVirtualSession])


    return {
        viewMode,
        setViewMode,
        dateRange,
        setDateRange,
        stats,
        timelineItems,
        isLoading: sessionsLoading
    }
}
