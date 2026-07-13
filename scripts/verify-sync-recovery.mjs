import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { createClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
const Sqlite = require('better-sqlite3')

const required = [
    'SYNC_TEST_SUPABASE_URL',
    'SYNC_TEST_SUPABASE_ANON_KEY',
    'SYNC_TEST_SUPABASE_SERVICE_ROLE_KEY',
]
const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    process.exitCode = 1
} else if (process.env.SYNC_TEST_ALLOW_LIVE !== 'true') {
    console.error('Refusing to run against Supabase without SYNC_TEST_ALLOW_LIVE=true.')
    process.exitCode = 1
} else {
    await run()
}

async function run() {
    const url = process.env.SYNC_TEST_SUPABASE_URL
    const anonKey = process.env.SYNC_TEST_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SYNC_TEST_SUPABASE_SERVICE_ROLE_KEY
    const admin = createClient(url, serviceRoleKey, clientOptions())
    const runId = `sync-${Date.now()}-${randomUUID().slice(0, 8)}`
    const password = `Sync!${randomUUID()}Aa1`
    const email = `${runId}@example.invalid`
    const tempDir = await mkdtemp(path.join(tmpdir(), 'quoril-sync-'))
    let userId = null
    let deviceA = null
    let deviceB = null

    try {
        userId = await createTestUser(admin, email, password)
        const clientA = await signIn(url, anonKey, email, password)
        const clientB = await signIn(url, anonKey, email, password)
        const taskId = randomUUID()
        const baseTime = Date.now()

        deviceA = new DeviceJournal(path.join(tempDir, 'device-a.sqlite'), clientA, userId)
        deviceB = new DeviceJournal(path.join(tempDir, 'device-b.sqlite'), clientB, userId)

        deviceA.save(task(taskId, userId, `${runId} offline create`, timestamp(baseTime)))
        assert(deviceA.pendingCount() === 1, 'offline mutation is durable before sync')
        deviceA.close()
        deviceA = new DeviceJournal(path.join(tempDir, 'device-a.sqlite'), clientA, userId)
        assert(deviceA.pendingCount() === 1, 'queued mutation survives desktop restart')
        await deviceA.sync(false)
        assert(deviceA.pendingCount() === 1, 'offline sync attempt preserves queue')
        pass('offline mutation survives restart and remains queued')

        await deviceA.sync(true)
        assert(deviceA.pendingCount() === 0, 'reconnect drains the local queue')
        await deviceB.pull(taskId)
        assert(deviceB.get(taskId)?.title === `${runId} offline create`, 'second device receives reconnect upload')
        pass('reconnect uploads and second device restores the change')

        deviceB.save(task(taskId, userId, `${runId} device-b edit`, timestamp(baseTime + 1_000)))
        await deviceB.sync(true)
        deviceA.save(task(taskId, userId, `${runId} device-a newer edit`, timestamp(baseTime + 2_000)))
        deviceA.close()
        deviceA = new DeviceJournal(path.join(tempDir, 'device-a.sqlite'), clientA, userId)
        await deviceA.sync(true)
        await deviceB.pull(taskId)
        assert(deviceB.get(taskId)?.title === `${runId} device-a newer edit`, 'newer local edit wins after reconnect')
        pass('last-write-wins conflict resolves to the newer offline edit')

        const preDelete = deviceA.get(taskId)
        deviceB.softDelete(taskId, timestamp(baseTime + 3_000))
        await deviceB.sync(true)
        await deviceA.pull(taskId)
        assert(deviceA.get(taskId)?.deleted_at, 'remote delete becomes a local tombstone')
        deviceA.mergeCloud({ ...preDelete, deleted_at: null })
        assert(deviceA.get(taskId)?.deleted_at, 'stale non-deleted row cannot resurrect tombstone')
        pass('deletion syncs as a tombstone and cannot be resurrected')

        console.log(`Sync recovery verification passed (4 checks, ${runId}).`)
    } catch (error) {
        console.error(`Sync recovery verification failed: ${describeError(error)}`)
        process.exitCode = 1
    } finally {
        deviceA?.close()
        deviceB?.close()
        if (userId) {
            const { error } = await admin.auth.admin.deleteUser(userId)
            if (error) {
                console.error(`Test-user cleanup failed. Remove ${email} manually.`)
                process.exitCode = 1
            }
        }
        await rm(tempDir, { recursive: true, force: true })
    }
}

