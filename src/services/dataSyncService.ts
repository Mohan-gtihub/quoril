// dataSyncService.ts

import { supabase } from './supabase'
import { useSyncStore } from '@/store/syncStore'
import { logger } from './logger'

const SYNC_INTERVAL = 10000

/* FK-safe order — workspaces must come before lists */
const SYNC_ORDER = [
    'workspaces',
    'lists',
    'tasks',
    'subtasks',
    'focus_sessions',
    // Whiteboard data. canvases before blocks: blocks.canvas_id FK → canvases.id
    'canvases',
    'blocks',
] as const

type SyncTable = typeof SYNC_ORDER[number]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* Local SQLite stores JSON columns (viewport_json, content_json, …) as TEXT, but
   the cloud columns are JSONB. Parse before pushing so Supabase gets real JSON. */
function parseJson<T>(value: any, fallback: T): T {
    if (value == null) return fallback
    if (typeof value === 'object') return value as T
    try { return JSON.parse(value) as T } catch { return fallback }
}

/* Pagination order column per table. Most tables have updated_at, but
   focus_sessions does not in the cloud schema — ordering it by updated_at makes
   the whole pull fail with "column does not exist". Fall back to created_at. */
const PULL_ORDER_COLUMN: Partial<Record<SyncTable, string>> = {
    focus_sessions: 'created_at',
}

export class DataSyncService {

    private syncing = false
    private pulling = false
    private timer: number | null = null
    private schemaCacheWarned = false
    private lastCacheErrorTime = 0
    private cacheRecoveryAttempts = 0
    private aborted = false
    private lastPendingCount: number | null = null

    // Rows the server rejected this session (RLS/check violation). Tracked in
    // memory — NOT marked synced — so we stop retrying them this session (no
    // log spam, no infinite loop) but retry automatically next app launch, e.g.
    // after the user fixes their RLS policy. Keyed `${table}:${id}`.
    private rejected = new Set<string>()

    /* ================= START / STOP ================= */

    private pulledOnce = false

    private readonly handleOnline = () => {
        if (this.aborted) return

        // A reconnect needs both directions: pull remote changes that happened
        // while offline, then drain the durable local SQLite queue immediately.
        void this.pull(true)
            .catch(err => logger.error('sync.reconnect_pull_failed', { name: err?.name, code: err?.code }))
            .finally(() => this.syncPendings())
    }

    start() {
        if (this.timer) return
        this.aborted = false
        // Fresh session (or re-login): give previously rejected rows another go.
        this.rejected.clear()
        logger.info('sync.started', { intervalSeconds: SYNC_INTERVAL / 1000 })

        this.timer = window.setInterval(
            () => this.syncPendings(),
            SYNC_INTERVAL
        )
        window.addEventListener('online', this.handleOnline)

        // First: restore the user's past cloud data DOWN into local SQLite,
        // then run the normal push loop. pull() guards itself to run once per session.
        this.pull()
            .catch(err => logger.error('sync.initial_pull_failed', { name: err?.name, code: err?.code }))
            .finally(() => this.syncPendings())
    }

    stop() {
        this.aborted = true
        this.pulledOnce = false
        this.lastPendingCount = null
        window.removeEventListener('online', this.handleOnline)
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }
        logger.info('sync.stopped')
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
        if (this.pulling || (this.pulledOnce && !force)) return
        if (!navigator.onLine) return
        if (!window.electronAPI?.db?.upsertFromCloud) return

        this.pulling = true

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            if (!user) return

            const sync = useSyncStore.getState()
            sync.setSyncing(true)

