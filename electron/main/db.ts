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

    getLists(userId: string, archived = false) {
        const cond = archived ? "archived_at IS NOT NULL AND deleted_at IS NULL" : "archived_at IS NULL AND deleted_at IS NULL"
        return exec(`SELECT * FROM lists WHERE user_id =? AND ${cond} ORDER BY sort_order ASC`, [userId])
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
        return exec("SELECT * FROM focus_sessions WHERE user_id =? ORDER BY created_at DESC LIMIT 100", [userId])
    },

    getAppUsage(startDate: string, endDate: string) {
        return exec("SELECT s.app_id as appName, SUM(s.duration_seconds) as totalSeconds, MAX(s.window_title) as lastTitle, a.category FROM app_sessions s LEFT JOIN apps a ON s.app_id = a.id WHERE s.start_time >= ? AND s.start_time <= ? GROUP BY s.app_id ORDER BY totalSeconds DESC", [startDate, endDate])
    },

    getDailyActivity(startDate: string, endDate: string) {
        return exec("SELECT strftime('%Y-%m-%d', start_time) as day, SUM(duration_seconds) as totalSeconds FROM app_sessions WHERE start_time >= ? AND start_time <= ? GROUP BY day", [startDate, endDate])
    },

    getAppUsageByTask(taskId: string) {
        return exec("SELECT s.app_id as appName, SUM(s.duration_seconds) as totalSeconds FROM app_sessions s JOIN contexts c ON s.context_id = c.id WHERE c.type = 'task' AND c.ref_id = ? GROUP BY s.app_id ORDER BY totalSeconds DESC", [taskId])
    },

    saveSession(session: any) {
        session.synced = 0
        if (!session.created_at) session.created_at = now()
        const cols = Object.keys(session)
        const vals = sanitize(Object.values(session))
        exec(`INSERT OR REPLACE INTO focus_sessions(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, vals)
    },

    getPending(table: string) {
        return exec(`SELECT * FROM ${table} WHERE synced = 0 LIMIT 50`)
    },

    markSynced(table: string, id: string) {
        exec(`UPDATE ${table} SET synced = 1 WHERE id =?`, [id])
    },

    cleanupCorruptedSessions() {
        // Remove sessions with impossible durations (>24 hours or negative)
        const corrupted = exec(`SELECT id, seconds FROM focus_sessions WHERE seconds > 86400 OR seconds < 0`) as any[]
        if (corrupted && corrupted.length > 0) {
            console.warn(`[DB] Found ${corrupted.length} corrupted sessions, removing...`)
            corrupted.forEach(s => {
                console.warn(`[DB] Removing session ${s.id} with ${s.seconds}s (${Math.round(s.seconds / 3600)}h)`)
            })
            exec(`DELETE FROM focus_sessions WHERE seconds > 86400 OR seconds < 0`)
            console.log(`[DB] Cleanup complete`)
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
    const taskCols = db.prepare("PRAGMA table_info(tasks)").all()
    if (!taskCols.some((c: any) => c.name === 'deleted_at')) db.exec("ALTER TABLE tasks ADD COLUMN deleted_at TEXT")
    const subtaskCols = db.prepare("PRAGMA table_info(subtasks)").all()
    if (!subtaskCols.some((c: any) => c.name === 'deleted_at')) db.exec("ALTER TABLE subtasks ADD COLUMN deleted_at TEXT")

    // Explicit activity_level fix
    const sessionCols = db.prepare("PRAGMA table_info(app_sessions)").all()
    if (sessionCols.length > 0 && !sessionCols.some((c: any) => c.name === 'activity_level')) {
        db.exec("ALTER TABLE app_sessions ADD COLUMN activity_level INTEGER DEFAULT 0")
    }
}

/* ---------------- INIT ---------------- */

export async function initDatabase() {
    const dir = app.getPath('userData')
    const file = path.join(dir, 'quoril_v2.sqlite')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    try {
        db = new Database(file)
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
