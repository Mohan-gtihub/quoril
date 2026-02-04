import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

let db: Database.Database
const CURRENT_VERSION = 1

/* ---------------- INIT ---------------- */

export async function initDatabase() {
    const dir = app.getPath('userData')
    const file = path.join(dir, 'quoril_v2.sqlite')

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    db = new Database(file)

    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')

    autoMigrate()

}

/* ---------------- MIGRATION ---------------- */

function autoMigrate() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS db_meta (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `)

    const row = db
        .prepare('SELECT value FROM db_meta WHERE key=?')
        .get('version') as { value: string } | undefined

    let version = row ? Number(row.value) : 0

    if (version < 1) {

        db.transaction(() => {

            /* TASKS */

            db.exec(`
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    list_id TEXT,
                    title TEXT,
                    description TEXT,

                    status TEXT DEFAULT 'todo',
                    priority TEXT DEFAULT 'medium',

                    estimate_m INTEGER DEFAULT 0,
                    spent_s INTEGER DEFAULT 0,

                    started_at TEXT,
                    due_at TEXT,
                    completed_at TEXT,

                    parent_id TEXT,
                    sort_order INTEGER DEFAULT 0,

                    created_at TEXT,
                    updated_at TEXT,
                    deleted_at TEXT,

                    synced INTEGER DEFAULT 0
                )
            `)

            /* LISTS */

            db.exec(`
                CREATE TABLE IF NOT EXISTS lists (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,

                    name TEXT,
                    color TEXT,
                    icon TEXT,

                    sort_order INTEGER DEFAULT 0,
                    is_system INTEGER DEFAULT 0,

                    created_at TEXT,
                    updated_at TEXT,
                    deleted_at TEXT,

                    synced INTEGER DEFAULT 0
                )
            `)

            /* SUBTASKS */

            db.exec(`
                CREATE TABLE IF NOT EXISTS subtasks (
                    id TEXT PRIMARY KEY,
                    task_id TEXT,
                    user_id TEXT,

                    title TEXT,
                    done INTEGER DEFAULT 0,

                    sort_order INTEGER DEFAULT 0,

                    created_at TEXT,
                    updated_at TEXT,
                    deleted_at TEXT,

                    synced INTEGER DEFAULT 0
                )
            `)

            /* FOCUS */

            db.exec(`
                CREATE TABLE IF NOT EXISTS focus_sessions (
                    id TEXT PRIMARY KEY,

                    user_id TEXT,
                    task_id TEXT,

                    type TEXT,

                    seconds INTEGER DEFAULT 0,

                    start_time TEXT,
                    end_time TEXT,

                    metadata TEXT,

                    created_at TEXT,

                    synced INTEGER DEFAULT 0
                )
            `)

            db.prepare(`
                INSERT OR REPLACE INTO db_meta (key,value)
                VALUES ('version','1')
            `).run()

        })()

        version = 1
    }
}

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

/* ---------------- CORE EXEC ---------------- */

function exec(sql: string, params: any[] = []) {
    const clean = sanitize(params)

    try {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
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

    /* ---------- TASKS ---------- */

    getTasks(userId: string, listId?: string) {

        const sql = listId
            ? `SELECT * FROM tasks
               WHERE user_id=? AND list_id=? AND deleted_at IS NULL
               ORDER BY sort_order ASC`
            : `SELECT * FROM tasks
               WHERE user_id=? AND deleted_at IS NULL
               ORDER BY sort_order ASC`

        const params = listId ? [userId, listId] : [userId]

        return exec(sql, params)
    },

    saveTask(task: any) {

        task.updated_at = now()
        task.synced = 0

        if (!task.created_at) {
            task.created_at = now()
        }

        const cols = Object.keys(task)
        const vals = sanitize(Object.values(task))

        exec(
            `INSERT OR REPLACE INTO tasks (${cols.join(',')})
             VALUES (${cols.map(() => '?').join(',')})`,
            vals
        )
    },

    deleteTask(id: string) {

        exec(
            `UPDATE tasks
             SET deleted_at=?, synced=0
             WHERE id=?`,
            [now(), id]
        )

        exec(
            `UPDATE focus_sessions
             SET synced=1
             WHERE task_id=?`,
            [id]
        )
    },

    startTask(id: string) {

        exec(`
            UPDATE tasks
            SET
              spent_s = IFNULL(spent_s,0) +
                CAST(strftime('%s','now') - strftime('%s',started_at) AS INTEGER),

              started_at = NULL,
              status = 'paused',
              synced = 0

            WHERE started_at IS NOT NULL
        `)

        exec(
            `UPDATE tasks
             SET started_at=?, status='active', synced=0
             WHERE id=?`,
            [now(), id]
        )
    },

    pauseTask(id: string) {

        if (id === '__all__') {

            exec(`
                UPDATE tasks
                SET
                  spent_s = IFNULL(spent_s,0) +
                    CAST(strftime('%s','now') - strftime('%s',started_at) AS INTEGER),

                  started_at = NULL,
                  status='paused',
                  synced=0

                WHERE started_at IS NOT NULL
            `)

            return
        }

        exec(`
            UPDATE tasks
            SET
              spent_s = IFNULL(spent_s,0) +
                CAST(strftime('%s','now') - strftime('%s',started_at) AS INTEGER),

              started_at = NULL,
              status='paused',
              synced=0

            WHERE id=? AND started_at IS NOT NULL
        `, [id])
    },

    /* ---------- LISTS ---------- */

    getLists(userId: string) {

        return exec(`
            SELECT * FROM lists
            WHERE user_id=? AND deleted_at IS NULL
            ORDER BY sort_order ASC
        `, [userId])
    },

    saveList(list: any) {

        list.updated_at = now()
        list.synced = 0

        if (!list.created_at) {
            list.created_at = now()
        }

        const cols = Object.keys(list)
        const vals = sanitize(Object.values(list))

        exec(
            `INSERT OR REPLACE INTO lists (${cols.join(',')})
             VALUES (${cols.map(() => '?').join(',')})`,
            vals
        )
    },

    deleteList(id: string) {

        exec(
            `UPDATE lists
             SET deleted_at=?, synced=0
             WHERE id=?`,
            [now(), id]
        )
    },

    /* ---------- SUBTASKS ---------- */

    getSubtasks(taskId: string) {

        return exec(`
            SELECT * FROM subtasks
            WHERE task_id=? AND deleted_at IS NULL
            ORDER BY sort_order ASC
        `, [taskId])
    },

    saveSubtask(sub: any) {

        sub.updated_at = now()
        sub.synced = 0

        if (!sub.created_at) {
            sub.created_at = now()
        }

        const cols = Object.keys(sub)
        const vals = sanitize(Object.values(sub))

        exec(
            `INSERT OR REPLACE INTO subtasks (${cols.join(',')})
             VALUES (${cols.map(() => '?').join(',')})`,
            vals
        )
    },

    /* ---------- FOCUS ---------- */

    getSessions(userId: string) {

        return exec(`
            SELECT * FROM focus_sessions
            WHERE user_id=?
            ORDER BY created_at DESC
            LIMIT 100
        `, [userId])
    },

    saveSession(session: any) {

        session.synced = 0

        if (!session.created_at) {
            session.created_at = now()
        }

        const cols = Object.keys(session)
        const vals = sanitize(Object.values(session))

        exec(
            `INSERT OR REPLACE INTO focus_sessions (${cols.join(',')})
             VALUES (${cols.map(() => '?').join(',')})`,
            vals
        )
    },

    /* ---------- SYNC ---------- */

    getPending(table: string) {

        return exec(`
            SELECT * FROM ${table}
            WHERE synced=0
            LIMIT 50
        `)
    },

    markSynced(table: string, id: string) {

        exec(
            `UPDATE ${table} SET synced=1 WHERE id=?`,
            [id]
        )
    }
}
