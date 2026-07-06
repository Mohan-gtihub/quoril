import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

let db: Database.Database

// Categories treated as attention leaks. Keep in sync with DISTRACTING_CATEGORIES
// in electron/main/core/collector.ts and DISTRACTING in
// src/services/insights/buildSummary.ts.
const DISTRACTING_CATEGORIES = ['Social', 'Entertainment', 'Gaming', 'News']
// Safe to interpolate: internal constant, never user input.
const DISTRACTING_SQL = DISTRACTING_CATEGORIES.map(c => `'${c}'`).join(', ')

// Browser app_ids collapse every website under one row with a thrashing category,
// so real site categories live in domain_sessions/domain_categories instead. We
// count distracting *websites* from the domain tables and exclude browsers from
// the app-based distraction count to avoid double-counting. app_id is the browser
// display name on macOS ("Google Chrome") and the exe stem on Windows ("chrome"),
// so match with case-insensitive LIKE on common browser needles.
const BROWSER_NEEDLES = ['chrome', 'chromium', 'msedge', 'edge', 'firefox', 'brave', 'safari', 'opera', 'arc', 'vivaldi']
const NOT_BROWSER_SQL = BROWSER_NEEDLES.map(n => `LOWER(s.app_id) NOT LIKE '%${n}%'`).join(' AND ')

/* ---------------- HELPERS ---------------- */

function now() {
    return new Date().toISOString()
}

function sanitize(values: any[]) {
    return values.map(v => {
        if (v === undefined || v === null) return null
        if (typeof v === 'boolean') return v ? 1 : 0
        if (typeof v === 'object') return JSON.stringify(v)
        return v
    })
}

function exec(sql: string, params: any[] = []) {
    if (!db) throw new Error('Database not initialized')
    if (!sql) return null
    const clean = sanitize(params)
    try {
        const cmd = sql.trim().toUpperCase()
        if (cmd.startsWith('SELECT') || cmd.startsWith('PRAGMA')) {
            return db.prepare(sql).all(...clean)
        }
        return db.prepare(sql).run(...clean)
    } catch (e) {
        console.error('[DB ERROR]', sql, params, e)
        throw e
    }
}

/* ---------------- OPS ---------------- */

