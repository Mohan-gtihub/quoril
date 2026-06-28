// dataSyncService.ts

import { supabase } from './supabase'
import { useSyncStore } from '@/store/syncStore'

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

/* Pagination order column per table. Most tables have updated_at, but
   focus_sessions does not in the cloud schema — ordering it by updated_at makes
   the whole pull fail with "column does not exist". Fall back to created_at. */
const PULL_ORDER_COLUMN: Partial<Record<SyncTable, string>> = {
    focus_sessions: 'created_at',
}

class DataSyncService {

    private syncing = false
    private timer: number | null = null
    private schemaCacheWarned = false
    private lastCacheErrorTime = 0
    private cacheRecoveryAttempts = 0
    private aborted = false

    // Rows the server rejected this session (RLS/check violation). Tracked in
    // memory — NOT marked synced — so we stop retrying them this session (no
    // log spam, no infinite loop) but retry automatically next app launch, e.g.
    // after the user fixes their RLS policy. Keyed `${table}:${id}`.
    private rejected = new Set<string>()

    /* ================= START / STOP ================= */

    private pulledOnce = false

    start() {
        if (this.timer) return
        this.aborted = false
        // Fresh session (or re-login): give previously rejected rows another go.
        this.rejected.clear()

        this.timer = window.setInterval(
            () => this.syncPendings(),
            SYNC_INTERVAL
        )

        // First: restore the user's past cloud data DOWN into local SQLite,
        // then run the normal push loop. pull() guards itself to run once per session.
        this.pull()
            .catch(err => console.error('[Sync] Initial cloud pull failed:', err))
            .finally(() => this.syncPendings())
    }