            for (const table of SYNC_ORDER) {
                if (this.aborted) return

                let restored = 0
                const PAGE = 1000
                let from = 0

                // Page through every cloud row for this user (Supabase caps at 1000/req)
                let hasMore = true
                while (hasMore) {
                    // Canvas ownership stays with the creator even when an editor
                    // saves a shared scene. For canvases/blocks, rely on RLS to
                    // return every row this user can access instead of filtering
                    // out shared rows by their owner's user_id.
                    let query = (supabase.from(table) as any).select('*')
                    if (table !== 'canvases' && table !== 'blocks') {
                        query = query.eq('user_id', user.id)
                    }
                    const { data, error } = await query
                        .order(PULL_ORDER_COLUMN[table] ?? 'updated_at', { ascending: true })
                        .range(from, from + PAGE - 1)

                    if (error) {
                        logger.error('sync.pull_table_failed', { table, code: error.code })
                        hasMore = false
                        continue
                    }
                    if (!data?.length) {
                        hasMore = false
                        continue
                    }

                    restored += await window.electronAPI.db.upsertFromCloud(table, data)

                    if (data.length < PAGE) {
                        hasMore = false
                    } else {
                        from += PAGE
                    }
                }

                if (restored > 0) {
                    logger.info('sync.pull_table_completed', { table, restored })
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
                logger.warn('sync.post_pull_refresh_failed', { name: e instanceof Error ? e.name : undefined })
            }
        } catch (err: any) {
            logger.error('sync.pull_failed', { code: err?.code, name: err?.name })
            useSyncStore.getState().setError(err?.message ?? 'Cloud restore failed')
        } finally {
            this.pulling = false
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
        if (n) logger.info('sync.rejected_rows_retrying', { count: n })
        this.syncPendings()
    }

    /* ================= MAIN LOOP ================= */

    private async syncPendings() {
        if (this.syncing || this.pulling || !navigator.onLine) return

        // Check Auth First
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user

        if (!user) return

        this.syncing = true
        const sync = useSyncStore.getState()
        sync.setSyncing(true)

        sync.setPending(await this.countPending())

        try {
            let syncedRows = 0
            for (const table of SYNC_ORDER) {
                // Abort mid-loop if user signed out
                if (this.aborted) break
                syncedRows += await this.syncTable(table, user.id)
            }
            const pending = await this.countPending()
            sync.setPending(pending)
            if (pending === 0) {
                sync.setLastSync(Date.now())
                if (syncedRows > 0) logger.info('sync.completed', { syncedRows })
            } else {
                sync.setError(`${pending} change${pending === 1 ? '' : 's'} pending sync`)
                if (pending !== this.lastPendingCount) {
                    logger.warn('sync.pending_changes', { pending, rejected: this.rejected.size })
                }
            }
            this.lastPendingCount = pending
        } catch (err: any) {
            useSyncStore.getState().setError(err?.message ?? 'Sync failed')
            logger.error('sync.failed', { code: err?.code, name: err?.name })
        } finally {
            this.syncing = false
            useSyncStore.getState().setSyncing(false)
        }
    }

    private async countPending() {
        if (!window.electronAPI?.db?.countPending) return 0

        const counts = await Promise.all(
            SYNC_ORDER.map((table) => window.electronAPI.db.countPending(table).catch(() => 0))
        )
        return counts.reduce((total, count) => total + count, 0)
    }

    /* ================= PER TABLE ================= */

    private async syncTable(table: SyncTable, userId: string): Promise<number> {

        if (!window.electronAPI?.db) return 0

        const BATCH_SIZE = 100
        let syncedRows = 0

        // Loop until the table is fully drained — avoids the old silent LIMIT 50 ceiling
        let hasMore = true
        while (hasMore) {
            if (this.aborted) return syncedRows

            const allPendings = await window.electronAPI.db.getPending(table, BATCH_SIZE)
            if (!allPendings?.length) {
                hasMore = false
                continue
            }

            // Skip rows the server already rejected this session. If every row in
            // the batch is rejected, we'd otherwise spin forever (getPending keeps
            // returning them since they're never marked synced) — so break out.
            const pendings = allPendings.filter((r: any) => !this.rejected.has(`${table}:${r.id}`))
            if (!pendings.length) {
                hasMore = false
                continue
            }

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
                        logger.warn('sync.orphan_focus_session', { table })
                        row.task_id = null
                    }
                }

