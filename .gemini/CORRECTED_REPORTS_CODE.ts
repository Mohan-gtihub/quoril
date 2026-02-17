// ============================================================================
// CORRECTED SECTION FOR useReportsController.ts
// Replace lines 138-401 with this corrected code
// ============================================================================

// Use SESSION data for accurate daily focus time (sessions track WHEN work happened)
let focusSec = 0

// Get all focus sessions that occurred on this day
filteredSessions.forEach(s => {
    if (s.type === 'break') return

    const sessionStart = parseISO(s.start_time)
    const sessionEnd = s.end_time ? parseISO(s.end_time) : new Date()

    // Check if session overlaps with this day
    if (sessionStart <= dayEnd && sessionEnd >= dayStart) {
        // Calculate only the portion that falls within this day (handles midnight crossing)
        const overlapStart = sessionStart > dayStart ? sessionStart : dayStart
        const overlapEnd = sessionEnd < dayEnd ? sessionEnd : dayEnd

        const secs = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 1000))
        focusSec += secs
    }
})

// If there's an active session today, add its elapsed time
if (isActive && activeTaskId && isToday(day)) {
    const activeTask = activeTasks.find(t => t.id === activeTaskId)
    if (activeTask?.started_at) {
        const sessionStart = parseISO(activeTask.started_at)
        // Only add if active session started today
        if (sessionStart >= dayStart && sessionStart <= dayEnd) {
            focusSec += elapsed
        }
    }
}

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

// ... (streak logic stays the same) ...

// --- THIS WEEK Calculation (corrected to use sessions) ---
const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

const weekSessions = filteredSessions.filter(s => {
    if (s.type === 'break') return false
    const sessionStart = parseISO(s.start_time)
    const sessionEnd = s.end_time ? parseISO(s.end_time) : new Date()
    return sessionStart <= weekEnd && sessionEnd >= weekStart
})

let weekFocusSeconds = 0
weekSessions.forEach(s => {
    const sessionStart = parseISO(s.start_time)
    const sessionEnd = s.end_time ? parseISO(s.end_time) : new Date()

    const overlapStart = sessionStart > weekStart ? sessionStart : weekStart
    const overlapEnd = sessionEnd < weekEnd ? sessionEnd : weekEnd

    const seconds = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 1000))
    weekFocusSeconds += seconds
})

// Add active session if running now
if (isActive && activeTaskId) {
    const activeTask = activeTasks.find(t => t.id === activeTaskId)
    if (activeTask?.started_at) {
        const sessionStart = parseISO(activeTask.started_at)
        if (sessionStart >= weekStart && sessionStart <= weekEnd) {
            weekFocusSeconds += elapsed
        }
    }
}

const weekFocusMinutes = Math.round(weekFocusSeconds / 60)

// --- TODAY Calculation (corrected to use sessions) ---
const todayStart = startOfDay(new Date())
const todayEnd = endOfDay(new Date())

const todaySessions = filteredSessions.filter(s => {
    if (s.type === 'break') return false
    const sessionStart = parseISO(s.start_time)
    const sessionEnd = s.end_time ? parseISO(s.end_time) : new Date()
    return sessionStart <= todayEnd && sessionEnd >= todayStart
})

let totalSecondsToday = 0
todaySessions.forEach(s => {
    const sessionStart = parseISO(s.start_time)
    const sessionEnd = s.end_time ? parseISO(s.end_time) : new Date()

    const overlapStart = sessionStart > todayStart ? sessionStart : todayStart
    const overlapEnd = sessionEnd < todayEnd ? sessionEnd : todayEnd

    const seconds = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 1000))
    totalSecondsToday += seconds
})

// Add active session if running now
if (isActive && activeTaskId) {
    const activeTask = activeTasks.find(t => t.id === activeTaskId)
    if (activeTask?.started_at) {
        const sessionStart = parseISO(activeTask.started_at)
        if (sessionStart >= todayStart && sessionStart <= todayEnd) {
            totalSecondsToday += elapsed
        }
    }
}

const totalMinutesToday = Math.round(totalSecondsToday / 60)

// ============================================================================
// END OF CORRECTED SECTION
// This uses SESSION timestamps (start_time/end_time) which track WHEN work
// happened, not TASK timestamps (created_at/completed_at) which are wrong.
// ============================================================================