export const dbOps = {
    exec,

    getTasks(userId: string, listId?: string) {
        const sql = listId
            ? "SELECT * FROM tasks WHERE user_id=? AND list_id=? AND deleted_at IS NULL ORDER BY sort_order ASC"
            : "SELECT * FROM tasks WHERE user_id=? AND deleted_at IS NULL ORDER BY sort_order ASC"
        return exec(sql, listId ? [userId, listId] : [userId])
    },

    saveTask(task: any) {
        task.updated_at = now()
        task.synced = 0
        if (!task.created_at) task.created_at = now()
        const cols = Object.keys(task)
        const vals = sanitize(Object.values(task))
        exec(`INSERT OR REPLACE INTO tasks (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals)
    },

    deleteTask(id: string) {
        exec("UPDATE tasks SET deleted_at=?, synced=0 WHERE id=?", [now(), id])
    },

    startTask(id: string) {
        // Just clear any existing active tasks without double-counting (renderer handles spent_s)
        exec("UPDATE tasks SET started_at = NULL, status = 'paused', synced = 0 WHERE started_at IS NOT NULL")
        exec("UPDATE tasks SET started_at=?, status='active', synced=0 WHERE id=?", [now(), id])
    },

    pauseTask(id: string) {
        if (id === '__all__') {
            exec("UPDATE tasks SET started_at = NULL, status='paused', synced=0 WHERE started_at IS NOT NULL")
            return
        }
        exec("UPDATE tasks SET started_at = NULL, status = 'paused', synced = 0 WHERE id=? AND started_at IS NOT NULL", [id])
    },

    cleanupOrphanedSessions() {
        exec("UPDATE tasks SET started_at = NULL, status = 'paused' WHERE started_at IS NOT NULL AND CAST(strftime('%s', 'now') - strftime('%s', started_at) AS INTEGER) > 86400")
    },

    getLists(userId: string, archived = false, workspaceId?: string) {
        const cond = archived ? "archived_at IS NOT NULL AND deleted_at IS NULL" : "archived_at IS NULL AND deleted_at IS NULL"
        if (workspaceId) {
            return exec(`SELECT * FROM lists WHERE user_id=? AND ${cond} AND workspace_id=? ORDER BY sort_order ASC`, [userId, workspaceId])
        }
        return exec(`SELECT * FROM lists WHERE user_id=? AND ${cond} ORDER BY sort_order ASC`, [userId])
    },

    moveListToWorkspace(listId: string, workspaceId: string | null) {
        exec("UPDATE lists SET workspace_id=?, updated_at=?, synced=0 WHERE id=?", [workspaceId, now(), listId])
    },

    saveList(list: any) {
        list.updated_at = now()
        list.synced = 0
        if (!list.created_at) list.created_at = now()
        const cols = Object.keys(list)
        const vals = sanitize(Object.values(list))
        exec(`INSERT OR REPLACE INTO lists(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, vals)
    },

    archiveList(id: string) {
        exec("UPDATE lists SET archived_at =?, synced = 0 WHERE id =?", [now(), id])
    },

    restoreList(id: string) {
        exec("UPDATE lists SET archived_at = NULL, deleted_at = NULL, synced = 0, updated_at =? WHERE id =?", [now(), id])
    },

    deleteList(id: string) {
        exec("UPDATE lists SET deleted_at =?, synced = 0 WHERE id =?", [now(), id])
    },

    getSubtasks(taskId: string) {
        return exec("SELECT * FROM subtasks WHERE task_id =? AND deleted_at IS NULL ORDER BY sort_order ASC", [taskId])
    },

    saveSubtask(sub: any) {
        sub.updated_at = now()
        sub.synced = 0
        if (!sub.created_at) sub.created_at = now()
        const cols = Object.keys(sub)
        const vals = sanitize(Object.values(sub))
        exec(`INSERT OR REPLACE INTO subtasks(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, vals)
    },

    getSessions(userId: string) {
        // Defensive: check if deleted_at column exists (may be missing in older DBs before migration v9 runs)
        const cols = db.prepare("PRAGMA table_info(focus_sessions)").all() as { name: string }[]
        const hasDeletedAt = cols.some(c => c.name === 'deleted_at')
        if (hasDeletedAt) {
            return exec("SELECT * FROM focus_sessions WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC", [userId])
        }
        return exec("SELECT * FROM focus_sessions WHERE user_id=? ORDER BY created_at DESC", [userId])
    },

    getAppUsage(startDate: string, endDate: string) {
        return exec("SELECT s.app_id as appName, SUM(s.duration_seconds) as totalSeconds, MAX(s.window_title) as lastTitle, a.category FROM app_sessions s LEFT JOIN apps a ON s.app_id = a.id WHERE s.start_time >= ? AND s.start_time <= ? GROUP BY s.app_id ORDER BY totalSeconds DESC", [startDate, endDate])
    },

    getDailyActivity(startDate: string, endDate: string) {
        return exec("SELECT strftime('%Y-%m-%d', start_time) as day, SUM(duration_seconds) as totalSeconds FROM app_sessions WHERE start_time >= ? AND start_time <= ? GROUP BY day", [startDate, endDate])
    },

    getDailyAppUsage(date: string) {
        // date format: YYYY-MM-DD
        // We need to match the start_time derived day
        return exec(`
            SELECT app_id, SUM(duration_seconds) as total_seconds 
            FROM app_sessions 
            WHERE strftime('%Y-%m-%d', start_time) = ? 
            GROUP BY app_id
        `, [date])
    },

    getDailyDomainUsage(date: string) {
        return exec(`
            SELECT domain, SUM(duration_seconds) as total_seconds 
            FROM domain_sessions 
            WHERE strftime('%Y-%m-%d', start_time) = ? 
            GROUP BY domain
        `, [date])
    },

    getAppUsageByTask(taskId: string) {
        return exec("SELECT s.app_id as appName, SUM(s.duration_seconds) as totalSeconds FROM app_sessions s JOIN contexts c ON s.context_id = c.id WHERE c.type = 'task' AND c.ref_id = ? GROUP BY s.app_id ORDER BY totalSeconds DESC", [taskId])
    },

    /* ---- Workspaces ---- */

    getWorkspaces(userId: string) {
        return exec("SELECT * FROM workspaces WHERE user_id=? AND deleted_at IS NULL ORDER BY sort_order ASC", [userId])
    },

    saveWorkspace(ws: any) {
        ws.updated_at = now()
        ws.synced = 0
        if (!ws.created_at) ws.created_at = now()
        const cols = Object.keys(ws)
        const vals = sanitize(Object.values(ws))
        exec(`INSERT OR REPLACE INTO workspaces (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals)
    },

    deleteWorkspace(id: string) {
        exec("UPDATE workspaces SET deleted_at=?, synced=0 WHERE id=?", [now(), id])
    },

    saveSession(session: any) {
        session.synced = 0
        if (!session.created_at) session.created_at = now()
        const cols = Object.keys(session)
        const vals = sanitize(Object.values(session))
        exec(`INSERT OR REPLACE INTO focus_sessions(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, vals)
    },

    getPending(table: string, limit = 100) {
        return exec(`SELECT * FROM ${table} WHERE synced = 0 LIMIT ?`, [limit])
    },

    markSynced(table: string, id: string) {
        exec(`UPDATE ${table} SET synced = 1 WHERE id =?`, [id])
    },

    /**
     * Merge rows pulled FROM the cloud INTO local SQLite (cloud → local restore).
     *
     * Last-write-wins: a cloud row only overwrites the local copy when its
     * updated_at is newer (or the row doesn't exist locally). Rows written this
     * way are marked synced=1 so the push loop doesn't immediately re-upload them.
     * Returns how many rows were actually written.
     */
    upsertFromCloud(table: string, rows: any[]): number {
        if (!Array.isArray(rows) || rows.length === 0) return 0

        // Only keep columns that actually exist locally, so cloud-only fields
        // (e.g. a column we haven't migrated yet) don't break the INSERT.
        const localCols = new Set(
            (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name)
        )
        const hasUpdatedAt = localCols.has('updated_at')

        const hasDeletedAt = localCols.has('deleted_at')
        // Only select columns that actually exist — some tables (e.g. focus_sessions)
        // have deleted_at but no updated_at, so selecting both unconditionally throws
        // "no such column: updated_at" and aborts the whole pull.
        const selectCols = [hasUpdatedAt && 'updated_at', hasDeletedAt && 'deleted_at'].filter(Boolean) as string[]
        const getLocalRow = selectCols.length
            ? db.prepare(`SELECT ${selectCols.join(', ')} FROM ${table} WHERE id = ?`)
            : null

        let written = 0

        const tx = db.transaction((batch: any[]) => {
            for (const raw of batch) {
                if (!raw || !raw.id) continue

                const local = getLocalRow?.get(raw.id) as { updated_at?: string; deleted_at?: string } | undefined

                // Tombstone guard: if the user deleted this row locally and the
                // incoming cloud copy is NOT deleted, never resurrect it. The local
                // delete is the user's intent; a stale-but-undeleted cloud row (e.g.
                // a delete that couldn't be pushed, or a row owned by someone else)
                // must not bring it back. This is what stopped deleted tasks from
                // "coming back again and again".
                if (hasDeletedAt && local?.deleted_at && !raw.deleted_at) {
                    continue
                }

                // Last-write-wins guard
                if (hasUpdatedAt && local?.updated_at && raw.updated_at && local.updated_at >= raw.updated_at) {
                    continue // local copy is newer or equal — keep it
                }

                const row: Record<string, any> = { synced: 1 }
                for (const [k, v] of Object.entries(raw)) {
                    // Cloud JSONB columns (content_json, viewport_json, …) come back as
                    // parsed JS objects but live locally in TEXT columns. sanitize()
                    // below JSON.stringifies any object value, so they're stored as
                    // valid JSON rather than "[object Object]".
                    if (localCols.has(k)) row[k] = v
                }

                const cols = Object.keys(row)
                const vals = sanitize(Object.values(row))
                db.prepare(
                    `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
                ).run(...vals)
                written++
            }
        })

        tx(rows)
        return written
    },

    /* ---- Named update ops (replace raw db:exec) ---- */

    updateTask(id: string, updates: Record<string, any>) {
        const TASK_COLUMNS = new Set(['title','description','status','priority','estimate_m','spent_s','started_at','due_at','completed_at','parent_id','sort_order','updated_at','deleted_at','synced','is_recurring','last_reset_date','list_id','assigned_to'])
        const keys = Object.keys(updates).filter(k => TASK_COLUMNS.has(k))
        if (!keys.length) return
        exec(`UPDATE tasks SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...keys.map(k => updates[k]), id])
        return exec('SELECT * FROM tasks WHERE id=?', [id])
    },

    updateTaskSortOrder(id: string, sortOrder: number) {
        exec('UPDATE tasks SET sort_order=?, synced=0 WHERE id=?', [sortOrder, id])
    },

    softDeleteTasksByListId(listId: string) {
        exec('UPDATE tasks SET deleted_at=?, synced=0 WHERE list_id=?', [now(), listId])
    },

    resetAllTaskTimes(userId: string) {
        exec('UPDATE tasks SET spent_s=0, synced=0 WHERE user_id=?', [userId])
    },

    updateList(id: string, updates: Record<string, any>) {
        const LIST_COLUMNS = new Set(['name','color','icon','sort_order','is_system','updated_at','archived_at','deleted_at','synced','workspace_id'])
        const keys = Object.keys(updates).filter(k => LIST_COLUMNS.has(k))
        if (!keys.length) return
        exec(`UPDATE lists SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...keys.map(k => updates[k]), id])
    },

    updateSubtask(id: string, updates: Record<string, any>) {
        const SUBTASK_COLUMNS = new Set(['title','done','sort_order','updated_at','deleted_at','synced','completed'])
        const keys = Object.keys(updates).filter(k => SUBTASK_COLUMNS.has(k))
        if (!keys.length) return
        exec(`UPDATE subtasks SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...keys.map(k => updates[k]), id])
    },

    softDeleteSubtask(id: string) {
        exec('UPDATE subtasks SET deleted_at=?, synced=0 WHERE id=?', [now(), id])
    },

    updateFocusSession(id: string, updates: Record<string, any>) {
        const SESSION_COLUMNS = new Set(['type','seconds','start_time','end_time','metadata','synced'])
        const keys = Object.keys(updates).filter(k => SESSION_COLUMNS.has(k))
        if (!keys.length) return
        exec(`UPDATE focus_sessions SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...keys.map(k => updates[k]), id])
    },

    softDeleteAllSessions(userId: string) {
        exec('UPDATE focus_sessions SET deleted_at=?, synced=0 WHERE user_id=?', [now(), userId])
    },

    hardDeleteTask(id: string) {
        exec('DELETE FROM tasks WHERE id=?', [id])
    },

    hardDeleteList(id: string) {
        exec('DELETE FROM lists WHERE id=?', [id])
    },

    taskExists(taskId: string): boolean {
        const rows = exec('SELECT id FROM tasks WHERE id=? AND deleted_at IS NULL', [taskId]) as any[]
        return rows?.length > 0
    },

    // Ids in `table` that are tombstoned locally (deleted_at set). Used to stop
    // mergeSharedFromCloud from resurrecting a shared row the user just deleted
    // locally when the cloud copy (owned by someone else) is still un-deleted.
    getLocallyDeletedIds(table: string): string[] {
        const ALLOWED = new Set(['tasks', 'lists', 'subtasks'])
        if (!ALLOWED.has(table)) return []
        const rows = exec(`SELECT id FROM ${table} WHERE deleted_at IS NOT NULL`) as any[]
        return (rows || []).map((r: any) => r.id)
    },

    requeueWorkspace(workspaceId: string) {
        exec('UPDATE workspaces SET synced=0 WHERE id=?', [workspaceId])
    },

    getWorkspaceForList(workspaceId: string) {
        return exec('SELECT id, synced FROM workspaces WHERE id=? AND deleted_at IS NULL', [workspaceId]) as any[]
    },

    cleanupCorruptedSessions() {
        // 1. Clean Focus Sessions (>24h or negative)
        const focusCorrupted = exec(`SELECT id, seconds FROM focus_sessions WHERE seconds > 86400 OR seconds < 0`) as any[]
        if (focusCorrupted?.length > 0) {
            console.warn(`[DB] Removing ${focusCorrupted.length} corrupted focus sessions`)
            exec(`DELETE FROM focus_sessions WHERE seconds > 86400 OR seconds < 0`)
        }

        // 2. Clean App Sessions (>24h or negative or end < start)
        const appCorrupted = exec(`
            SELECT id FROM app_sessions 
            WHERE duration_seconds > 86400 
            OR duration_seconds < 0 
            OR end_time < start_time
        `) as any[]
        if (appCorrupted?.length > 0) {
            console.warn(`[DB] Removing ${appCorrupted.length} corrupted app sessions`)
            exec(`DELETE FROM app_sessions WHERE duration_seconds > 86400 OR duration_seconds < 0 OR end_time < start_time`)
        }

        // 3. Clean Domain Sessions
        const domainCorrupted = exec(`
            SELECT id FROM domain_sessions 
            WHERE duration_seconds > 86400 
            OR duration_seconds < 0 
            OR end_time < start_time
        `) as any[]
        if (domainCorrupted?.length > 0) {
            console.warn(`[DB] Removing ${domainCorrupted.length} corrupted domain sessions`)
            exec(`DELETE FROM domain_sessions WHERE duration_seconds > 86400 OR duration_seconds < 0 OR end_time < start_time`)
        }
    },

    /* ---- Reports Dashboard (one aggregated call) ---- */

    getReportsDashboardData(userId: string, startDate: string, endDate: string) {
        // 1. Focus Summary — total seconds, session count, avg, interruptions proxy
        const focusSummary = (exec(`
            SELECT
                COALESCE(SUM(seconds), 0)          AS totalSeconds,
                COUNT(*)                            AS sessionCount,
                COALESCE(AVG(seconds), 0)           AS avgSeconds,
                COALESCE(SUM(CASE WHEN type='break' THEN 1 ELSE 0 END), 0) AS breakCount
            FROM focus_sessions
            WHERE user_id = ?
              AND start_time >= ?
              AND start_time <= ?
        `, [userId, startDate, endDate]) as any[])?.[0] ?? {}

        // 2. Weekly Trend — focus minutes per calendar day
        const weeklyTrend = (exec(`
            SELECT
                strftime('%Y-%m-%d', start_time)    AS day,
                COALESCE(SUM(seconds), 0)           AS totalSeconds,
                COUNT(*)                            AS sessionCount
            FROM focus_sessions
            WHERE user_id = ?
              AND start_time >= ?
              AND start_time <= ?
              AND type != 'break'
            GROUP BY day
            ORDER BY day ASC
        `, [userId, startDate, endDate]) as any[]) ?? []

        // 3. Task Stats — completion, estimation accuracy, overdue, recurring
        const taskStats = (exec(`
            SELECT
                id,
                title,
                status,
                estimate_m          AS estimated_minutes,
                spent_s             AS actual_seconds,
                completed_at,
                created_at,
                is_recurring,
                last_reset_date,
                list_id
            FROM tasks
            WHERE user_id = ?
              AND deleted_at IS NULL
        `, [userId]) as any[]) ?? []

        // 4. App Usage — grouped by app + category, pre-summed
        const appUsage = (exec(`
            SELECT
                s.app_id                            AS appName,
                COALESCE(a.category, 'Other')       AS category,
                SUM(s.duration_seconds)             AS totalSeconds,
                SUM(s.idle_seconds)                 AS idleSeconds,
                COUNT(*)                            AS sessionCount
            FROM app_sessions s
            LEFT JOIN apps a ON s.app_id = a.id
            WHERE s.start_time >= ?
              AND s.start_time <= ?
            GROUP BY s.app_id
            ORDER BY totalSeconds DESC
            LIMIT 30
        `, [startDate, endDate]) as any[]) ?? []

        // 5. Context Switching — sessions per day with avg duration & short sessions
        const contextSwitching = (exec(`
            SELECT
                strftime('%Y-%m-%d', start_time)    AS day,
                COUNT(*)                            AS sessionCount,
                COALESCE(AVG(duration_seconds), 0)  AS avgDuration,
                SUM(CASE WHEN duration_seconds < 120 THEN 1 ELSE 0 END) AS shortSessions
            FROM app_sessions
            WHERE start_time >= ?
              AND start_time <= ?
            GROUP BY day
            ORDER BY day ASC
        `, [startDate, endDate]) as any[]) ?? []

        // 6. Workspace Stats — tasks per workspace with focus seconds
        const workspaceStats = (exec(`
            SELECT
                w.id                                AS workspaceId,
                w.name                              AS workspaceName,
                w.color                             AS workspaceColor,
                COUNT(DISTINCT t.id)                AS taskCount,
                SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) AS completedCount,
                COALESCE(SUM(t.spent_s), 0)         AS focusSeconds
            FROM workspaces w
            LEFT JOIN lists l ON l.workspace_id = w.id AND l.deleted_at IS NULL
            LEFT JOIN tasks t ON t.list_id = l.id AND t.deleted_at IS NULL
            WHERE w.user_id = ?
              AND w.deleted_at IS NULL
            GROUP BY w.id
            ORDER BY focusSeconds DESC
        `, [userId]) as any[]) ?? []

        // 7. Productive App Time — for productivity score
        const productiveAppSeconds = (exec(`
            SELECT COALESCE(SUM(s.duration_seconds - s.idle_seconds), 0) AS productiveAppSeconds,
                   COALESCE(SUM(s.duration_seconds), 0)                   AS totalAppSeconds,
                   COALESCE(SUM(s.idle_seconds), 0)                       AS totalIdleSeconds
            FROM app_sessions s
            LEFT JOIN apps a ON s.app_id = a.id
            WHERE s.start_time >= ?
              AND s.start_time <= ?
              AND COALESCE(a.category, 'Other') IN ('Development', 'Work')
        `, [startDate, endDate]) as any[])?.[0] ?? {}

        // 8. All app seconds in range (for denominator)
        const allAppSeconds = (exec(`
            SELECT COALESCE(SUM(duration_seconds), 0)  AS totalSeconds,
                   COALESCE(SUM(idle_seconds), 0)       AS idleSeconds
            FROM app_sessions
            WHERE start_time >= ? AND start_time <= ?
        `, [startDate, endDate]) as any[])?.[0] ?? {}

        // 8b. Overall distraction — active time on distracting apps/sites across the
        // whole range (timer-independent), grouped by category. Non-browser desktop
        // apps come from app_sessions; distracting websites come from the domain
        // tables (browser app rows can't carry a per-site category). Merged in JS.
        const distractionByCategoryRows = (exec(`
            SELECT COALESCE(a.category, 'Other')                         AS category,
                   COALESCE(SUM(s.duration_seconds - s.idle_seconds), 0) AS activeSeconds
            FROM app_sessions s
            LEFT JOIN apps a ON s.app_id = a.id
            WHERE s.start_time >= ? AND s.start_time <= ?
              AND COALESCE(a.category, 'Other') IN (${DISTRACTING_SQL})
              AND ${NOT_BROWSER_SQL}
            GROUP BY category
            UNION ALL
            SELECT COALESCE(dc.category, 'Web')            AS category,
                   COALESCE(SUM(ds.duration_seconds), 0)   AS activeSeconds
            FROM domain_sessions ds
            LEFT JOIN domain_categories dc ON ds.domain = dc.domain
            WHERE ds.start_time >= ? AND ds.start_time <= ?
              AND COALESCE(dc.category, 'Web') IN (${DISTRACTING_SQL})
            GROUP BY category
        `, [startDate, endDate, startDate, endDate]) as any[]) ?? []

        // Fold the two sources into one seconds-per-category map.
        const distractionMap = new Map<string, number>()
        for (const r of distractionByCategoryRows) {
            const sec = Number(r.activeSeconds) || 0
            distractionMap.set(r.category, (distractionMap.get(r.category) ?? 0) + sec)
        }
        const distractionByCategory = [...distractionMap.entries()]
            .map(([category, activeSeconds]) => ({ category, activeSeconds }))
            .filter(c => c.activeSeconds > 0)
            .sort((a, b) => b.activeSeconds - a.activeSeconds)
        const distractionActiveSeconds = distractionByCategory.reduce((s, c) => s + c.activeSeconds, 0)

        // 9. Deep-work blocks per day (sessions >= 25 min uninterrupted)
        const deepWorkByDay = (exec(`
            SELECT
                strftime('%Y-%m-%d', start_time)    AS day,
                COALESCE(SUM(seconds), 0)           AS deepSeconds,
                COUNT(*)                            AS blockCount
            FROM focus_sessions
            WHERE user_id = ?
              AND type != 'break'
              AND seconds >= 1500
              AND start_time >= ? AND start_time <= ?
            GROUP BY day
            ORDER BY day ASC
        `, [userId, startDate, endDate]) as any[]) ?? []

        // 10. Peak productivity hours — focus seconds by hour-of-day (local)
        const peakHours = (exec(`
            SELECT
                CAST(strftime('%H', start_time, 'localtime') AS INTEGER) AS hour,
                COALESCE(SUM(seconds), 0)           AS focusSeconds
            FROM focus_sessions
            WHERE user_id = ?
              AND type != 'break'
              AND start_time >= ? AND start_time <= ?
            GROUP BY hour
            ORDER BY hour ASC
        `, [userId, startDate, endDate]) as any[]) ?? []

        // 11. Focus time per task (for task<->focus linkage)
        const taskFocus = (exec(`
            SELECT
                fs.task_id                          AS taskId,
                COALESCE(t.title, 'Untitled')       AS title,
                COALESCE(t.status, 'unknown')       AS status,
                COALESCE(SUM(fs.seconds), 0)        AS focusSeconds
            FROM focus_sessions fs
            LEFT JOIN tasks t ON t.id = fs.task_id
            WHERE fs.user_id = ?
              AND fs.type != 'break'
              AND fs.task_id IS NOT NULL
              AND fs.start_time >= ? AND fs.start_time <= ?
            GROUP BY fs.task_id
            ORDER BY focusSeconds DESC
            LIMIT 30
        `, [userId, startDate, endDate]) as any[]) ?? []

        // 12. Raw focus windows in range (for distraction-during-focus overlap, computed in JS)
        const focusWindows = (exec(`
            SELECT start_time AS start, end_time AS end
            FROM focus_sessions
            WHERE user_id = ?
              AND type != 'break'
              AND end_time IS NOT NULL
              AND start_time >= ? AND start_time <= ?
        `, [userId, startDate, endDate]) as any[]) ?? []

        // 13. Distracting sessions in range — non-browser desktop apps plus
        // distracting websites (from domain tables, since browser app rows can't
        // carry a per-site category). Used for focus-session overlap.
        const distractingSessions = (exec(`
            SELECT s.start_time AS start, s.end_time AS end
            FROM app_sessions s
            LEFT JOIN apps a ON s.app_id = a.id
            WHERE s.end_time IS NOT NULL
              AND s.start_time >= ? AND s.start_time <= ?
              AND COALESCE(a.category, 'Other') IN (${DISTRACTING_SQL})
              AND ${NOT_BROWSER_SQL}
            UNION ALL
            SELECT ds.start_time AS start, ds.end_time AS end
            FROM domain_sessions ds
            LEFT JOIN domain_categories dc ON ds.domain = dc.domain
            WHERE ds.end_time IS NOT NULL
              AND ds.start_time >= ? AND ds.start_time <= ?
              AND COALESCE(dc.category, 'Web') IN (${DISTRACTING_SQL})
        `, [startDate, endDate, startDate, endDate]) as any[]) ?? []

        // 14. Planned vs actual — tasks due today vs completed
        const plannedToday = (exec(`
            SELECT
                COALESCE(SUM(CASE WHEN date(due_at,'localtime') = date('now','localtime') THEN 1 ELSE 0 END), 0) AS dueToday,
                COALESCE(SUM(CASE WHEN date(due_at,'localtime') = date('now','localtime') AND status='done' THEN 1 ELSE 0 END), 0) AS completedOfDue
            FROM tasks
            WHERE user_id = ? AND deleted_at IS NULL AND due_at IS NOT NULL
        `, [userId]) as any[])?.[0] ?? { dueToday: 0, completedOfDue: 0 }

        // Completed-in-range count — denominator for task<->focus linkage
        const doneInRangeRow = (exec(`
            SELECT COUNT(*) AS n FROM tasks
            WHERE user_id = ?
              AND deleted_at IS NULL
              AND status = 'done'
              AND completed_at IS NOT NULL
              AND completed_at >= ? AND completed_at <= ?
        `, [userId, startDate, endDate]) as any[])?.[0] ?? { n: 0 }
        const doneInRange = doneInRangeRow.n ?? 0

        // 15. Does any app-tracking data exist in range? (drives adaptive UI)
        const appDataRow = (exec(`
            SELECT COUNT(*) AS n FROM app_sessions
            WHERE start_time >= ? AND start_time <= ?
        `, [startDate, endDate]) as any[])?.[0] ?? { n: 0 }
        const hasAppData = (appDataRow.n ?? 0) > 0

        return {
            focusSummary,
            weeklyTrend,
            taskStats,
            appUsage,
            contextSwitching,
            workspaceStats,
            productiveAppSeconds,
            allAppSeconds,
            deepWorkByDay,
            peakHours,
            taskFocus,
            focusWindows,
            distractingSessions,
            distractionActiveSeconds,
            distractionByCategory,
            plannedToday,
            doneInRange,
            hasAppData,
        }
    },

    /* ---- Live distraction for the current focus sitting ---- */
    // Distracting active time overlapping [startISO, endISO], for the live focus
    // strip. Non-browser desktop apps + distracting websites (domain tables), with
    // overlap computed in JS so partial sessions at the window edges count fairly.
    getSessionDistraction(startISO: string, endISO: string) {
        const winStart = Date.parse(startISO)
        const winEnd = Date.parse(endISO)
        if (!(winEnd > winStart)) return { distractionSeconds: 0, byCategory: [] as { category: string; seconds: number }[] }

        const rows = (exec(`
            SELECT s.start_time AS start, s.end_time AS end, COALESCE(a.category, 'Other') AS category
            FROM app_sessions s
            LEFT JOIN apps a ON s.app_id = a.id
            WHERE COALESCE(a.category, 'Other') IN (${DISTRACTING_SQL})
              AND ${NOT_BROWSER_SQL}
              AND s.start_time <= ? AND (s.end_time IS NULL OR s.end_time >= ?)
            UNION ALL
            SELECT ds.start_time AS start, ds.end_time AS end, COALESCE(dc.category, 'Web') AS category
            FROM domain_sessions ds
            LEFT JOIN domain_categories dc ON ds.domain = dc.domain
            WHERE COALESCE(dc.category, 'Web') IN (${DISTRACTING_SQL})
              AND ds.start_time <= ? AND (ds.end_time IS NULL OR ds.end_time >= ?)
        `, [endISO, startISO, endISO, startISO]) as any[]) ?? []

        const byCat = new Map<string, number>()
        for (const r of rows) {
            const s = Date.parse(r.start)
            const e = r.end ? Date.parse(r.end) : winEnd // open session → up to window end
            if (isNaN(s) || isNaN(e)) continue
            const overlapMs = Math.max(0, Math.min(winEnd, e) - Math.max(winStart, s))
            if (overlapMs <= 0) continue
            byCat.set(r.category, (byCat.get(r.category) ?? 0) + overlapMs / 1000)
        }
        const byCategory = [...byCat.entries()]
            .map(([category, seconds]) => ({ category, seconds: Math.round(seconds) }))
            .filter(c => c.seconds > 0)
            .sort((a, b) => b.seconds - a.seconds)
        const distractionSeconds = byCategory.reduce((sum, c) => sum + c.seconds, 0)
        return { distractionSeconds, byCategory }
    },

    /* ---- Screen Time / Digital Wellbeing (one aggregated call) ---- */

    getScreenTimeData(date: string) {
        // date = 'YYYY-MM-DD'

        // 1. Hourly breakdown — seconds per hour of the day (0–23)
        const hourlyBreakdown = (exec(`
            SELECT
                CAST(strftime('%H', start_time, 'localtime') AS INTEGER) AS hour,
                SUM(duration_seconds)                       AS totalSeconds,
                COUNT(DISTINCT app_id)                      AS uniqueApps
            FROM app_sessions
            WHERE strftime('%Y-%m-%d', start_time, 'localtime') = ?
              AND duration_seconds > 0
            GROUP BY hour
            ORDER BY hour ASC
        `, [date]) as any[]) ?? []

        // 2. Per-app breakdown for the day — with category, duration, session count
        const appBreakdown = (exec(`
            SELECT
                s.app_id                            AS appName,
                COALESCE(a.category, 'Other')       AS category,
                SUM(s.duration_seconds)             AS totalSeconds,
                COUNT(*)                            AS sessionCount,
                MIN(s.start_time)                   AS firstSeen,
                MAX(s.end_time)                     AS lastSeen
            FROM app_sessions s
            LEFT JOIN apps a ON s.app_id = a.id
            WHERE strftime('%Y-%m-%d', s.start_time, 'localtime') = ?
              AND s.duration_seconds > 0
            GROUP BY s.app_id
            ORDER BY totalSeconds DESC
        `, [date]) as any[]) ?? []

        // 3. Category totals — for the donut/pie chart
        const categoryTotals = (exec(`
            SELECT
                COALESCE(a.category, 'Other')       AS category,
                SUM(s.duration_seconds)             AS totalSeconds,
                COUNT(DISTINCT s.app_id)            AS appCount
            FROM app_sessions s
            LEFT JOIN apps a ON s.app_id = a.id
            WHERE strftime('%Y-%m-%d', s.start_time, 'localtime') = ?
              AND s.duration_seconds > 0
            GROUP BY category
            ORDER BY totalSeconds DESC
        `, [date]) as any[]) ?? []

        // 4. Domain breakdown — websites visited
        const domainBreakdown = (exec(`
            SELECT
                ds.domain,
                COALESCE(dc.category, 'Web')        AS category,
                SUM(ds.duration_seconds)             AS totalSeconds,
                COUNT(*)                             AS sessionCount
            FROM domain_sessions ds
            LEFT JOIN domain_categories dc ON ds.domain = dc.domain
            WHERE strftime('%Y-%m-%d', ds.start_time, 'localtime') = ?
              AND ds.duration_seconds > 0
            GROUP BY ds.domain
            ORDER BY totalSeconds DESC
            LIMIT 20
        `, [date]) as any[]) ?? []

        // 5. Weekly comparison — last 7 days of total screen time
        const weeklyTrend = (exec(`
            SELECT
                strftime('%Y-%m-%d', start_time, 'localtime')    AS day,
                SUM(duration_seconds)               AS totalSeconds,
                COUNT(DISTINCT app_id)              AS uniqueApps,
                COUNT(*)                            AS sessionCount
            FROM app_sessions
            WHERE strftime('%Y-%m-%d', start_time, 'localtime') >= date(?, '-6 days')
              AND strftime('%Y-%m-%d', start_time, 'localtime') <= ?
              AND duration_seconds > 0
            GROUP BY day
            ORDER BY day ASC
        `, [date, date]) as any[]) ?? []

        // 6. App timeline — individual sessions for the day (for timeline view)
        const appTimeline = (exec(`
            SELECT
                s.app_id                            AS appName,
                COALESCE(a.category, 'Other')       AS category,
                s.start_time                        AS startTime,
                s.end_time                          AS endTime,
                s.duration_seconds                  AS durationSeconds,
                s.window_title                      AS windowTitle
            FROM app_sessions s
            LEFT JOIN apps a ON s.app_id = a.id
            WHERE strftime('%Y-%m-%d', s.start_time, 'localtime') = ?
              AND s.duration_seconds >= 10
            ORDER BY s.start_time ASC
        `, [date]) as any[]) ?? []

        // 7. Day totals
        const dayTotals = (exec(`
            SELECT
                COALESCE(SUM(duration_seconds), 0)  AS totalScreenTime,
                COUNT(DISTINCT app_id)              AS totalApps,
                COUNT(*)                            AS totalSessions,
                COALESCE(MAX(duration_seconds), 0)  AS longestSession
            FROM app_sessions
            WHERE strftime('%Y-%m-%d', start_time, 'localtime') = ?
              AND duration_seconds > 0
        `, [date]) as any[])?.[0] ?? {}

        // 8. Productive vs unproductive split
        const productivitySplit = (exec(`
            SELECT
                CASE
                    WHEN COALESCE(a.category, 'Other') IN ('Development', 'Work') THEN 'productive'
                    WHEN COALESCE(a.category, 'Other') IN (${DISTRACTING_SQL}) THEN 'unproductive'
                    ELSE 'neutral'
                END AS bucket,
                SUM(s.duration_seconds) AS totalSeconds
            FROM app_sessions s
            LEFT JOIN apps a ON s.app_id = a.id
            WHERE strftime('%Y-%m-%d', s.start_time, 'localtime') = ?
              AND s.duration_seconds > 0
            GROUP BY bucket
        `, [date]) as any[]) ?? []

        return {
            hourlyBreakdown,
            appBreakdown,
            categoryTotals,
            domainBreakdown,
            weeklyTrend,
            appTimeline,
            dayTotals,
            productivitySplit,
        }
    }
}

