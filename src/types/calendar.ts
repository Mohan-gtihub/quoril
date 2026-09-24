// Local-only calendar event — the Quoril-owned schedule that backs the planner
// day-fit engine, the calendar timeline, and the automation "busy" context.
// These rows live in SQLite only (not in SYNC_TABLES), so they never leave the
// machine — the same privacy posture the Swift build gives the system calendar.

export type CalendarEventSource = 'quoril' | 'external'

/** Raw SQLite row. `is_recurring`/`synced` are 0|1 integers on disk. */
export interface CalendarEventRow {
    id: string
    user_id: string
    title: string
    /** ISO 8601 start timestamp. */
    start_at: string
    /** ISO 8601 end timestamp. */
    end_at: string
    notes: string | null
    url: string | null
    /** Minutes before start to fire a reminder; null = no reminder. */
    alarm_lead_minutes: number | null
    is_recurring: number | boolean
    source: CalendarEventSource
    /** Set when the block was planned from a task (deep-link back). */
    task_id: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
    synced?: number
}

/** App-facing calendar event with normalised booleans and Date convenience. */
export interface CalendarEvent extends Omit<CalendarEventRow, 'is_recurring'> {
    is_recurring: boolean
    /** Whether Quoril created this block (vs an imported/external one). */
    isQuorilCreated: boolean
}

export function mapCalendarEvent(row: CalendarEventRow): CalendarEvent {
    return {
        ...row,
        notes: row.notes ?? null,
        url: row.url ?? null,
        source: (row.source as CalendarEventSource) ?? 'quoril',
        is_recurring: Boolean(row.is_recurring),
        isQuorilCreated: (row.source ?? 'quoril') === 'quoril',
    }
}
