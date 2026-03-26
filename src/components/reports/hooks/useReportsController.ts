import { useState, useEffect, useMemo } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useSettingsStore } from '@/store/settingsStore'
import {
    calculateMultiDayStats,
    calculateFocusDistribution,
    calculateStreak,
    formatTime,
    calculateDayFocus,
    isFocusType
} from '@/utils/timeCalculations'
import type { FocusSession } from '@/types/database'
import type { DateRange } from '../components/DateRangePicker'
import type { ComprehensiveReportStats, DailyChartData } from '../types/reports.types'

export type ViewMode = 'week' | 'month'

export const useReportsController = () => {
    // 1. STORE HOOKS
    const { sessions, loading: sessionsLoading, fetchSessions, isActive, startTime, taskId, sessionType, currentSessionId } = useFocusStore()
    const { tasks, fetchTasks } = useTaskStore()
    const { lists } = useListStore()
    const { dailyFocusGoalMinutes } = useSettingsStore()

    // 2. LOCAL STATE
    const [viewMode, setViewMode] = useState<ViewMode>('week')
    const [dateRange, setDateRange] = useState<DateRange>({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
        label: 'This Week'
    })

    // 3. INITIAL DATA FETCH
    useEffect(() => {
        fetchSessions()
        fetchTasks()
    }, [fetchSessions, fetchTasks])

    // Active virtual session — depends only on session identity, not on elapsed time.
    // Elapsed is computed at stats-evaluation time from startTime so we don't tick every second.
    const activeVirtualSession = useMemo<FocusSession | null>(() => {
        if (!isActive || !startTime || !taskId) return null

        const dbType = (sessionType === 'focus' || sessionType === 'break' || sessionType === 'long_break')
            ? sessionType
            : 'focus'

        return {
            id: 'virtual-active',
            user_id: 'current',
            task_id: taskId,
            type: dbType,
            seconds: Math.floor((Date.now() - startTime) / 1000),
            start_time: new Date(startTime).toISOString(),
            end_time: null,
            created_at: new Date(startTime).toISOString(),
            synced: 0,
            metadata: null
        }
    }, [isActive, startTime, taskId, sessionType])

    // UNIFIED SESSION LIST (Fixes Double Logging)
    const allSessions = useMemo(() => {
        // Filter out the currently active session from the store list to avoid duplicates
        // when we add the virtual active session
        const storedSessions = sessions.filter(s => s.id !== currentSessionId)
        return activeVirtualSession ? [activeVirtualSession, ...storedSessions] : storedSessions
    }, [sessions, currentSessionId, activeVirtualSession])

    // 4. MEMOIZED STATS CALCULATION
    const stats = useMemo<ComprehensiveReportStats>(() => {

        // Range list (for charts, distribution, period stats)
        const sessionsInWindow = allSessions.filter(s => {
            if (!s.start_time) return false
            const start = new Date(s.start_time)
            return start >= dateRange.start && start <= dateRange.end
        })

        // A. Basic Totals
        // Re-implementing logic similar to calculateRangeFocus but using our sessionsInWindow
        const rangeFocusSeconds = sessionsInWindow
            .filter(s => isFocusType(s.type))
            .reduce((sum, s) => sum + (s.seconds || 0), 0)

        const totalBreakSeconds = sessionsInWindow
            .filter(s => ['break', 'long_break'].includes(s.type as string))
            .reduce((sum, s) => sum + (s.seconds || 0), 0)

        // Efficiency Score: Focus / (Focus + Break)
        const totalActivity = rangeFocusSeconds + totalBreakSeconds
        const efficiencyScore = totalActivity > 0
            ? Math.round((rangeFocusSeconds / totalActivity) * 100)
            : 0

        // B. Today's Focus
        const todayFocusSeconds = calculateDayFocus(allSessions, new Date())

        // C. Daily Breakdown (Chart Data)
        const daysInInterval = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
        const dailyStats = calculateMultiDayStats(sessionsInWindow, tasks, daysInInterval)

        // Consistency: Days with focus >= goal
        const daysWithFocus = dailyStats.filter(d => d.focusMinutes >= (dailyFocusGoalMinutes || 1)).length
        const totalDays = dailyStats.length
        const rangeConsistency = totalDays > 0 ? Math.round((daysWithFocus / totalDays) * 100) : 0

        // D. Focus Distribution
        const focusPerTask = calculateFocusDistribution(sessionsInWindow)
            .map(item => {
                const task = tasks.find(t => t.id === item.taskId)
                return {
                    ...item,
                    taskTitle: task?.title || 'Unknown Task',
                    taskId: item.taskId
                }
            })
            .slice(0, 10)

        // E. Streak
        const currentStreak = calculateStreak(allSessions)

        // F. Deep Work


        const chartData: DailyChartData[] = dailyStats.map(d => ({
            date: d.date,
            label: d.label,
            focusMinutes: d.focusMinutes,
            breakMinutes: d.breakMinutes,
            tasksCompleted: d.tasksCompleted,
            goalMet: d.focusMinutes >= (dailyFocusGoalMinutes || 1)
        }))

        return {
            focusTime: {
                totalMinutesToday: Math.round(todayFocusSeconds / 60),
                totalMinutesWeek: Math.round(rangeFocusSeconds / 60), // Approximation for window
                focusPerTask,
                deepWorkSessionsCount: sessionsInWindow.filter(s => s.seconds > 25 * 60).length
            },
            taskCompletion: {
                completedToday: tasks.filter(t => t.completed_at && isSameDay(new Date(t.completed_at), new Date())).length,
                completionRatePercent: 0, // TODO: Calculate if needed
                overdueTasks: 0,
                completedByList: []
            },
            streaks: {
                dailyFocusStreak: currentStreak,
                dailyCompletionStreak: 0
            },
            productivity: {
                weeklyData: chartData,
                monthlyData: [],
                focusDistributionByDay: [],
                mostProductiveTimeOfDay: []
            },

            // Legacy / Flat Props
            totalFocusDisplay: formatTime(rangeFocusSeconds),
            totalBreakDisplay: formatTime(totalBreakSeconds),
            efficiencyScore,
            chartData,
            currentStreak,
            rangeConsistency,
            // FIX: Use dateRange.label directly
            periodLabel: dateRange.label,
            minutesToday: Math.round(todayFocusSeconds / 60),
            timelineData: [], // Not used here directly
            activeTasks: [],
            listDist: []
        }

    }, [allSessions, tasks, lists, dateRange, dailyFocusGoalMinutes])

    // 5. TIMELINE DATA (Session Log)
    const timelineItems = useMemo(() => {
        return allSessions
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
                    task_id: s.task_id,
                    title: task?.title || 'Unknown Task', // Handle deleted tasks
                    duration: formatTime(s.seconds),
                    startTime: format(new Date(s.start_time), 'h:mm a'),
                    rawStartTime: s.start_time,
                    type: s.type,
                    notes: notes,
                    isRunning: s.id === 'virtual-active'
                }
            })
    }, [allSessions, tasks, dateRange])

    // 6. COMPLETED TASKS LOG (Grouped by Day)
    const completedTasksGrouped = useMemo(() => {
        // 1. Filter tasks completed in range
        const completedInRange = tasks.filter(t => {
            if (!t.completed_at) return false
            const completedDate = new Date(t.completed_at)
            return completedDate >= dateRange.start && completedDate <= dateRange.end
        })

        // 2. Group by Date
        const groups: Record<string, any[]> = {}

        // Pre-calculate session sums for ALL tasks (needed for total duration)
        // We use ALL sessions here, not just window sessions, to get accurate task effort
        const taskDurations = new Map<string, number>()
        allSessions.forEach(s => {
            if (s.task_id && (s.seconds || 0) > 0) {
                const current = taskDurations.get(s.task_id) || 0
                taskDurations.set(s.task_id, current + s.seconds)
            }
        })

        completedInRange.forEach(task => {
            const dateStr = format(parseISO(task.completed_at!), 'yyyy-MM-dd')
            if (!groups[dateStr]) groups[dateStr] = []

            const totalSeconds = taskDurations.get(task.id) || 0

            // Find list info
            const list = lists.find(l => l.id === task.list_id)

            groups[dateStr].push({
                id: task.id,
                title: task.title,
                completedAt: task.completed_at!,
                totalSeconds,
                totalDurationFormatted: formatTime(totalSeconds),
                listName: list?.name,
                listColor: list?.color
            })
        })

        // 3. Convert to array and sort
        return Object.entries(groups)
            .map(([date, items]) => ({
                date,
                items: items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    }, [tasks, allSessions, dateRange, lists])


    return {
        viewMode,
        setViewMode,
        dateRange,
        setDateRange,
        stats,
        timelineItems,
        completedTasksGrouped,
        isLoading: sessionsLoading,
        dailyFocusGoalMinutes
    }
}