/* ---------------- MIGRATIONS ---------------- */

function autoMigrate() {
    db.exec(`CREATE TABLE IF NOT EXISTS db_meta (key TEXT PRIMARY KEY, value TEXT)`)

    const row = db.prepare('SELECT value FROM db_meta WHERE key=?').get('version') as { value: string } | undefined
    let version = row ? Number(row.value) : 0

    if (version < 1) {
        db.transaction(() => {
            db.exec(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, user_id TEXT, list_id TEXT, title TEXT, description TEXT, status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'medium', estimate_m INTEGER DEFAULT 0, spent_s INTEGER DEFAULT 0, started_at TEXT, due_at TEXT, completed_at TEXT, parent_id TEXT, sort_order INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT, deleted_at TEXT, synced INTEGER DEFAULT 0)`)
            db.exec(`CREATE TABLE IF NOT EXISTS lists (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, color TEXT, icon TEXT, sort_order INTEGER DEFAULT 0, is_system INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT, archived_at TEXT, deleted_at TEXT, synced INTEGER DEFAULT 0)`)
            db.exec(`CREATE TABLE IF NOT EXISTS subtasks (id TEXT PRIMARY KEY, task_id TEXT, user_id TEXT, title TEXT, done INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT, deleted_at TEXT, synced INTEGER DEFAULT 0)`)
            db.exec(`CREATE TABLE IF NOT EXISTS focus_sessions (id TEXT PRIMARY KEY, user_id TEXT, task_id TEXT, type TEXT, seconds INTEGER DEFAULT 0, start_time TEXT, end_time TEXT, metadata TEXT, created_at TEXT, synced INTEGER DEFAULT 0)`)
            db.prepare("INSERT OR REPLACE INTO db_meta (key,value) VALUES ('version','1')").run()
        })()
        version = 1
    }

    if (version < 2) {
        db.transaction(() => {
            const taskCols = db.prepare("PRAGMA table_info(tasks)").all()
            if (!taskCols.some((c: any) => c.name === 'is_recurring')) db.exec("ALTER TABLE tasks ADD COLUMN is_recurring INTEGER DEFAULT 0")
            if (!taskCols.some((c: any) => c.name === 'last_reset_date')) db.exec("ALTER TABLE tasks ADD COLUMN last_reset_date TEXT")
            db.prepare("UPDATE db_meta SET value='2' WHERE key='version'").run()
        })()
        version = 2
    }

    if (version < 3) {
        db.transaction(() => {
            db.exec("CREATE TABLE IF NOT EXISTS apps (id TEXT PRIMARY KEY, name TEXT, category TEXT, productive_score INTEGER DEFAULT 0, created_at TEXT)")
            db.exec("CREATE TABLE IF NOT EXISTS contexts (id TEXT PRIMARY KEY, type TEXT, ref_id TEXT, created_at TEXT)")
            db.exec("CREATE TABLE IF NOT EXISTS app_sessions (id TEXT PRIMARY KEY, user_id TEXT, app_id TEXT, context_id TEXT, start_time TEXT, end_time TEXT, duration_seconds INTEGER DEFAULT 0, idle_seconds INTEGER DEFAULT 0, window_title TEXT, activity_level INTEGER DEFAULT 0, synced INTEGER DEFAULT 0, created_at TEXT)")
            db.prepare("UPDATE db_meta SET value='3' WHERE key='version'").run()
        })()
        version = 3
    }

    // Safety columns
    const listCols = db.prepare("PRAGMA table_info(lists)").all()
    if (!listCols.some((c: any) => c.name === 'archived_at')) db.exec("ALTER TABLE lists ADD COLUMN archived_at TEXT")
    if (!listCols.some((c: any) => c.name === 'deleted_at')) db.exec("ALTER TABLE lists ADD COLUMN deleted_at TEXT")
    if (!listCols.some((c: any) => c.name === 'workspace_id')) db.exec("ALTER TABLE lists ADD COLUMN workspace_id TEXT")
    const taskCols = db.prepare("PRAGMA table_info(tasks)").all()
    if (!taskCols.some((c: any) => c.name === 'deleted_at')) db.exec("ALTER TABLE tasks ADD COLUMN deleted_at TEXT")
    if (!taskCols.some((c: any) => c.name === 'assigned_to')) db.exec("ALTER TABLE tasks ADD COLUMN assigned_to TEXT")
    const subtaskCols = db.prepare("PRAGMA table_info(subtasks)").all()
    if (!subtaskCols.some((c: any) => c.name === 'deleted_at')) db.exec("ALTER TABLE subtasks ADD COLUMN deleted_at TEXT")

    // Explicit activity_level fix
    const sessionCols = db.prepare("PRAGMA table_info(app_sessions)").all()
    if (sessionCols.length > 0 && !sessionCols.some((c: any) => c.name === 'activity_level')) {
        db.exec("ALTER TABLE app_sessions ADD COLUMN activity_level INTEGER DEFAULT 0")
    }

    if (version < 4) {
        db.transaction(() => {
            db.exec(`CREATE TABLE IF NOT EXISTS domain_sessions (id TEXT PRIMARY KEY, user_id TEXT, domain TEXT, start_time TEXT, end_time TEXT, duration_seconds INTEGER DEFAULT 0, created_at TEXT, synced INTEGER DEFAULT 0)`)
            db.exec(`CREATE TABLE IF NOT EXISTS app_categories (id TEXT PRIMARY KEY, name TEXT, productivity_score INTEGER DEFAULT 0, created_at TEXT, synced INTEGER DEFAULT 0)`)
            db.exec(`CREATE TABLE IF NOT EXISTS domain_categories (id TEXT PRIMARY KEY, domain TEXT, category TEXT, productivity_score INTEGER DEFAULT 0, created_at TEXT, synced INTEGER DEFAULT 0)`)

            // Add column to apps table if it doesn't exist (it was created in v3 but might lack some fields)
            const appCols = db.prepare("PRAGMA table_info(apps)").all()
            if (!appCols.some((c: any) => c.name === 'icon')) db.exec("ALTER TABLE apps ADD COLUMN icon TEXT")

            // Indexes for performance
            db.exec("CREATE INDEX IF NOT EXISTS idx_app_sessions_start_time ON app_sessions(start_time)")
            db.exec("CREATE INDEX IF NOT EXISTS idx_domain_sessions_start_time ON domain_sessions(start_time)")
            db.exec("CREATE INDEX IF NOT EXISTS idx_app_sessions_app_id ON app_sessions(app_id)")
            db.exec("CREATE INDEX IF NOT EXISTS idx_domain_sessions_domain ON domain_sessions(domain)")

            db.prepare("UPDATE db_meta SET value='4' WHERE key='version'").run()
        })()
        version = 4
    }

    if (version < 5) {
        db.transaction(() => {
            db.exec(`CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                color TEXT DEFAULT '#6366f1',
                icon TEXT DEFAULT 'briefcase',
                sort_order INTEGER DEFAULT 0,
                created_at TEXT,
                updated_at TEXT,
                deleted_at TEXT,
                synced INTEGER DEFAULT 0
            )`)
            db.exec("CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id)")
            db.prepare("UPDATE db_meta SET value='5' WHERE key='version'").run()
        })()
        version = 5
    }

    if (version < 6) {
        db.transaction(() => {
            // Add workspace_id to lists (safe for existing rows — NULL = unassigned)
            const listCols = db.prepare("PRAGMA table_info(lists)").all()
            if (!listCols.some((c: any) => c.name === 'workspace_id')) {
                db.exec("ALTER TABLE lists ADD COLUMN workspace_id TEXT")
                db.exec("CREATE INDEX IF NOT EXISTS idx_lists_workspace_id ON lists(workspace_id)")
            }
            db.prepare("UPDATE db_meta SET value='6' WHERE key='version'").run()
        })()
        version = 6
    }

    if (version < 7) {
        db.transaction(() => {
            db.exec(`UPDATE workspaces SET synced = 0`)
            db.exec(`UPDATE lists SET synced = 0`)
            db.prepare("UPDATE db_meta SET value='7' WHERE key='version'").run()
        })()
        version = 7
    }

    if (version < 8) {
        db.transaction(() => {
            // Performance indexes for reports queries
            db.exec("CREATE INDEX IF NOT EXISTS idx_focus_sessions_start_time ON focus_sessions(start_time)")
            db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at)")
            db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id)")
            db.prepare("UPDATE db_meta SET value='8' WHERE key='version'").run()
        })()
        version = 8
    }

    if (version < 9) {
        db.transaction(() => {
            // Add deleted_at to focus_sessions for soft-delete sync support
            const fsCols = db.prepare("PRAGMA table_info(focus_sessions)").all()
            if (!fsCols.some((c: any) => c.name === 'deleted_at')) {
                db.exec("ALTER TABLE focus_sessions ADD COLUMN deleted_at TEXT")
            }
            db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_user_deleted ON tasks(user_id, deleted_at)")
            db.exec("CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id)")
            db.exec("CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id)")
            db.prepare("UPDATE db_meta SET value='9' WHERE key='version'").run()
        })()
        version = 9
    }

    // Canvas tables — always ensure they exist (idempotent CREATE IF NOT EXISTS).
    // Ran unconditionally because an earlier dev build may have bumped the version
    // without the canvas DDL succeeding.
    db.exec(`
        CREATE TABLE IF NOT EXISTS canvases (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            workspace_id TEXT,
            title TEXT NOT NULL,
            icon TEXT,
            color TEXT,
            viewport_json TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
            home_viewport_json TEXT,
            settings_json TEXT NOT NULL DEFAULT '{"grid":true,"snap":false,"autoZoneHints":false}',
            schema_version INTEGER DEFAULT 1,
            created_at TEXT, updated_at TEXT, deleted_at TEXT,
            synced INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS canvases_user_idx ON canvases(user_id, deleted_at);

        CREATE TABLE IF NOT EXISTS blocks (
            id TEXT PRIMARY KEY,
            canvas_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            kind TEXT NOT NULL,
            x REAL NOT NULL, y REAL NOT NULL,
            w REAL NOT NULL, h REAL NOT NULL,
            z INTEGER DEFAULT 0,
            rotation REAL DEFAULT 0,
            content_json TEXT NOT NULL,
            style_json TEXT,
            tags_json TEXT,
            linked_task_id TEXT,
            is_landmark INTEGER DEFAULT 0,
            last_touched_at TEXT,
            created_at TEXT, updated_at TEXT, deleted_at TEXT,
            synced INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS blocks_canvas_idx ON blocks(canvas_id, deleted_at);
        CREATE INDEX IF NOT EXISTS blocks_linked_task_idx ON blocks(linked_task_id);

        CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,
            canvas_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            from_block_id TEXT NOT NULL,
            to_block_id TEXT NOT NULL,
            from_anchor TEXT DEFAULT 'auto',
            to_anchor TEXT DEFAULT 'auto',
            kind TEXT DEFAULT 'reference',
            label TEXT,
            style_json TEXT,
            condition_json TEXT,
            created_at TEXT, updated_at TEXT, deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS connections_canvas_idx ON connections(canvas_id, deleted_at);
        CREATE INDEX IF NOT EXISTS connections_from_idx ON connections(from_block_id);
        CREATE INDEX IF NOT EXISTS connections_to_idx ON connections(to_block_id);

        CREATE TABLE IF NOT EXISTS zones (
            id TEXT PRIMARY KEY,
            canvas_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            name TEXT,
            color TEXT,
            icon TEXT,
            pattern TEXT DEFAULT 'none',
            bounds_json TEXT NOT NULL,
            created_at TEXT, updated_at TEXT, deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS zones_canvas_idx ON zones(canvas_id, deleted_at);

        CREATE TABLE IF NOT EXISTS link_previews (
            url TEXT PRIMARY KEY,
            title TEXT, description TEXT, image TEXT, site_name TEXT,
            fetched_at TEXT
        );
    `)
    if (version < 10) {
        db.transaction(() => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS canvases (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    workspace_id TEXT,
                    title TEXT NOT NULL,
                    icon TEXT,
                    color TEXT,
                    viewport_json TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
                    home_viewport_json TEXT,
                    settings_json TEXT NOT NULL DEFAULT '{"grid":true,"snap":false,"autoZoneHints":false}',
                    schema_version INTEGER DEFAULT 1,
                    created_at TEXT, updated_at TEXT, deleted_at TEXT
                );
                CREATE INDEX IF NOT EXISTS canvases_user_idx ON canvases(user_id, deleted_at);

                CREATE TABLE IF NOT EXISTS blocks (
                    id TEXT PRIMARY KEY,
                    canvas_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    x REAL NOT NULL, y REAL NOT NULL,
                    w REAL NOT NULL, h REAL NOT NULL,
                    z INTEGER DEFAULT 0,
                    rotation REAL DEFAULT 0,
                    content_json TEXT NOT NULL,
                    style_json TEXT,
                    tags_json TEXT,
                    linked_task_id TEXT,
                    is_landmark INTEGER DEFAULT 0,
                    last_touched_at TEXT,
                    created_at TEXT, updated_at TEXT, deleted_at TEXT
                );
                CREATE INDEX IF NOT EXISTS blocks_canvas_idx ON blocks(canvas_id, deleted_at);
                CREATE INDEX IF NOT EXISTS blocks_linked_task_idx ON blocks(linked_task_id);

                CREATE TABLE IF NOT EXISTS connections (
                    id TEXT PRIMARY KEY,
                    canvas_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    from_block_id TEXT NOT NULL,
                    to_block_id TEXT NOT NULL,
                    from_anchor TEXT DEFAULT 'auto',
                    to_anchor TEXT DEFAULT 'auto',
                    kind TEXT DEFAULT 'reference',
                    label TEXT,
                    style_json TEXT,
                    created_at TEXT, updated_at TEXT, deleted_at TEXT
                );
                CREATE INDEX IF NOT EXISTS connections_canvas_idx ON connections(canvas_id, deleted_at);
                CREATE INDEX IF NOT EXISTS connections_from_idx ON connections(from_block_id);
                CREATE INDEX IF NOT EXISTS connections_to_idx ON connections(to_block_id);

                CREATE TABLE IF NOT EXISTS zones (
                    id TEXT PRIMARY KEY,
                    canvas_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    name TEXT,
                    color TEXT,
                    icon TEXT,
                    pattern TEXT DEFAULT 'none',
                    bounds_json TEXT NOT NULL,
                    created_at TEXT, updated_at TEXT, deleted_at TEXT
                );
                CREATE INDEX IF NOT EXISTS zones_canvas_idx ON zones(canvas_id, deleted_at);

                CREATE TABLE IF NOT EXISTS link_previews (
                    url TEXT PRIMARY KEY,
                    title TEXT, description TEXT, image TEXT, site_name TEXT,
                    fetched_at TEXT
                );
            `)
            db.prepare("UPDATE db_meta SET value='10' WHERE key='version'").run()
        })()
        version = 10
    }
    if (version < 11) {
        db.transaction(() => {
            const cols = (db.prepare("PRAGMA table_info(connections)").all() as any[]).map((r) => r.name)
            if (!cols.includes('condition_json')) {
                db.exec('ALTER TABLE connections ADD COLUMN condition_json TEXT')
            }
            db.prepare("UPDATE db_meta SET value='11' WHERE key='version'").run()
        })()
        version = 11
    }
    if (version < 12) {
        // Canvas tables predate cloud sync — add the `synced` dirty-flag column so
        // they flow through dataSyncService's push/pull like tasks/lists do.
        db.transaction(() => {
            for (const table of ['canvases', 'blocks']) {
                const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map((r) => r.name)
                if (!cols.includes('synced')) {
                    db.exec(`ALTER TABLE ${table} ADD COLUMN synced INTEGER DEFAULT 0`)
                }
            }
            db.prepare("UPDATE db_meta SET value='12' WHERE key='version'").run()
        })()
        version = 12
    }
}

/* ---------------- INIT ---------------- */

export async function initDatabase() {
    const dir = app.getPath('userData')
    const file = path.join(dir, 'quoril_v2.sqlite')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    try {
        db = new Database(file, { timeout: 5000 }) // 5 second busy-timeout to prevent SQLITE_BUSY crashes
        db.pragma('journal_mode = WAL')
        db.pragma('synchronous = NORMAL')
        autoMigrate()
        dbOps.cleanupOrphanedSessions()
        dbOps.cleanupCorruptedSessions()  // FIX: Remove corrupted session data
    } catch (err) {
        console.error('[DB] Init error:', err)
        throw err
    }
}