                /* ---------- Shared owner-only-row guard ---------- */

                // A workspace OR canvas whose local row already carries a real owner
                // that ISN'T the current user is SHARED (we're a member, not the
                // owner). We must never push these owner-only metadata rows: the
                // cloud row is owned by someone else, so the upsert becomes an UPDATE
                // that RLS rejects with 403 (42501) — which previously logged an
                // error and retried forever. Mark synced so it's left alone. Members
                // still push the canvas *content* (the scene `blocks` row), which
                // RLS permits via canvas_is_accessible(); that falls through below.
                if (
                    (table === 'workspaces' || table === 'canvases') &&
                    row.user_id &&
                    row.user_id !== userId
                ) {
                    await window.electronAPI.db.markSynced(table, row.id)
                    syncedRows += 1
                    continue
                }

                /* ---------- Build payload ---------- */

                // Ownership rule:
                //  - workspaces: ALWAYS the current user. Only an owner ever pushes
                //    a workspace row (members can't edit it; shared workspaces are
                //    skipped above and arrive via pull as synced=1). Forcing the
                //    current uid also reclaims rows whose local user_id is empty/stale
                //    from a prior session — otherwise the INSERT RLS check
                //    (auth.uid()=user_id) rejects the owner's own workspace (42501).
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
                    syncedRows += 1
                    continue
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
                syncedRows += 1

