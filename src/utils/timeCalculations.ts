import { format, parseISO, subDays } from 'date-fns'
import type { FocusSession, Task } from '@/types/database'

/**
 * SINGLE SOURCE OF TRUTH for all time calculations
 * Used by: Reports, Dashboard, Task Cards, Analytics
 * 
 * RULE: Sessions are the source of truth for time.
 * - session.seconds = how long each session was
 * - session.start_time = when the session happened (used for day grouping)
 * - session.type = 'focus' | 'break' | 'long_break'
 */

export interface DayStats {
    date: Date
    label: string
    focusSeconds: number
    breakSeconds: number
    focusMinutes: number
    breakMinutes: number
    totalMinutes: number
    tasksCompleted: number
}

/**
 * Calculate focus time for a specific day from sessions
 * @param sessions - All sessions
 * @param targetDate - The day to calculate for
 * @returns Total focus seconds for that day
 */
export function calculateDayFocus(
    sessions: FocusSession[],
    targetDate: Date
): number {
    const dayStr = format(targetDate, 'yyyy-MM-dd')

    // Sum all focus session seconds for this day
    const focusSec = sessions
        .filter(s => s.type === 'focus' && format(parseISO(s.start_time), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, s) => sum + (s.seconds || 0), 0)

    return focusSec
}

/**
 * Calculate break time for a specific day from sessions
 * @param sessions - All sessions
 * @param targetDate - The day to calculate for
 * @returns Total break seconds for that day
 */
export function calculateDayBreak(sessions: FocusSession[], targetDate: Date): number {
    const dayStr = format(targetDate, 'yyyy-MM-dd')

    return sessions
        .filter(s => s.type === 'break' && format(parseISO(s.start_time), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, s) => sum + (s.seconds || 0), 0)
}

/**
 * Calculate total focus time within a date range
 * @param sessions - All sessions
 * @param startDate - Start of range (inclusive)
 * @param endDate - End of range (inclusive)
 * @returns Total focus seconds in the range
 */
export function calculateRangeFocus(
    sessions: FocusSession[], startDate: Date, endDate: Date): number {
    return sessions
        .filter(s => {
            if (s.type !== 'focus') return false
            const sessionStart = parseISO(s.start_time)
            return sessionStart >= startDate && sessionStart <= endDate
        })
        .reduce((sum, s) => sum + (s.seconds || 0), 0)
}

/**
 * Get stats for multiple days
 * @param sessions - All sessions
 * @param tasks - All tasks (for completed count)
 * @param days - Array of dates to calculate for
 * @returns Array of stats for each day
 */
export function calculateMultiDayStats(
    sessions: FocusSession[], tasks: Task[], days: Date[]): DayStats[] {
    return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const focusSeconds = calculateDayFocus(sessions, day)
        const breakSeconds = calculateDayBreak(sessions, day)

        return {
            date: day,
            label: format(day, 'MMM dd'),
            focusSeconds,
            breakSeconds,
            focusMinutes: Math.round(focusSeconds / 60),
            breakMinutes: Math.round(breakSeconds / 60),
            totalMinutes: Math.round((focusSeconds + breakSeconds) / 60),
            tasksCompleted: tasks.filter(t =>
                t.completed_at && format(parseISO(t.completed_at), 'yyyy-MM-dd') === dayStr
            ).length
        }
    })
}

/**
 * Calculate total focus time for today
 * Convenience function for the most common use case
 */
export function calculateTodayFocus(sessions: FocusSession[]): number {
    return calculateDayFocus(sessions, new Date())
}

/**
 * Format seconds into human-readable time (e.g., "2h 30m")
 */
export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
        return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
}

/**
 * Calculates focus time distribution by task (Session Source of Truth)
 * Returns array of objects { taskId, minutes }
 */
export const calculateFocusDistribution = (sessions: FocusSession[]): { taskId: string, minutes: number }[] => {
    const taskMap = new Map<string, number>()

    // 1. Sum up completed sessions
    sessions.forEach(s => {
        // Use loose check or ensure type matches. Database type is string usually.
        // If s.type is strictly 'focus' | 'break', then 'deep_work' might be invalid if not in type definition.
        // However, FocusSession in database.ts usually allows string or specific enum.
        // Let's assume 'focus' is the main one, and if 'deep_work' exists it's valid.
        // To be safe against TS errors if type is narrowed:
        const t = s.type as string
        if (t !== 'focus' && t !== 'deep_work') return

        const tid = s.task_id
        if (!tid) return

        const existing = taskMap.get(tid) || 0
        taskMap.set(tid, existing + (s.seconds || 0))
    })

    return Array.from(taskMap.entries()).map(([taskId, seconds]) => ({
        taskId,
        minutes: Math.round(seconds / 60)
    })).sort((a, b) => b.minutes - a.minutes)
}

/**
 * Calculates current streak (consecutive days with focus time)
 * Source of Truth: Sessions
 */
export const calculateStreak = (sessions: FocusSession[]): number => {
    if (sessions.length === 0) return 0

    // 1. Get all unique dates with focus time
    const activeDates = new Set<string>()
    sessions.forEach(s => {
        const t = s.type as string
        if ((t === 'focus' || t === 'deep_work') && (s.seconds || 0) > 0) {
            const day = format(new Date(s.start_time), 'yyyy-MM-dd')
            activeDates.add(day)
        }
    })

    if (activeDates.size === 0) return 0

    // 2. Check backwards from today (or yesterday if today has no data yet?)
    // Usually streak includes today if we focused today.
    // If we haven't focused TODAY, does streak break? 
    // Common logic: Streak is active if focused Today OR Yesterday.

    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd')

    let currentCheck = activeDates.has(todayStr) ? today : subDays(today, 1)
    let currentCheckStr = format(currentCheck, 'yyyy-MM-dd')

    // If neither today nor yesterday has activity, streak is 0
    if (!activeDates.has(todayStr) && !activeDates.has(yesterdayStr)) {
        return 0
    }

    let streak = 0
    while (activeDates.has(currentCheckStr)) {
        streak++
        currentCheck = subDays(currentCheck, 1)
        currentCheckStr = format(currentCheck, 'yyyy-MM-dd')
    }

    return streak
}
