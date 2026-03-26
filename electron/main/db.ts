import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

let db: Database.Database

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
        return exec("SELECT * FROM focus_sessions WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC", [userId])
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

    /* ---- Named update ops (replace raw db:exec) ---- */

    updateTask(id: string, updates: Record<string, any>) {
        const TASK_COLUMNS = new Set(['title','description','status','priority','estimate_m','spent_s','started_at','due_at','completed_at','parent_id','sort_order','updated_at','deleted_at','synced','is_recurring','last_reset_date','list_id'])
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

        return {
            focusSummary,
            weeklyTrend,
            taskStats,
            appUsage,
            contextSwitching,
            workspaceStats,
            productiveAppSeconds,
            allAppSeconds,
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
