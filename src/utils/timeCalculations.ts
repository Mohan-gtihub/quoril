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
 * Checks if a session type should count as focus time
 */
export function isFocusType(type: string | null | undefined): boolean {
    if (!type) return false
    return ['focus', 'deep_work', 'regular', 'pomodoro'].includes(type)
}

/**
 * Splits a session's seconds across the calendar day(s) it actually spans (H3).
 *
 * A session that starts at 23:50 and ends at 00:20 should contribute 10 min to
 * its start day and 20 min to the next day — not 30 min entirely to the start
 * day. We distribute `seconds` proportionally across the wall-clock days between
 * start_time and end_time. Falls back to attributing everything to the start day
 * when end_time is missing or the timestamps are degenerate.
 *
 * @returns Map of 'yyyy-MM-dd' -> seconds attributed to that day
 */
export function splitSessionByDay(session: FocusSession): Map<string, number> {
    const result = new Map<string, number>()
    const total = session.seconds || 0
    if (!session.start_time || total <= 0) return result

    const start = parseISO(session.start_time)
    const end = session.end_time ? parseISO(session.end_time) : null

    const startDay = format(start, 'yyyy-MM-dd')

    // No usable end, or end not after start: attribute everything to the start day.
    if (!end || end.getTime() <= start.getTime()) {
        result.set(startDay, total)
        return result
    }

    const endDay = format(end, 'yyyy-MM-dd')
    if (startDay === endDay) {
        result.set(startDay, total)
        return result
    }

    // Multi-day: distribute `total` proportionally to the wall-clock span that
    // falls in each calendar day. Using wall-clock (not the stored seconds) keeps
    // pauses from skewing the split, while still summing back to `total`.
    const spanMs = end.getTime() - start.getTime()
    let assigned = 0
    let cursor = new Date(start)

    while (format(cursor, 'yyyy-MM-dd') !== endDay) {
        const nextMidnight = new Date(cursor)
        nextMidnight.setHours(24, 0, 0, 0)
        const sliceMs = nextMidnight.getTime() - cursor.getTime()
        const sliceSeconds = Math.round((sliceMs / spanMs) * total)
        const day = format(cursor, 'yyyy-MM-dd')
        result.set(day, (result.get(day) ?? 0) + sliceSeconds)
        assigned += sliceSeconds
        cursor = nextMidnight
    }

    // Remainder (incl. rounding drift) lands on the end day so the split is exact.
    result.set(endDay, (result.get(endDay) ?? 0) + Math.max(0, total - assigned))
    return result
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

    // Sum focus seconds attributed to this day, splitting sessions that cross
    // midnight so each day only gets the portion that actually occurred in it (H3).
    return sessions
        .filter(s => isFocusType(s.type))
        .reduce((sum, s) => sum + (splitSessionByDay(s).get(dayStr) ?? 0), 0)
}

/**
 * Aggregates saved day focus with a current active focus timer
 */
export function calculateRealTimeFocus(
    sessions: FocusSession[],
    isActive: boolean,
    startTime: number | null | undefined, // ms
    sessionType: string | null | undefined,
    targetDate: Date = new Date()
): number {
    const saved = calculateDayFocus(sessions, targetDate)

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const targetStr = format(targetDate, 'yyyy-MM-dd')

    // Only add active timer if it's for the target date and is a focus type
    if (isActive && isFocusType(sessionType) && startTime && todayStr === targetStr) {
        const delta = Math.floor((Date.now() - startTime) / 1000)
        return saved + delta
    }

    return saved
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
        .filter(s => ['break', 'long_break'].includes(s.type as string))
        .reduce((sum, s) => sum + (splitSessionByDay(s).get(dayStr) ?? 0), 0)
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
    // Ensure we include the full end day if only a date was provided
    const end = new Date(endDate)
    if (end.getHours() === 0 && end.getMinutes() === 0) {
        end.setHours(23, 59, 59, 999)
    }

    return sessions
        .filter(s => {
            if (!isFocusType(s.type)) return false
            if (!s.start_time) return false
            const sessionStart = parseISO(s.start_time)
            return sessionStart >= startDate && sessionStart <= end
        })
        .reduce((sum, s) => sum + (s.seconds || 0), 0)
}

/**
 * Get stats for multiple days — single-pass O(n) implementation.
 */
export function calculateMultiDayStats(
    sessions: FocusSession[], tasks: Task[], days: Date[]): DayStats[] {
    const focusByDay = new Map<string, number>()
    const breakByDay = new Map<string, number>()

    sessions.forEach(s => {
        if (!s.start_time) return
        // Split across days so midnight-crossing sessions are attributed correctly (H3).
        const isFocus = isFocusType(s.type)
        const isBreak = ['break', 'long_break'].includes(s.type as string)
        if (!isFocus && !isBreak) return
        const target = isFocus ? focusByDay : breakByDay
        for (const [day, secs] of splitSessionByDay(s)) {
            target.set(day, (target.get(day) ?? 0) + secs)
        }
    })

    const tasksByDay = new Map<string, number>()
    tasks.forEach(t => {
        if (t.completed_at) {
            const day = format(parseISO(t.completed_at), 'yyyy-MM-dd')
            tasksByDay.set(day, (tasksByDay.get(day) ?? 0) + 1)
        }
    })

    return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const focusSeconds = focusByDay.get(dayStr) ?? 0
        const breakSeconds = breakByDay.get(dayStr) ?? 0
        return {
            date: day,
            label: format(day, 'MMM dd'),
            focusSeconds,
            breakSeconds,
            focusMinutes: Math.round(focusSeconds / 60),
            breakMinutes: Math.round(breakSeconds / 60),
            totalMinutes: Math.round((focusSeconds + breakSeconds) / 60),
            tasksCompleted: tasksByDay.get(dayStr) ?? 0
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
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
        return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
        return `${minutes}m`
    }
    // Sub-minute: show seconds so short sprints don't render as a misleading "0m" (L1).
    return `${secs}s`
}

/**
 * Calculates focus time distribution by task (Session Source of Truth)
 * Returns array of objects { taskId, minutes }
 */
export const calculateFocusDistribution = (sessions: FocusSession[]): { taskId: string, minutes: number }[] => {
    const taskMap = new Map<string, number>()

    // 1. Sum up completed sessions
    sessions.forEach(s => {
        if (!isFocusType(s.type)) return

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
        if (isFocusType(s.type) && (s.seconds || 0) > 0 && s.start_time) {
            const day = format(parseISO(s.start_time), 'yyyy-MM-dd')
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