                // Detect successful recovery from cache errors
                if (this.cacheRecoveryAttempts > 0 && !this.schemaCacheWarned) {
                    logger.info('sync.schema_cache_recovered', { attempts: this.cacheRecoveryAttempts })
                    this.cacheRecoveryAttempts = 0
                }

            } catch (error: any) {
                let syncError = error

                /* Schema Cache Error - Supabase needs manual refresh */
                if (syncError?.code === 'PGRST204') {
                    this.lastCacheErrorTime = Date.now()

                    if (!this.schemaCacheWarned) {
                        this.schemaCacheWarned = true
                        logger.warn('sync.schema_cache_stale', { code: syncError.code })
                    }

                    // Try full schema recovery every 2 minutes
                    const timeSinceError = Date.now() - this.lastCacheErrorTime
                    if (timeSinceError > 120000) { // 2 minutes
                        this.cacheRecoveryAttempts++
                        logger.info('sync.schema_cache_recovery_attempt', { attempt: this.cacheRecoveryAttempts })
                        this.schemaCacheWarned = false // Re-enable full fields for next sync
                        this.lastCacheErrorTime = Date.now()
                    }

                    // Don't mark as synced, will retry later
                    continue
                }

                /* Handle Foreign Key Violations gracefully */
                if (syncError?.code === '23503') {
                    if (table === 'lists' && payload.workspace_id) {
                        const wsRows = await window.electronAPI.db.getWorkspaceForList(payload.workspace_id).catch(() => [])

                        if (wsRows?.length) {
                            logger.warn('sync.workspace_parent_pending', { table })
                            await window.electronAPI.db.requeueWorkspace(payload.workspace_id).catch(() => { })
                            // Also force a fresh sync pass after a short delay
                            setTimeout(() => this.syncPendings(), 3000)
                        } else {
                            // Workspace does NOT exist locally (deleted or orphaned).
                            // Sync the list without workspace_id to avoid infinite loop.
                            logger.warn('sync.workspace_parent_missing', { table })
                            delete payload.workspace_id
                            const { error: retryErr } = await (supabase.from(table) as any)
                                .upsert(payload, { onConflict: 'id' })
                            if (!retryErr) {
                                await window.electronAPI.db.markSynced(table, row.id)
                                syncedRows += 1
                            }
                        }
                        continue
                    } else if (table === 'tasks' && payload.list_id) {
                        logger.warn('sync.list_parent_missing', { table })
                        payload.list_id = null
                        const { error: retryErr } = await (supabase.from(table) as any)
                            .upsert(payload, { onConflict: 'id' })

                        if (!retryErr) {
                            await window.electronAPI.db.markSynced(table, row.id)
                            syncedRows += 1
                            continue
                        } else {
                            syncError = retryErr
                        }
                    } else if (table === 'focus_sessions' && payload.task_id) {
                        // Parent task not in cloud yet. Push without the FK so the
                        // focus time is never lost; the task_id will reconcile on a
                        // later full sync once the task lands.
                        logger.warn('sync.task_parent_missing', { table })
                        payload.task_id = null
                        const { error: retryErr } = await (supabase.from(table) as any)
                            .upsert(payload, { onConflict: 'id' })

                        if (!retryErr) {
                            await window.electronAPI.db.markSynced(table, row.id)
                            syncedRows += 1
                            continue
                        } else {
                            syncError = retryErr
                        }
                    }
                }

                /* Prevent infinite retry on truly unrecoverable rows */
                if (
                    syncError?.code === '23514' ||
                    syncError?.code === '42501' || // RLS Policy Violation (Permission/Auth)
                    String(syncError).includes('violates check') ||
                    String(syncError).includes('policy')
                ) {
                    logger.error('sync.row_rejected', {
                        table,
                        code: syncError?.code,
                        // Deliberately omit row IDs and payloads: they can include
                        // task names, descriptions, and user-owned canvas content.
                    })
                    // Park it in-memory (NOT marked synced) so it stops retrying
                    // this session but is re-attempted next launch — e.g. after an
                    // RLS policy fix — instead of being permanently dropped.
                    logger.warn('sync.row_parked', { table })
                    this.rejected.add(`${table}:${row.id}`)
                } else {
                    // Log unexpected errors for debugging
                    logger.error('sync.row_failed', {
                        table,
                        code: syncError?.code,
                    })
                }
            }
        }
        } // end while
        return syncedRows
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

            /* ---------- CANVASES (whiteboards) ---------- */
            case 'canvases':
                // Cloud ids are UUID; skip any legacy/non-UUID rows (marked synced so
                // they stop retrying) rather than letting Supabase reject them forever.
                if (!UUID_RE.test(row.id)) return null
                return {
                    id: row.id,
                    user_id: row.user_id,
                    workspace_id: row.workspace_id ?? null,
                    title: row.title ?? 'Untitled',
                    icon: row.icon ?? null,
                    color: row.color ?? null,
                    // Local stores these as TEXT JSON; cloud columns are JSONB → parse.
                    viewport_json: parseJson(row.viewport_json, { x: 0, y: 0, zoom: 1 }),
                    home_viewport_json: parseJson(row.home_viewport_json, null),
                    settings_json: parseJson(row.settings_json, { grid: true, snap: false, autoZoneHints: false }),
                    schema_version: row.schema_version ?? 1,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    deleted_at: row.deleted_at,
                }

            /* ---------- BLOCKS (Excalidraw scene per canvas) ---------- */
            case 'blocks':
                // Skip legacy non-UUID ids (e.g. the old "<canvasId>:scene" rows).
                if (!UUID_RE.test(row.id) || !UUID_RE.test(row.canvas_id)) return null
                return {
                    id: row.id,
                    canvas_id: row.canvas_id,
                    user_id: row.user_id,
                    kind: row.kind,
                    x: row.x ?? 0, y: row.y ?? 0, w: row.w ?? 0, h: row.h ?? 0,
                    z: row.z ?? 0,
                    rotation: row.rotation ?? 0,
                    content_json: parseJson(row.content_json, {}),
                    style_json: parseJson(row.style_json, null),
                    tags_json: parseJson(row.tags_json, null),
                    linked_task_id: row.linked_task_id ?? null,
                    is_landmark: Boolean(row.is_landmark),
                    last_touched_at: row.last_touched_at ?? null,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    deleted_at: row.deleted_at,
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
