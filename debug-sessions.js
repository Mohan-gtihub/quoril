/**
 * Debug script to check and clean corrupted session data
 * Run this in the browser console while the app is running
 */

// Check today's sessions
async function debugTodaySessions() {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    console.log('=== TODAY SESSION DEBUG ===')
    console.log('Today range:', todayStart.toISOString(), 'to', todayEnd.toISOString())

    // Get all sessions
    const allSessions = await window.electronAPI.db.getAllSessions()
    console.log('Total sessions in DB:', allSessions.length)

    // Filter to today
    const todaySessions = allSessions.filter(s => {
        const sessionStart = new Date(s.start_time)
        const sessionEnd = s.end_time ? new Date(s.end_time) : new Date()
        return sessionStart <= todayEnd && sessionEnd >= todayStart
    })

    console.log('Sessions overlapping with today:', todaySessions.length)

    // Check for corrupted sessions
    const corruptedSessions = todaySessions.filter(s => {
        // More than 24 hours = corrupted
        return s.seconds && s.seconds > 86400
    })

    console.log('Corrupted sessions (>24h):', corruptedSessions.length)

    if (corruptedSessions.length > 0) {
        console.table(corruptedSessions.map(s => ({
            id: s.id.substring(0, 8),
            type: s.type,
            hours: (s.seconds / 3600).toFixed(1),
            start: new Date(s.start_time).toLocaleString(),
            end: s.end_time ? new Date(s.end_time).toLocaleString() : 'ongoing'
        })))
    }

    // Calculate total time from today's sessions (excluding breaks and corrupted)
    const validFocusSessions = todaySessions.filter(s => {
        if (s.type === 'break') return false
        if (s.seconds && s.seconds > 86400) return false
        if (s.seconds && s.seconds < 0) return false
        return true
    })

    console.log('Valid focus sessions for today:', validFocusSessions.length)

    let totalSeconds = 0
    validFocusSessions.forEach(s => {
        const sessionStart = new Date(s.start_time)
        const sessionEnd = s.end_time ? new Date(s.end_time) : new Date()

        // Calculate only the portion that falls within today
        const actualStart = sessionStart > todayStart ? sessionStart : todayStart
        const actualEnd = sessionEnd < todayEnd ? sessionEnd : todayEnd

        const seconds = Math.max(0, Math.floor((actualEnd.getTime() - actualStart.getTime()) / 1000))
        totalSeconds += seconds

        console.log(`Session ${s.id.substring(0, 8)}: ${Math.floor(seconds / 60)}m`)
    })

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    console.log('=== RESULT ===')
    console.log(`Total focus time for TODAY: ${hours}h ${minutes}m`)
    console.log('Total minutes:', Math.floor(totalSeconds / 60))

    return {
        totalSessions: allSessions.length,
        todaySessions: todaySessions.length,
        corruptedSessions: corruptedSessions.length,
        validFocusSessions: validFocusSessions.length,
        totalMinutes: Math.floor(totalSeconds / 60),
        display: `${hours}h ${minutes}m`
    }
}

// Clean corrupted sessions
async function cleanCorruptedSessions() {
    const allSessions = await window.electronAPI.db.getAllSessions()

    const toDelete = allSessions.filter(s => {
        // Delete sessions with more than 24 hours
        if (s.seconds && s.seconds > 86400) return true
        // Delete sessions with negative duration
        if (s.seconds && s.seconds < 0) return true
        return false
    })

    console.log(`Found ${toDelete.length} corrupted sessions to delete`)

    if (toDelete.length === 0) {
        console.log('No corrupted sessions found!')
        return
    }

    if (!confirm(`Delete ${toDelete.length} corrupted sessions?`)) {
        console.log('Cancelled')
        return
    }

    for (const session of toDelete) {
        await window.electronAPI.db.deleteSession(session.id)
        console.log(`Deleted session ${session.id} (${(session.seconds / 3600).toFixed(1)}h)`)
    }

    console.log('Cleanup complete! Refresh the page.')
}

// Export to window for console access
window.debugTodaySessions = debugTodaySessions
window.cleanCorruptedSessions = cleanCorruptedSessions

console.log('Debug tools loaded!')
console.log('Run: debugTodaySessions() - Check today\'s session data')
console.log('Run: cleanCorruptedSessions() - Remove corrupted sessions')
