// dataSyncService.ts

import { supabase } from './supabase'

const SYNC_INTERVAL = 10000

/* FK-safe order */
const SYNC_ORDER = [
    'lists',
    'tasks',
    'subtasks',
    'focus_sessions',
] as const

type SyncTable = typeof SYNC_ORDER[number]

class DataSyncService {

    private syncing = false
    private timer: number | null = null

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

    /* ================= MAIN LOOP ================= */

    private async syncPendings() {
        if (this.syncing || !navigator.onLine) return

        this.syncing = true

        try {
            for (const table of SYNC_ORDER) {
                await this.syncTable(table)
            }
        } finally {
            this.syncing = false
        }
    }

    /* ================= PER TABLE ================= */

    private async syncTable(table: SyncTable) {

        if (!window.electronAPI?.db) return

        const pendings =
            await window.electronAPI.db.getPending(table)

        if (!pendings?.length) return


        for (const row of pendings) {

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

                const payload =
                    await this.buildPayload(table, row)

                if (!payload) {
                    await window.electronAPI.db.markSynced(table, row.id)
                    continue
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

            } catch (err: any) {

                console.error(`[Sync] ${table} ${row.id} failed`, err)

                /* Prevent infinite retry on bad rows */
                if (
                    err?.code === '23514' ||
                    String(err).includes('violates') ||
                    String(err).includes('constraint')
                ) {
                    console.warn('[Sync] Marking bad row as synced:', row.id)

                    await window.electronAPI.db.markSynced(
                        table,
                        row.id
                    )
                }
            }
        }
    }

    /* ================= PAYLOAD BUILDER ================= */

    private async buildPayload(table: SyncTable, row: any) {

        switch (table) {

            /* ---------- LISTS ---------- */

            case 'lists':
                return {
                    id: row.id,
                    user_id: row.user_id,
                    name: row.name,
                    color: row.color,
                    icon: row.icon,
                    sort_order: row.sort_order || 0,
                    is_system: Boolean(row.is_system),
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    deleted_at: row.deleted_at
                }

            /* ---------- TASKS ---------- */

            case 'tasks': {

                const [dDate, dTime] = (row.due_at || 'T').split('T')

                const status = this.mapTaskStatus(row.status)
                const priority = this.mapTaskPriority(row.priority)

                return {
                    id: row.id,
                    user_id: row.user_id,
                    list_id: row.list_id,
                    title: row.title,
                    description: row.description,

                    status: ['todo', 'planned', 'active', 'paused', 'done'].includes(status)
                        ? status
                        : 'todo',

                    priority: ['critical', 'high', 'medium', 'low'].includes(priority)
                        ? priority
                        : 'medium',

                    estimated_minutes: row.estimate_m || 0,
                    actual_minutes: Math.round((row.spent_s || 0) / 60),

                    due_date: dDate || null,
                    due_time: dTime || null,

                    completed_at: row.completed_at,
                    parent_task_id: row.parent_id,

                    sort_order: row.sort_order || 0,

                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    deleted_at: row.deleted_at
                }
            }

            /* ---------- SUBTASKS ---------- */

            case 'subtasks':
                return {
                    id: row.id,
                    user_id: row.user_id,
                    task_id: row.task_id,
                    title: row.title,
                    is_completed: Boolean(row.done),
                    sort_order: row.sort_order || 0,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                }

            /* ---------- FOCUS ---------- */

            case 'focus_sessions': {

                let meta: any = {}

                try {
                    meta = JSON.parse(row.metadata || '{}')
                } catch { }

                return {
                    id: row.id,
                    user_id: row.user_id,
                    task_id: row.task_id,

                    started_at: row.start_time,
                    ended_at: row.end_time,

                    duration_minutes: Math.round((row.seconds || 0) / 60),

                    session_type: this.mapSessionType(row.type),

                    interruptions: meta.interruptions_count || 0,
                    notes: meta.notes,

                    created_at: row.created_at
                }
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
                return 'in_progress';

            case 'paused':
                return 'in_review';

            case 'done':
            case 'completed':
                return 'done';

            case 'planned':
                return 'todo';

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