    stop() {
        this.aborted = true
        this.pulledOnce = false
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }
    }

    /* ================= PULL (cloud → local restore) ================= */

    /**
     * Download the signed-in user's existing cloud data and merge it into local
     * SQLite. This is what makes a returning user / fresh install / new device
     * see their past tasks, lists, workspaces, subtasks and focus sessions again.
     *
     * Runs once per session (guarded by pulledOnce). Last-write-wins is enforced
     * in the main process (upsertFromCloud), so locally-newer edits aren't clobbered.
     */
    async pull(force = false) {
        if (this.pulledOnce && !force) return
        if (!navigator.onLine) return
        if (!window.electronAPI?.db?.upsertFromCloud) return

        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) return

        const sync = useSyncStore.getState()
        sync.setSyncing(true)

        try {
            for (const table of SYNC_ORDER) {
                if (this.aborted) return

                let restored = 0
                const PAGE = 1000
                let from = 0

                // Page through every cloud row for this user (Supabase caps at 1000/req)
                while (true) {
                    const { data, error } = await (supabase.from(table) as any)
                        .select('*')
                        .eq('user_id', user.id)
                        .order(PULL_ORDER_COLUMN[table] ?? 'updated_at', { ascending: true })
                        .range(from, from + PAGE - 1)

                    if (error) {
                        console.error(`[Sync] Pull failed for ${table}:`, error.message)
                        break
                    }
                    if (!data?.length) break

                    restored += await window.electronAPI.db.upsertFromCloud(table, data)

                    if (data.length < PAGE) break
                    from += PAGE
                }

                if (restored > 0) {
                    console.log(`[Sync] Restored ${restored} ${table} row(s) from cloud`)
                }
            }

            this.pulledOnce = true
            useSyncStore.getState().setLastSync(Date.now())

            // Refresh in-memory stores so restored cloud data shows up immediately
            try {
                const [{ useWorkspaceStore }, { useListStore }, { useTaskStore }] = await Promise.all([
                    import('@/store/workspaceStore'),
                    import('@/store/listStore'),
                    import('@/store/taskStore'),
                ])
                await useWorkspaceStore.getState().loadWorkspaces().catch(() => { })
                await useListStore.getState().fetchLists().catch(() => { })
                await useTaskStore.getState().fetchTasks().catch(() => { })
            } catch (e) {
                console.warn('[Sync] Post-pull store refresh failed:', e)
            }
        } catch (err: any) {
            console.error('[Sync] Pull error:', err)
            useSyncStore.getState().setError(err?.message ?? 'Cloud restore failed')
        } finally {
            useSyncStore.getState().setSyncing(false)
        }
    }

    /* ================= TRIGGER ================= */

    trigger() {
        this.syncPendings()
    }

    /**
     * Clear the in-memory rejected set and force a fresh push. Call after fixing
     * server-side RLS policies to re-attempt parked rows without an app restart.
     */
    retryRejected() {
        const n = this.rejected.size
        this.rejected.clear()
        if (n) console.log(`[Sync] Retrying ${n} previously rejected row(s)`)
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
        const sync = useSyncStore.getState()
        sync.setSyncing(true)

        // Count total pending across all tables
        if (window.electronAPI?.db) {
            let total = 0
            for (const table of SYNC_ORDER) {
                const rows = await window.electronAPI.db.getPending(table).catch(() => [])
                total += rows?.length ?? 0
            }
            sync.setPending(total)
        }

        try {
            for (const table of SYNC_ORDER) {
                // Abort mid-loop if user signed out
                if (this.aborted) break
                await this.syncTable(table, user.id)
            }
            useSyncStore.getState().setLastSync(Date.now())
            useSyncStore.getState().setPending(0)
        } catch (err: any) {
            useSyncStore.getState().setError(err?.message ?? 'Sync failed')
        } finally {
            this.syncing = false
            useSyncStore.getState().setSyncing(false)
        }
    }

    /* ================= PER TABLE ================= */

    private async syncTable(table: SyncTable, userId: string) {

        if (!window.electronAPI?.db) return

        const BATCH_SIZE = 100

        // Loop until the table is fully drained — avoids the old silent LIMIT 50 ceiling
        while (true) {
            if (this.aborted) return

            const allPendings = await window.electronAPI.db.getPending(table, BATCH_SIZE)
            if (!allPendings?.length) break

            // Skip rows the server already rejected this session. If every row in
            // the batch is rejected, we'd otherwise spin forever (getPending keeps
            // returning them since they're never marked synced) — so break out.
            const pendings = allPendings.filter((r: any) => !this.rejected.has(`${table}:${r.id}`))
            if (!pendings.length) break

            for (const row of pendings) {

            let payload: any = null

            try {

                /* ---------- FK guard ---------- */

                if (table === 'focus_sessions' && row.task_id) {

                    const exists = await window.electronAPI.db.taskExists(row.task_id)

                    if (!exists) {

                        // Parent task is gone locally (hard-deleted). Don't DROP the
                        // session — that permanently loses focus-time history. Null
                        // the FK and still push so the time survives in cloud reports,
                        // mirroring how lists/tasks degrade on a missing parent.
                        console.warn('[Sync] Orphan focus session, syncing without task_id:', row.id)
                        row.task_id = null
                    }
                }

                /* ---------- Build payload ---------- */

                // Ownership rule:
                //  - workspaces: ALWAYS the current user. Only an owner ever pushes
                //    a workspace row (members can't edit it; shared workspaces arrive
                //    via pull as synced=1 and are never pushed). Forcing the current
                //    uid also reclaims rows whose local user_id is stale from a prior
                //    session — otherwise the INSERT RLS check (auth.uid()=user_id)
                //    rejects the owner's own workspace (42501).
                //  - content tables (lists/tasks/subtasks/focus_sessions): preserve
                //    the row's owner so collaborative edits sync back to that owner
                //    rather than being re-homed to the editor.
                const ownerId = table === 'workspaces'
                    ? userId
                    : (row.user_id || userId)
                payload =
                    await this.buildPayload(table, { ...row, user_id: ownerId })

                if (!payload) {
                    await window.electronAPI.db.markSynced(table, row.id)
                    continue
                }

                // Log workspace uploads for easier debugging
                if (table === 'workspaces') {
                    console.log(`[Sync] Pushing workspace ${row.id} (${row.name}) to Supabase...`)
                }


                /* ---------- Push to Supabase ---------- */

                if (this.aborted) break

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
                        const wsRows = await window.electronAPI.db.getWorkspaceForList(payload.workspace_id).catch(() => [])

                        if (wsRows?.length) {
                            console.warn(`[Sync] Workspace ${payload.workspace_id} not yet in Supabase. Re-queuing workspace & will retry list next cycle.`)
                            await window.electronAPI.db.requeueWorkspace(payload.workspace_id).catch(() => { })
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
                    } else if (table === 'focus_sessions' && payload.task_id) {
                        // Parent task not in cloud yet. Push without the FK so the
                        // focus time is never lost; the task_id will reconcile on a
                        // later full sync once the task lands.
                        console.warn(`[Sync] Task missing in cloud for focus session ${row.id}. Retrying without task_id...`)
                        payload.task_id = null
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
                    // Park it in-memory (NOT marked synced) so it stops retrying
                    // this session but is re-attempted next launch — e.g. after an
                    // RLS policy fix — instead of being permanently dropped.
                    console.warn(`[Sync] Parking rejected row; will retry next session`)
                    this.rejected.add(`${table}:${row.id}`)
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
        } // end while
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
                    assigned_to: row.assigned_to ?? null,
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
                return 'active';
            case 'paused':
            case 'in_review':
                return 'paused';
            case 'done':
            case 'completed':
                return 'done';
            case 'planned':
                return 'planned';
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