class DeviceJournal {
    constructor(file, client, userId) {
        this.db = new Sqlite(file)
        this.client = client
        this.userId = userId
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT,
                synced INTEGER NOT NULL DEFAULT 0
            );
        `)
    }

    save(row) {
        this.db.prepare(`
            INSERT INTO tasks (id, user_id, title, updated_at, deleted_at, synced)
            VALUES (@id, @user_id, @title, @updated_at, @deleted_at, 0)
            ON CONFLICT(id) DO UPDATE SET
                user_id=excluded.user_id,
                title=excluded.title,
                updated_at=excluded.updated_at,
                deleted_at=excluded.deleted_at,
                synced=0
        `).run(row)
    }

    softDelete(id, deletedAt) {
        const row = this.get(id)
        if (!row) throw new Error(`cannot delete missing task ${id}`)
        this.save({ ...row, updated_at: deletedAt, deleted_at: deletedAt })
    }

    get(id) {
        return this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id) ?? null
    }

    pendingCount() {
        return this.db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE synced=0').get().count
    }

    async sync(online) {
        if (!online) return
        const pending = this.db.prepare('SELECT * FROM tasks WHERE synced=0').all()
        for (const row of pending) {
            const { error } = await this.client.from('tasks').upsert(toCloudTask(row), { onConflict: 'id' })
            if (error) throw new Error(`task sync failed: ${error.message}`)
            this.db.prepare('UPDATE tasks SET synced=1 WHERE id=?').run(row.id)
        }
    }

    async pull(id) {
        const { data, error } = await this.client.from('tasks').select('*').eq('id', id).eq('user_id', this.userId).maybeSingle()
        if (error) throw new Error(`task pull failed: ${error.message}`)
        if (data) this.mergeCloud(data)
    }

    mergeCloud(remote) {
        const local = this.get(remote.id)
        if (local?.deleted_at && !remote.deleted_at) return
        if (local?.updated_at && remote.updated_at && local.updated_at >= remote.updated_at) return
        this.db.prepare(`
            INSERT INTO tasks (id, user_id, title, updated_at, deleted_at, synced)
            VALUES (@id, @user_id, @title, @updated_at, @deleted_at, 1)
            ON CONFLICT(id) DO UPDATE SET
                user_id=excluded.user_id,
                title=excluded.title,
                updated_at=excluded.updated_at,
                deleted_at=excluded.deleted_at,
                synced=1
        `).run({
            id: remote.id,
            user_id: remote.user_id,
            title: remote.title,
            updated_at: remote.updated_at,
            deleted_at: remote.deleted_at,
        })
    }

    close() {
        this.db.close()
    }
}

function task(id, userId, title, updatedAt) {
    return { id, user_id: userId, title, updated_at: updatedAt, deleted_at: null }
}

function toCloudTask(row) {
    return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        status: 'todo',
        priority: 'medium',
        estimate_m: 0,
        spent_s: 0,
        sort_order: 0,
        created_at: row.updated_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
    }
}

function timestamp(value) {
    return new Date(value).toISOString()
}

function clientOptions() {
    return { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
}

async function createTestUser(admin, email, password) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) throw new Error(`could not create test user: ${error?.message ?? 'missing user'}`)
    return data.user.id
}

async function signIn(url, anonKey, email, password) {
    const client = createClient(url, anonKey, clientOptions())
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw new Error(`could not authenticate test user: ${error.message}`)
    return client
}

function assert(condition, message) {
    if (!condition) throw new Error(message)
}

function pass(label) {
    console.log(`PASS ${label}`)
}

function describeError(error) {
    return error instanceof Error ? error.message : String(error)
}
