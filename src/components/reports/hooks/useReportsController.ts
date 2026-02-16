import { useMemo, useEffect, useState } from 'react'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useSettingsStore } from '@/store/settingsStore'
import {
    format,
    subDays,
    subMonths,
    parseISO,
    startOfDay,
    eachDayOfInterval,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    isToday
} from 'date-fns'
import type { DateRange, ComprehensiveReportStats } from '../types/reports.types'

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

    const [dailyActivity, setDailyActivity] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                await Promise.all([
                    fetchSessions(),
                    fetchTasks(),
                    fetchLists()
                ])

                const start = dateRange.start.toISOString()
                const end = endOfDay(dateRange.end).toISOString()
                const activity = await window.electronAPI.db.getDailyActivity(start, end)
                setDailyActivity(activity)
            } catch (e) {
                console.error('[ReportsController] Load failed:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [fetchSessions, fetchTasks, fetchLists, dateRange])

    const stats = useMemo<ComprehensiveReportStats>(() => {
        const { isActive, taskId: activeTaskId, elapsed } = useFocusStore.getState()

        // --- SIMPLIFIED APPROACH: Use Task Time as Source of Truth ---
        // Reports should ALWAYS match "Task Time Spent" - no complex normalization needed

        // Filter sessions within range for display purposes only (timeline, etc.)
        const filteredSessions = sessions.filter(s => {
            const start = parseISO(s.start_time)
            const end = s.end_time ? parseISO(s.end_time) : new Date()

            // Filter out corrupted sessions (>24h)
            if (s.seconds && s.seconds > 86400) return false
            // Filter out sessions with negative durations
            if (s.seconds && s.seconds < 0) return false

            return start <= endOfDay(dateRange.end) && end >= startOfDay(dateRange.start)
        })

        // Filter valid tasks
        const activeTasks = tasks.filter(t => !t.deleted_at)

        // --- 1. Total Stats Based on Task Data ---
        const totalFocusSeconds = activeTasks
            .filter(t => {
                // Only include tasks that have activity within the date range
                if (!t.actual_seconds || t.actual_seconds <= 0) return false

                // Check if task has any activity in the date range
                const taskStart = t.created_at ? parseISO(t.created_at) : new Date()
                const taskEnd = t.completed_at ? parseISO(t.completed_at) : new Date()

                return taskStart <= endOfDay(dateRange.end) && taskEnd >= startOfDay(dateRange.start)
            })
            .reduce((acc, t) => {
                // For active task, use live elapsed time
                let taskSeconds = t.actual_seconds || 0
                if (isActive && activeTaskId === t.id) {
                    taskSeconds = elapsed
                }

                // VALIDATION: Cap unreasonably high values
                const MAX_REASONABLE_SECONDS = 4 * 60 * 60 // 4 hours max per task
                if (taskSeconds > MAX_REASONABLE_SECONDS) {

                    taskSeconds = MAX_REASONABLE_SECONDS
                }

                return acc + taskSeconds
            }, 0)

        const totalBreakSeconds = filteredSessions
            .filter(s => s.type === 'break')
            .reduce((acc, s) => {
                const sStart = parseISO(s.start_time)
                const sEnd = s.end_time ? parseISO(s.end_time) : new Date()
                const actualStart = sStart < dateRange.start ? dateRange.start : sStart
                const actualEnd = sEnd > endOfDay(dateRange.end) ? endOfDay(dateRange.end) : sEnd
                const secs = Math.max(0, Math.floor((actualEnd.getTime() - actualStart.getTime()) / 1000))
                return acc + secs
            }, 0)

        const totalSeconds = totalFocusSeconds + totalBreakSeconds
        const efficiencyScore = totalSeconds > 0
            ? Math.round((totalFocusSeconds / totalSeconds) * 100)
            : 0

        // --- 2. Chart Data (Daily) - Use task data for focus time ---
        const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })

        const chartData = days.map(day => {
            const dayStart = startOfDay(day)
            const dayEnd = endOfDay(day)
            const dayStr = format(day, 'yyyy-MM-dd')

            // Use task data for focus time (more accurate)
            let focusSec = activeTasks
                .filter(t => {
                    if (!t.actual_seconds || t.actual_seconds <= 0) return false

                    // Check if task has activity on this day
                    const taskStart = t.created_at ? parseISO(t.created_at) : new Date()
                    const taskEnd = t.completed_at ? parseISO(t.completed_at) : new Date()

                    return taskStart <= dayEnd && taskEnd >= dayStart
                })
                .reduce((acc, t) => {
                    // For active task, use live elapsed time
                    let taskSeconds = t.actual_seconds || 0
                    if (isActive && activeTaskId === t.id) {
                        taskSeconds = elapsed
                    }

                    // VALIDATION: Cap unreasonably high values
                    const MAX_REASONABLE_SECONDS = 4 * 60 * 60 // 4 hours max per task
                    if (taskSeconds > MAX_REASONABLE_SECONDS) {

                        taskSeconds = MAX_REASONABLE_SECONDS
                    }

                    return acc + taskSeconds
                }, 0)

            // Still use session data for break time (since tasks don't track breaks)
            let breakSec = 0
            filteredSessions.forEach(s => {
                if (s.type !== 'break') return
                const sStart = parseISO(s.start_time)
                const sEnd = s.end_time ? parseISO(s.end_time) : new Date()

                // Check if session overlaps with this day
                if (sStart <= dayEnd && sEnd >= dayStart) {
                    // Calculate overlap - critical for sessions crossing midnight (11pm-1am)
                    const overlapStart = sStart > dayStart ? sStart : dayStart
                    const overlapEnd = sEnd < dayEnd ? sEnd : dayEnd

                    const secs = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 1000))
                    breakSec += secs
                }
            })

            // Count tasks completed on this day
            const tasksCompletedCount = activeTasks.filter(t => {
                if (!t.completed_at) return false
                const completedDate = format(parseISO(t.completed_at), 'yyyy-MM-dd')
                return completedDate === dayStr
            }).length

            const dayActivity = dailyActivity.find(a => a.day === dayStr)
            const activitySeconds = dayActivity ? dayActivity.totalSeconds : 0

            return {
                date: day,
                label: format(day, 'MMM dd'),
                focusHours: Number((focusSec / 3600).toFixed(1)),
                breakHours: Number((breakSec / 3600).toFixed(1)),
                totalMinutes: Math.round((focusSec + breakSec) / 60),
                focusMinutes: Math.round(focusSec / 60),
                activityMinutes: Math.round(activitySeconds / 60),
                goalMet: Math.round(focusSec / 60) >= dailyFocusGoalMinutes,
                tasksCompleted: tasksCompletedCount
            }
        })

        // --- 3. Streak Logic - Use task data for consistency ---
        const allDaysWithActivity = new Set<string>()

        // Use task data to determine days with activity
        activeTasks.forEach(t => {
            if (!t.actual_seconds || t.actual_seconds <= 0) return

            const taskStart = t.created_at ? parseISO(t.created_at) : new Date()
            const taskEnd = t.completed_at ? parseISO(t.completed_at) : new Date()

            // Add all days between task start and end
            let currentDay = startOfDay(taskStart)
            const endDay = startOfDay(taskEnd)

            while (currentDay <= endDay) {
                allDaysWithActivity.add(format(currentDay, 'yyyy-MM-dd'))
                currentDay = subDays(currentDay, -1) // Add 1 day
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

        // Task completion streak
        const allDaysWithCompletions = new Set<string>()
        activeTasks.forEach(t => {
            if (t.completed_at) {
                allDaysWithCompletions.add(format(startOfDay(parseISO(t.completed_at)), 'yyyy-MM-dd'))
            }
        })

        let completionStreak = 0
        checkDate = startOfDay(new Date())
        if (allDaysWithCompletions.has(format(checkDate, 'yyyy-MM-dd'))) {
            completionStreak++
            checkDate = subDays(checkDate, 1)
            while (allDaysWithCompletions.has(format(checkDate, 'yyyy-MM-dd'))) {
                completionStreak++
                checkDate = subDays(checkDate, 1)
            }
        } else {
            checkDate = subDays(checkDate, 1)
            while (allDaysWithCompletions.has(format(checkDate, 'yyyy-MM-dd'))) {
                completionStreak++
                checkDate = subDays(checkDate, 1)
            }
        }

        // Consistency
        const daysWithFocus = chartData.filter(d => d.focusMinutes > 0).length
        const rangeConsistency = days.length > 0 ? Math.round((daysWithFocus / days.length) * 100) : 0

        // --- 4. Timeline / Session Log ---
        const sessionsByDay = filteredSessions.reduce((acc, s) => {
            const dKey = format(parseISO(s.start_time), 'yyyy-MM-dd')
            if (!acc[dKey]) acc[dKey] = []

            acc[dKey].push({
                id: s.id,
                task_id: s.task_id,
                start_time: s.start_time,
                end_time: s.end_time || null,
                seconds: s.seconds,
                type: s.type,
                planned_seconds: (s as any).planned_seconds
            })
            return acc
        }, {} as Record<string, any[]>)

        const timelineData = Object.entries(sessionsByDay)
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
            .map(([date, items]) => ({
                date,
                items: items.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
            }))

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

        // --- NEW: Comprehensive Stats ---

        // A. Focus Time Stats
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

        // THIS WEEK - Simple task-based calculation with validation
        const totalMinutesWeek = Math.round(activeTasks
            .filter(t => {
                if (!t.actual_seconds || t.actual_seconds <= 0) return false

                // Check if task has activity this week
                const taskStart = t.created_at ? parseISO(t.created_at) : new Date()
                const taskEnd = t.completed_at ? parseISO(t.completed_at) : new Date()

                return taskStart <= weekEnd && taskEnd >= weekStart
            })
            .reduce((acc: number, t) => {
                // For active task, use live elapsed time
                let taskSeconds = t.actual_seconds || 0
                if (isActive && activeTaskId === t.id) {
                    taskSeconds = elapsed
                }

                // VALIDATION: Cap unreasonably high values
                const MAX_REASONABLE_SECONDS = 4 * 60 * 60 // 4 hours max per task
                if (taskSeconds > MAX_REASONABLE_SECONDS) {

                    taskSeconds = MAX_REASONABLE_SECONDS
                }

                return acc + taskSeconds
            }, 0) / 60)

        // TODAY focus time - Use task data with proper day allocation
        const todayStart_for_calc = startOfDay(new Date())
        const todayEnd_for_calc = endOfDay(new Date())
        const totalMinutesToday = Math.round(activeTasks
            .filter(t => {
                if (!t.actual_seconds || t.actual_seconds <= 0) return false

                // Check if task has activity today
                const taskStart = t.created_at ? parseISO(t.created_at) : new Date()
                const taskEnd = t.completed_at ? parseISO(t.completed_at) : new Date()

                return taskStart <= todayEnd_for_calc && taskEnd >= todayStart_for_calc
            })
            .reduce((acc: number, t) => {
                // For active task, use live elapsed time
                let taskSeconds = t.actual_seconds || 0
                if (isActive && activeTaskId === t.id) {
                    taskSeconds = elapsed
                }

                // VALIDATION: Cap unreasonably high values
                const MAX_REASONABLE_SECONDS = 4 * 60 * 60 // 4 hours max per task
                if (taskSeconds > MAX_REASONABLE_SECONDS) {

                    taskSeconds = MAX_REASONABLE_SECONDS
                }

                return acc + taskSeconds
            }, 0) / 60)

        // Focus per task (top 10) - Use task data for accuracy
        const focusPerTask = activeTasks
            .filter(t => {
                if (!t.actual_seconds || t.actual_seconds <= 0) return false
                // Only include tasks that are actually active (not completed/done)
                if (t.status === 'done' || t.completed_at) return false
                return true
            })
            .map(t => {
                // For active task, use live elapsed time
                let taskSeconds = t.actual_seconds || 0
                if (isActive && activeTaskId === t.id) {
                    taskSeconds = elapsed
                }

                // VALIDATION: Cap unreasonably high values
                const MAX_REASONABLE_SECONDS = 4 * 60 * 60 // 4 hours max per task
                if (taskSeconds > MAX_REASONABLE_SECONDS) {

                    taskSeconds = MAX_REASONABLE_SECONDS
                }

                return {
                    taskId: t.id,
                    taskTitle: t.title,
                    minutes: Math.round(taskSeconds / 60)
                }
            })
            .sort((a, b) => b.minutes - a.minutes)
            .slice(0, 10)

        const deepWorkSessionsCount = activeTasks
            .filter(t => {
                if (!t.actual_seconds || t.actual_seconds <= 0) return false
                // Count tasks with 25+ minutes as deep work sessions
                let taskSeconds = t.actual_seconds || 0
                if (isActive && activeTaskId === t.id) {
                    taskSeconds = elapsed
                }

                // VALIDATION: Cap unreasonably high values
                const MAX_REASONABLE_SECONDS = 4 * 60 * 60 // 4 hours max per task
                if (taskSeconds > MAX_REASONABLE_SECONDS) {

                    taskSeconds = MAX_REASONABLE_SECONDS
                }

                return taskSeconds >= 25 * 60
            }).length

        // B. Task Completion Stats
        const completedToday = activeTasks.filter(t => {
            if (!t.completed_at) return false
            return isToday(parseISO(t.completed_at))
        }).length

        const completedByList = lists.map(l => ({
            listName: l.name,
            count: activeTasks.filter(t => t.list_id === l.id && t.completed_at).length,
            color: l.color
        })).filter(item => item.count > 0).sort((a, b) => b.count - a.count)

        const totalTasks = activeTasks.length
        const completedTasks = activeTasks.filter(t => t.completed_at).length
        const completionRatePercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        const overdueTasks = activeTasks.filter(t => {
            if (t.completed_at || !t.due_at) return false
            return parseISO(t.due_at) < new Date()
        }).length

        // C. Productivity Trends

        // Weekly data (last 4 weeks) - Use task data with proper week allocation
        const weeklyData = []
        for (let i = 3; i >= 0; i--) {
            const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 })
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

            // Use task data with proper week boundary calculation
            const weekFocusMinutes = Math.round(activeTasks
                .filter(t => {
                    if (!t.actual_seconds || t.actual_seconds <= 0) return false

                    // Check if task has activity in this specific week
                    const taskStart = t.created_at ? parseISO(t.created_at) : new Date()
                    const taskEnd = t.completed_at ? parseISO(t.completed_at) : new Date()

                    // Only include if task overlaps with this week
                    return taskStart <= weekEnd && taskEnd >= weekStart
                })
                .reduce((acc: number, t) => {
                    // For active task, use live elapsed time
                    let taskSeconds = t.actual_seconds || 0
                    if (isActive && activeTaskId === t.id) {
                        taskSeconds = elapsed
                    }

                    // VALIDATION: Cap unreasonably high values
                    const MAX_REASONABLE_SECONDS = 4 * 60 * 60 // 4 hours max per task
                    if (taskSeconds > MAX_REASONABLE_SECONDS) {

                        taskSeconds = MAX_REASONABLE_SECONDS
                    }

                    return acc + taskSeconds
                }, 0) / 60)

            const weekTasks = activeTasks.filter(t => {
                if (!t.completed_at) return false
                const completed = parseISO(t.completed_at)
                return completed >= weekStart && completed <= weekEnd
            })

            weeklyData.push({
                date: weekStart,
                label: `Week ${format(weekStart, 'MMM dd')}`,
                focusMinutes: weekFocusMinutes,
                tasksCompleted: weekTasks.length
            })
        }

        // Monthly data (last 6 months) - Use task data with proper month allocation
        const monthlyData = []
        for (let i = 5; i >= 0; i--) {
            const monthStart = startOfMonth(subMonths(new Date(), i))
            const monthEnd = endOfMonth(monthStart)

            // Use task data with proper month boundary calculation
            const monthFocusMinutes = Math.round(activeTasks
                .filter(t => {
                    if (!t.actual_seconds || t.actual_seconds <= 0) return false

                    // Check if task has activity in this specific month
                    const taskStart = t.created_at ? parseISO(t.created_at) : new Date()

                    // For this debug version, only include tasks created in this month
                    return taskStart >= monthStart && taskStart <= monthEnd
                })
                .reduce((acc: number, t) => {
                    // For active task, use live elapsed time
                    let taskSeconds = t.actual_seconds || 0
                    if (isActive && activeTaskId === t.id) {
                        taskSeconds = elapsed
                    }

                    // VALIDATION: Cap unreasonably high values
                    const MAX_REASONABLE_SECONDS = 4 * 60 * 60 // 4 hours max per task
                    if (taskSeconds > MAX_REASONABLE_SECONDS) {

                        taskSeconds = MAX_REASONABLE_SECONDS
                    }


                    return acc + taskSeconds
                }, 0) / 60)



            const monthTasks = activeTasks.filter(t => {
                if (!t.completed_at) return false
                const completed = parseISO(t.completed_at)
                return completed >= monthStart && completed <= monthEnd
            })

            monthlyData.push({
                date: monthStart,
                label: format(monthStart, 'MMM yyyy'),
                focusMinutes: monthFocusMinutes,
                tasksCompleted: monthTasks.length
            })
        }

        return {
            // New comprehensive stats
            focusTime: {
                totalMinutesToday,
                totalMinutesWeek,
                focusPerTask,
                deepWorkSessionsCount
            },
            taskCompletion: {
                completedToday,
                completionRatePercent,
                overdueTasks,
                completedByList
            },
            streaks: {
                dailyFocusStreak: currentStreak,
                dailyCompletionStreak: completionStreak
            },
            productivity: {
                weeklyData,
                monthlyData,
                focusDistributionByDay: [], // Simplified for now
                mostProductiveTimeOfDay: [] // Simplified for now
            },

            // Legacy stats for backward compatibility
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
    }, [sessions, tasks, lists, dateRange, dailyFocusGoalMinutes, dailyActivity])

    const refreshData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                fetchSessions(),
                fetchTasks(),
                fetchLists()
            ])
            const start = dateRange.start.toISOString()
            const end = endOfDay(dateRange.end).toISOString()
            const activity = await window.electronAPI.db.getDailyActivity(start, end)
            setDailyActivity(activity)
        } catch (e) {
            console.error('[ReportsController] Refresh failed:', e)
        } finally {
            setLoading(false)
        }
    }

    return {
        stats,
        dateRange,
        setDateRange,
        dailyFocusGoalMinutes,
        loading,
        refreshData
    }
}
