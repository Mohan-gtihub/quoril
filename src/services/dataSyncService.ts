// dataSyncService.ts

import { supabase } from './supabase'

const SYNC_INTERVAL = 10000

/* FK-safe order — workspaces must come before lists */
const SYNC_ORDER = [
    'workspaces',
    'lists',
    'tasks',
    'subtasks',
    'focus_sessions',
] as const

type SyncTable = typeof SYNC_ORDER[number]

class DataSyncService {

    private syncing = false
    private timer: number | null = null
    private schemaCacheWarned = false
    private lastCacheErrorTime = 0
    private cacheRecoveryAttempts = 0

    /* ================= START / STOP ================= */

    start() {
        if (this.timer) return


        this.timer = window.setInterval(
            () => this.syncPendings(),
            SYNC_INTERVAL
        )

        this.syncPendings()
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }
    }

    /* ================= TRIGGER ================= */

    trigger() {
        this.syncPendings()
    }

    /* ================= MAIN LOOP ================= */

    private async syncPendings() {
        if (this.syncing || !navigator.onLine) return

        // Check Auth First
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user

        if (!user) return

        this.syncing = true

        try {
            for (const table of SYNC_ORDER) {
                await this.syncTable(table, user.id)
            }
        } finally {
            this.syncing = false
        }
    }

    /* ================= PER TABLE ================= */

    private async syncTable(table: SyncTable, userId: string) {

        if (!window.electronAPI?.db) return

        const pendings =
            await window.electronAPI.db.getPending(table)

        if (!pendings?.length) return


        for (const row of pendings) {

            let payload: any = null

            try {

                /* ---------- FK guard ---------- */

                if (table === 'focus_sessions' && row.task_id) {

                    const exists = await window.electronAPI.db.exec(
                        'SELECT id FROM tasks WHERE id = ? AND deleted_at IS NULL',
                        [row.task_id]
                    )

                    if (!exists?.length) {

                        console.warn('[Sync] Dropping orphan focus session:', row.id)

                        await window.electronAPI.db.markSynced(table, row.id)

                        continue
                    }
                }

                /* ---------- Build payload ---------- */

                // Overwrite user_id with current auth user
                payload =
                    await this.buildPayload(table, { ...row, user_id: userId })

                if (!payload) {
                    await window.electronAPI.db.markSynced(table, row.id)
                    continue
                }

                // Log workspace uploads for easier debugging
                if (table === 'workspaces') {
                    console.log(`[Sync] Pushing workspace ${row.id} (${row.name}) to Supabase...`)
                }


                /* ---------- Push to Supabase ---------- */

                const { error } = await (supabase.from(table) as any)
                    .upsert(payload, {
                        onConflict: 'id'
                    })

                if (error) throw error

                /* ---------- Mark synced ---------- */

                await window.electronAPI.db.markSynced(
                    table,
                    row.id
                )

                // Detect successful recovery from cache errors
                if (this.cacheRecoveryAttempts > 0 && !this.schemaCacheWarned) {
                    console.log(`✅ [Sync] Schema cache recovered! Full sync restored after ${this.cacheRecoveryAttempts} attempts.`)
                    this.cacheRecoveryAttempts = 0
                }

            } catch (err: any) {

                /* Schema Cache Error - Supabase needs manual refresh */
                if (err?.code === 'PGRST204') {
                    this.lastCacheErrorTime = Date.now()

                    if (!this.schemaCacheWarned) {
                        this.schemaCacheWarned = true
                        console.warn(`\n⚠️  SUPABASE SCHEMA CACHE ISSUE DETECTED\n` +
                            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                            `The Supabase PostgREST schema cache is outdated.\n\n` +
                            `To fix:\n` +
                            `1. Go to your Supabase Dashboard\n` +
                            `2. Navigate to: Settings → API\n` +
                            `3. Click "Reload Schema"\n\n` +
                            `Meanwhile, sync continues with reduced fields.\n` +
                            `Full sync resumes automatically once cache updates.\n` +
                            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
                    }

                    // Try full schema recovery every 2 minutes
                    const timeSinceError = Date.now() - this.lastCacheErrorTime
                    if (timeSinceError > 120000) { // 2 minutes
                        this.cacheRecoveryAttempts++
                        console.log(`[Sync] Attempting cache recovery (attempt ${this.cacheRecoveryAttempts})...`)
                        this.schemaCacheWarned = false // Re-enable full fields for next sync
                        this.lastCacheErrorTime = Date.now()
                    }

                    // Don't mark as synced, will retry later
                    continue
                }

                /* Handle Foreign Key Violations gracefully */
                if (err?.code === '23503') {
                    if (table === 'lists' && payload.workspace_id) {
                        // Check if the workspace exists locally at all
                        const wsRows = await window.electronAPI.db.exec(
                            'SELECT id, synced FROM workspaces WHERE id=? AND deleted_at IS NULL',
                            [payload.workspace_id]
                        ).catch(() => [])

                        if (wsRows?.length) {
                            // Workspace exists locally but not in Supabase yet.
                            // Reset it to synced=0 so it gets pushed on the next cycle.
                            console.warn(`[Sync] Workspace ${payload.workspace_id} not yet in Supabase. Re-queuing workspace & will retry list next cycle.`)
                            await window.electronAPI.db.exec(
                                'UPDATE workspaces SET synced=0 WHERE id=?',
                                [payload.workspace_id]
                            ).catch(() => { })
                            // Also force a fresh sync pass after a short delay
                            setTimeout(() => this.syncPendings(), 3000)
                        } else {
                            // Workspace does NOT exist locally (deleted or orphaned).
                            // Sync the list without workspace_id to avoid infinite loop.
                            console.warn(`[Sync] Workspace ${payload.workspace_id} not found locally for list ${row.id}. Syncing without workspace_id.`)
                            delete payload.workspace_id
                            const { error: retryErr } = await (supabase.from(table) as any)
                                .upsert(payload, { onConflict: 'id' })
                            if (!retryErr) {
                                await window.electronAPI.db.markSynced(table, row.id)
                            }
                        }
                        continue
                    } else if (table === 'tasks' && payload.list_id) {
                        console.warn(`[Sync] List missing in cloud for task ${row.id}. Retrying without list_id...`)
                        payload.list_id = null
                        const { error: retryErr } = await (supabase.from(table) as any)
                            .upsert(payload, { onConflict: 'id' })

                        if (!retryErr) {
                            await window.electronAPI.db.markSynced(table, row.id)
                            continue
                        } else {
                            err = retryErr
                        }
                    }
                }

                /* Prevent infinite retry on truly unrecoverable rows */
                if (
                    err?.code === '23514' ||
                    err?.code === '42501' || // RLS Policy Violation (Permission/Auth)
                    String(err).includes('violates check') ||
                    String(err).includes('policy')
                ) {
                    console.error(`❌ [Sync] ${table}/${row.id} REJECTED:`, {
                        code: err?.code,
                        message: err?.message,
                        hint: err?.hint,
                        details: err?.details,
                        payload: payload
                    })
                    console.warn(`[Sync] Marking as synced to prevent retry loop`)

                    await window.electronAPI.db.markSynced(
                        table,
                        row.id
                    )
                } else {
                    // Log unexpected errors for debugging
                    console.error(`[Sync] Unexpected error for ${table}/${row.id}:`, {
                        code: err?.code,
                        message: err?.message,
                        hint: err?.hint,
                        details: err?.details
                    })
                }
            }
        }
    }

    /* ================= PAYLOAD BUILDER ================= */

    private async buildPayload(table: SyncTable, row: any) {
        switch (table) {
            /* ---------- WORKSPACES ---------- */
            case 'workspaces':
                // Workspaces must always sync — lists have a FK dependency on them
                return {
                    id: row.id,
                    user_id: row.user_id,
                    name: row.name,
                    color: row.color,
                    icon: row.icon,
                    sort_order: row.sort_order ?? 0,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    deleted_at: row.deleted_at,
                }

            /* ---------- LISTS ---------- */
            case 'lists': {
                const listPayload: any = {
                    id: row.id,
                    user_id: row.user_id,
                    name: row.name,
                    color: row.color,
                    icon: row.icon,
                    sort_order: row.sort_order ?? 0,
                    is_system: Boolean(row.is_system),
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    archived_at: row.archived_at,
                    deleted_at: row.deleted_at
                }
                // Only include workspace_id after column has been added to Supabase
                if (!this.schemaCacheWarned && row.workspace_id !== undefined) {
                    listPayload.workspace_id = row.workspace_id ?? null
                }
                return listPayload
            }

            /* ---------- TASKS ---------- */
            case 'tasks': {
                const status = this.mapTaskStatus(row.status)
                const priority = this.mapTaskPriority(row.priority)

                // Sanitize UUIDs
                const listId = (!row.list_id || row.list_id === 'all') ? null : row.list_id
                const parentId = (!row.parent_id || row.parent_id === 'all') ? null : row.parent_id

                const payload: any = {
                    id: row.id,
                    user_id: row.user_id,
                    list_id: listId,
                    title: row.title,
                    description: row.description,
                    status: status,
                    priority: priority,
                    estimate_m: row.estimate_m ?? 0,
                    spent_s: row.spent_s ?? 0,
                    started_at: row.started_at,
                    completed_at: row.completed_at,
                    parent_id: parentId,
                    sort_order: row.sort_order ?? 0,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    deleted_at: row.deleted_at,
                }

                // TEMPORARY: Add due_at only if not in cache-error mode
                // This prevents PGRST204 errors while Supabase schema cache updates
                if (!this.schemaCacheWarned && row.due_at) {
                    payload.due_at = row.due_at
                }

                return payload
            }

            /* ---------- SUBTASKS ---------- */
            case 'subtasks':
                return {
                    id: row.id,
                    user_id: row.user_id,
                    task_id: row.task_id,
                    title: row.title,
                    done: Boolean(row.done),
                    sort_order: row.sort_order ?? 0,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    deleted_at: row.deleted_at
                }

            /* ---------- FOCUS ---------- */
            case 'focus_sessions': {
                // Sanitize Task ID
                const taskId = (!row.task_id || row.task_id === '') ? null : row.task_id

                const payload: any = {
                    id: row.id,
                    user_id: row.user_id,
                    task_id: taskId,
                    type: this.mapSessionType(row.type),
                    seconds: row.seconds ?? 0,
                    start_time: row.start_time,
                    metadata: row.metadata,
                    created_at: row.created_at
                }

                // TEMPORARY: Add end_time only if not in cache-error mode
                // This prevents PGRST204 errors while Supabase schema cache updates
                if (!this.schemaCacheWarned && row.end_time) {
                    payload.end_time = row.end_time
                }

                return payload
            }

            default:
                return null
        }
    }

    /* ================= STATUS MAP ================= */

    private mapTaskStatus(local: string) {
        const s = (local || '').toLowerCase();
        switch (s) {
            case 'active':
            case 'in_progress':
                return 'in_progress'; // Matches DB 'in_progress'
            case 'paused':
            case 'in_review':
                return 'in_review'; // Matches DB 'in_review'
            case 'done':
            case 'completed':
                return 'done'; // Matches DB 'done'
            case 'planned':
                return 'todo'; // 'planned' not in strict DB constraint
            case 'todo':
            default:
                return 'todo';
        }
    }

    private mapTaskPriority(local: string) {
        const p = (local || '').toLowerCase()
        switch (p) {
            case 'critical':
                return 'critical'
            case 'high':
                return 'high'
            case 'low':
                return 'low'
            case 'medium':
            default:
                return 'medium'
        }
    }

    private mapSessionType(local: string) {
        const t = (local || '').toLowerCase()
        switch (t) {
            case 'focus':
            case 'work':
            case 'deep':
            case 'pomodoro':
                return 'focus'
            case 'break':
            case 'short_break':
                return 'break'
            case 'long_break':
            case 'long':
                return 'long_break'
            default:
                return 'focus'
        }
    }
}

export const dataSyncService = new DataSyncService()
