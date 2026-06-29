import { Task, Subtask, List } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabase'
import { dataSyncService } from './dataSyncService'

/* ---------------- HELPERS ---------------- */

const getUser = async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) {
        // Check if we can recover or just return null
        return null
    }
    return data.session.user
}

const db = () => (window as any).electronAPI?.db

/* ---------------- DELETED TOMBSTONES ----------------
 * A persistent, renderer-side set of task ids the user deleted. This is the
 * single source of truth for "the user does not want to see this task". It is
 * independent of the cloud and of the Electron main process, so a deleted task
 * can never reappear because:
 *   - the cloud copy is owned by another user and our soft-delete was rejected
 *     by RLS (shared/workspace tasks), or
 *   - a sync pull / mergeSharedFromCloud re-materialised the row, or
 *   - the desktop DB hasn't been rebuilt with the latest guards.
 * Restoring a task removes its tombstone. */
const DELETED_TASKS_KEY = 'quoril_deleted_task_ids'

const deletedTombstones = {
    all: (): Set<string> => {
        try {
            const raw = localStorage.getItem(DELETED_TASKS_KEY)
            return new Set(raw ? (JSON.parse(raw) as string[]) : [])
        } catch {
            return new Set()
        }
    },
    add: (id: string) => {
        try {
            const set = deletedTombstones.all()
            set.add(id)
            localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify([...set]))
        } catch { /* best-effort */ }
    },
    remove: (id: string) => {
        try {
            const set = deletedTombstones.all()
            if (set.delete(id)) {
                localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify([...set]))
            }
        } catch { /* best-effort */ }
    },
    filter: <T extends { id: string }>(rows: T[]): T[] => {
        const set = deletedTombstones.all()
        return set.size ? rows.filter(r => !set.has(r.id)) : rows
    },
}

/* ---------------- TASK MAP ---------------- */

const mapTask = (row: any): Task => {
    if (!row) return row

    const [date, time] = row.due_at
        ? row.due_at.split('T')
        : [null, null]

    const estimateMinutes = row.estimate_m || 0
    const focusSeconds = row.spent_s || 0
    const parentTaskId = row.parent_id ?? null

    return {
        ...row,
        // camelCase fields (canonical)
        estimateMinutes,
        focusSeconds,
        parentTaskId,
        // legacy snake_case aliases (@deprecated)
        actual_seconds: focusSeconds,
        estimated_minutes: estimateMinutes,
        parent_task_id: parentTaskId,
        // parsed due date/time
        due_date: date,
        due_time: time?.split('.')[0] || null,
        sync_status: row.synced ? 'synced' : 'pending',
        is_recurring: Boolean(row.is_recurring),
        last_reset_date: row.last_reset_date ?? null,
    }
}

const mergeSharedFromCloud = async (
    table: 'lists' | 'tasks' | 'subtasks',
    localRows: any[],
    userId: string,
    applyQuery?: (q: any) => any,
): Promise<any[]> => {
    if (!navigator.onLine) return localRows
    try {
        let query = (supabase.from(table) as any).select('*').is('deleted_at', null)
        if (applyQuery) query = applyQuery(query)

        const { data, error } = await query
        if (error || !data?.length) return localRows
        let shared = data.filter((r: any) => r.user_id !== userId)
        if (!shared.length) return localRows

        // Drop cloud rows the user already soft-deleted locally. The cloud copy is
        // owned by someone else, so our delete can't be pushed (RLS) and the row
        // still reads as un-deleted in the cloud — without this guard it would be
        // resurrected into the in-memory list on every fetch ("deleted task keeps
        // coming back"). The local tombstone is the source of truth for the user.
        try {
            const deletedIds: string[] = (await db()?.getLocallyDeletedIds?.(table)) || []
            if (deletedIds.length) {
                const tombstoned = new Set(deletedIds)
                shared = shared.filter((r: any) => !tombstoned.has(r.id))
            }
        } catch { /* best-effort; fall back to unfiltered */ }
        if (!shared.length) return localRows

        const byId = new Map<string, any>()
        for (const r of localRows) byId.set(r.id, r)
        const toMaterialize: any[] = []
        for (const r of shared) {
            if (!byId.has(r.id)) {
                byId.set(r.id, r)
                toMaterialize.push(r)
            }
        }

        // Persist shared rows into local SQLite so they are first-class locally:
        // taskExists() is true (no orphan focus sessions), db().updateTask() finds
        // them (pause/edit persist), and focus-session FKs resolve. Written with
        // synced=1 (via upsertFromCloud) so unedited shared rows aren't re-pushed;
        // user_id (original owner) is preserved so a later local edit syncs back to
        // the owner — enabling collaborative edits. Best-effort: a failure here just
        // falls back to the previous in-memory-only behaviour.
        if (toMaterialize.length) {
            try { await db()?.upsertFromCloud?.(table, toMaterialize) } catch { /* best-effort */ }
        }

        return [...byId.values()]
    } catch {
        return localRows
    }
}

/* ================= PRESTIGE SERVICE ================= */

export const localService = {

    auth: {
        getUser: async () => supabase.auth.getUser()
    },

    /* ================= TASKS ================= */

    tasks: {
        list: async (listId?: string) => {
            const user = await getUser()
            if (!user) return { data: [], error: 'No session' }

            if (!db()) {
                let query = supabase
                    .from('tasks')
                    .select('*')
                    .is('deleted_at', null)

                if (listId && listId !== 'all') {
                    query = query.eq('list_id', listId)
                }

                const { data, error } = await query.order('sort_order', { ascending: true })
                if (error) return { data: [], error: error.message }
                return { data: deletedTombstones.filter(data || []).map(mapTask), error: null }
            }

            const rows = await db().getTasks(user.id, listId)
            const merged = await mergeSharedFromCloud('tasks', rows, user.id,
                (q) => (listId && listId !== 'all') ? q.eq('list_id', listId) : q)
            return { data: deletedTombstones.filter(merged).map(mapTask), error: null }
        },

        create: async (task: Partial<Task>) => {
            const user = await getUser()
            if (!user) return { data: null, error: 'No user' }

            const now = new Date().toISOString()
            const row = {
                id: uuidv4(),
                user_id: user.id,
                list_id: task.list_id || null,
                title: task.title || '',
                description: task.description || null,
                status: task.status || 'todo',
                priority: task.priority || 'medium',
                estimate_m: task.estimated_minutes || 0,
                spent_s: task.actual_seconds || 0,
                started_at: null,
                due_at: task.due_date ? `${task.due_date}T${task.due_time || '00:00:00'}` : null,
                parent_id: task.parent_task_id || null,
                sort_order: task.sort_order || 0,
                created_at: now,
                updated_at: now,
                deleted_at: null,
                synced: 0,
                is_recurring: task.is_recurring ? 1 : 0,
                last_reset_date: task.last_reset_date || null
            }

            if (!db()) {
                row.synced = 1
                const { error } = await (supabase.from('tasks') as any).insert(row)
                if (error) return { data: null, error: error.message }
                return { data: mapTask(row), error: null }
            }

            await db().saveTask(row)
            dataSyncService.trigger()
            return { data: mapTask(row), error: null }
        },

        update: async (id: string, updates: any) => {
            // Keep the persistent delete-tombstone in sync: soft-delete adds it,
            // restore (deleted_at: null) clears it. This is what guarantees a
            // deleted task stays hidden regardless of cloud/RLS/sync outcome.
            if (updates.deleted_at !== undefined) {
                if (updates.deleted_at) deletedTombstones.add(id)
                else deletedTombstones.remove(id)
            }

            const row: any = { ...updates, updated_at: new Date().toISOString(), synced: 0 }

            if (updates.is_recurring !== undefined) {
                row.is_recurring = updates.is_recurring ? 1 : 0
            }
            if (updates.last_reset_date !== undefined) {
                row.last_reset_date = updates.last_reset_date
            }

            // Normalized Mapping
            if (updates.estimated_minutes !== undefined) row.estimate_m = updates.estimated_minutes
            if (updates.parent_task_id !== undefined) row.parent_id = updates.parent_task_id
            if (updates.actual_seconds !== undefined) row.spent_s = updates.actual_seconds

            delete row.actual_seconds
            delete row.estimated_minutes
            delete row.parent_task_id

            // Helper function to safely get existing due date/time
            const getExistingDueDateTime = async (taskId: string): Promise<{ due_date: string | null, due_time: string }> => {
                try {
                    const { data } = await supabase
                        .from('tasks')
                        .select('due_at')  // Only query the column that EXISTS
                        .eq('id', taskId)
                        .single<{ due_at: string | null }>()

                    // Parse due_at into due_date and due_time
                    const due_at = data?.due_at || null
                    let due_date: string | null = null
                    let due_time = '00:00:00'

                    if (due_at) {
                        const [date, time] = due_at.split('T')
                        due_date = date
                        due_time = time?.split('.')[0] || '00:00:00'
                    }

                    return {
                        due_date,
                        due_time
                    }
                } catch (error) {
                    console.warn('[localStorage] Failed to fetch existing due date/time for task', taskId, error)
                    return {
                        due_date: null,
                        due_time: '00:00:00'
                    }
                }
            }
            const needsDueUpdate = updates.due_date !== undefined || updates.due_time !== undefined
            if (needsDueUpdate) {
                const existing = await getExistingDueDateTime(id)
                const newDueDate = updates.due_date !== undefined ? updates.due_date : existing.due_date
                const newDueTime = updates.due_time !== undefined ? updates.due_time : existing.due_time
                row.due_at = newDueDate ? `${newDueDate}T${newDueTime || '00:00:00'}` : null
            } else if (updates.due_at === undefined) {
                delete row.due_at
            }

            if (!db()) {
                row.synced = 1
                const { data, error } = await (supabase.from('tasks') as any).update(row).eq('id', id).select().single()
                if (error) return { data: null, error: error.message }
                return { data: mapTask(data), error: null }
            }

            // Desktop: tasks the current user owns live in local SQLite; tasks
            // shared via a workspace live only in the cloud (see mergeSharedFromCloud).
            // If the row isn't ours locally, write straight to Supabase so a member's
            // edit/assignment to a teammate's task actually persists (RLS authorizes it)
            // instead of silently no-op'ing against an absent local row.
            const ownsLocally = await db().taskExists(id).catch(() => false)
            if (!ownsLocally) {
                // Soft-deleting a task we don't own locally (e.g. a workspace task
                // shared by another user) can't be pushed — RLS rejects updating the
                // owner's row. Write a local tombstone first so mergeSharedFromCloud's
                // getLocallyDeletedIds guard stops the row from being resurrected on
                // the next fetch ("deleted task keeps coming back").
                if (row.deleted_at) {
                    try {
                        await db().upsertFromCloud('tasks', [{ id, deleted_at: row.deleted_at, updated_at: row.updated_at }])
                    } catch { /* best-effort */ }
                }
                const { data, error } = await (supabase.from('tasks') as any)
                    .update(row).eq('id', id).select().single()
                if (error) return { data: null, error: error.message }
                return { data: mapTask(data), error: null }
            }

            const fresh = await db().updateTask(id, row)
            dataSyncService.trigger()
            return { data: mapTask(Array.isArray(fresh) ? fresh[0] : fresh), error: null }
        },

        delete: async (id: string) => {
            deletedTombstones.add(id)
            if (!db()) {
                const { error } = await (supabase.from('tasks') as any)
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('id', id)
                return { error: error?.message || null }
            }

            await db().deleteTask(id)
            dataSyncService.trigger()
            return { error: null }
        },

        permanentDelete: async (id: string) => {
            deletedTombstones.add(id)
            if (!db()) {
                const { error } = await (supabase.from('tasks') as any).delete().eq('id', id)
                return { error: error?.message || null }
            }
            await db().hardDeleteTask(id)
            dataSyncService.trigger()
            return { error: null }
        },

        start: async (id: string) => {
            // Web (Supabase-only) path: stamp started_at so live-time calculations
            // and crash recovery work the same as on the desktop DB path (L4).
            if (!db()) {
                const { data, error } = await (supabase.from('tasks') as any)
                    .update({ started_at: new Date().toISOString(), status: 'active' })
                    .eq('id', id)
                    .select()
                    .single()
                if (error) return { data: null, error: error.message }
                return { data: mapTask(data), error: null }
            }
            return db().startTask(id)
        },

        pause: async (id: string) => {
            if (!db()) {
                const { data, error } = await (supabase.from('tasks') as any)
                    .update({ started_at: null, status: 'paused' })
                    .eq('id', id)
                    .select()
                    .single()
                if (error) return { data: null, error: error.message }
                return { data: mapTask(data), error: null }
            }
            return db().pauseTask(id)
        },

        reorder: async (items: { id: string; sort_order: number }[]) => {
            if (!db()) {
                // Parallel update for speed to prevent UI reverting
                await Promise.all(items.map(item =>
                    (supabase.from('tasks') as any).update({ sort_order: item.sort_order }).eq('id', item.id)
                ))
                return
            }

            for (const item of items) {
                await db().updateTaskSortOrder(item.id, item.sort_order)
            }
            dataSyncService.trigger()
        },

        // Helper for Permanent Delete List
        deleteByListId: async (listId: string) => {
            if (!db()) {
                const { error } = await (supabase.from('tasks') as any).delete().eq('list_id', listId)
                return { error: error?.message || null }
            }
            await db().softDeleteTasksByListId(listId)
            dataSyncService.trigger()
            return { error: null }
        },

        resetAllTimes: async () => {
            const user = await getUser()
            if (!user) return { error: 'No user' }

            if (!db()) {
                const { error } = await (supabase.from('tasks') as any)
                    .update({ spent_s: 0, synced: 0 })
                    .eq('user_id', user.id)
                return { error: error?.message || null }
            }

            await db().resetAllTaskTimes(user.id)
            dataSyncService.trigger()
            return { error: null }
        }
    },

    /* ================= LISTS ================= */

    lists: {
        list: async (archived: boolean = false) => {
            const user = await getUser()
            if (!user) return { data: [], error: 'No session' }

            if (!db()) {
                const { data, error } = await supabase
                    .from('lists')
                    .select('*')
                    .is('deleted_at', null)
                    .order('sort_order')

                if (error) return { data: [], error: error.message }

                // Filter archived
                const filtered = (data || []).filter((l: any) => archived ? !!l.archived_at : !l.archived_at)
                return { data: filtered, error: null }
            }

            const rows = await db().getLists(user.id, archived)
            const merged = await mergeSharedFromCloud('lists', rows, user.id)
            const filtered = merged.filter((l: any) => archived ? !!l.archived_at : !l.archived_at)
            return { data: filtered, error: null }
        },

        create: async (list: any) => {
            const user = await getUser()
            if (!user) return { data: null, error: 'No User' }

            const data = {
                id: uuidv4(),
                user_id: user.id,
                workspace_id: list.workspace_id || null,
                name: list.name || 'Untitled',
                color: list.color || '#3b82f6',
                icon: list.icon || 'list',
                sort_order: list.sort_order || 0,
                is_system: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                archived_at: null,
                deleted_at: null,
                synced: 0
            }

            if (!db()) {
                data.synced = 1
                const { error } = await (supabase.from('lists') as any).insert(data)
                if (error) return { data: null, error: error.message }
                return { data: data as List, error: null }
            }

            await db().saveList(data)
            dataSyncService.trigger()
            return { data: data as List, error: null }
        },

        update: async (id: string, updates: any) => {
            const data = { ...updates, updated_at: new Date().toISOString(), synced: 0 }

            if (!db()) {
                data.synced = 1
                const { error } = await (supabase.from('lists') as any).update(data).eq('id', id)
                if (error) return { error: error.message }
                return { data: { ...updates, id }, error: null }
            }

            await db().updateList(id, data)
            dataSyncService.trigger()
            return { data: { ...updates, id }, error: null }
        },

        delete: async (id: string) => {
            if (!db()) {
                await (supabase.from('lists') as any).update({ deleted_at: new Date().toISOString() }).eq('id', id)
                return { error: null }
            }
            await db().deleteList(id)
            dataSyncService.trigger()
            return { error: null }
        },

        permanentDelete: async (id: string) => {
            if (!db()) {
                const { error } = await (supabase.from('lists') as any).delete().eq('id', id)
                return { error: error?.message || null }
            }
            await db().hardDeleteList(id)
            dataSyncService.trigger()
            return { error: null }
        },

        archive: async (id: string) => {
            if (!db()) {
                await (supabase.from('lists') as any).update({ archived_at: new Date().toISOString() }).eq('id', id)
                return { error: null }
            }
            await db().archiveList(id)
            return { error: null }
        },

        restore: async (id: string) => {
            if (!db()) {
                await (supabase.from('lists') as any).update({ archived_at: null }).eq('id', id)
                return { error: null }
            }
            await db().restoreList(id)
            return { error: null }
        }
    },

    /* ================= SUBTASKS ================= */

    subtasks: {
        list: async (taskId: string) => {
            const user = await getUser()
            if (!user) return { data: [], error: 'No session' }

            if (!db()) {
                const { data, error } = await supabase
                    .from('subtasks')
                    .select('*')
                    .eq('task_id', taskId)
                    .is('deleted_at', null)
                    .order('sort_order', { ascending: true })

                if (error) return { data: [], error: error.message }
                return { data: (data || []).map((r: any) => ({ ...r, completed: !!r.done })), error: null }
            }

            const rows = await db().getSubtasks(taskId)
            const merged = await mergeSharedFromCloud('subtasks', rows, user.id,
                (q) => q.eq('task_id', taskId))
            return { data: merged.map((r: any) => ({ ...r, completed: !!r.done })), error: null }
        },

        create: async (sub: Partial<Subtask>) => {
            const user = await getUser()
            if (!user || !sub.task_id) return { data: null, error: 'Invalid Task' }

            const now = new Date().toISOString()
            const row = {
                id: uuidv4(),
                task_id: sub.task_id,
                user_id: user.id,
                title: sub.title || '',
                done: sub.completed ? 1 : 0,
                sort_order: sub.sort_order || 0,
                created_at: now,
                updated_at: now,
                deleted_at: null,
                synced: 0
            }

            if (!db()) {
                row.synced = 1
                // Check if 'done' is compatible with Supabase boolean? 
                // types/database.ts says subtasks.done is boolean.
                // But row.done is number (0/1) here for sqlite?
                // Wait, types/database.ts says: `done: boolean` for Row, but Insert `done?: boolean`.
                // localService originally matched sqlite (1/0).
                // If writing to Supabase, we should likely send boolean if schema is boolean, or 1/0 if integer.
                // type Subtask = Row & { completed?: boolean }
                // DB Row says: `done: boolean`.
                // So row.done MUST be boolean for Supabase.
                // But original code: `done: sub.completed ? 1 : 0` suggests SQLite is using integer.
                // So I need to cast for Supabase.

                const supabaseRow = { ...row, done: !!row.done }
                const { error } = await (supabase.from('subtasks') as any).insert(supabaseRow)
                if (error) return { data: null, error: error.message }
                return { data: { ...row, completed: !!row.done }, error: null }
            }

            await db().saveSubtask(row)
            dataSyncService.trigger()
            return { data: { ...row, completed: !!row.done }, error: null }
        },

        update: async (id: string, updates: any) => {
            const row: any = { ...updates, updated_at: new Date().toISOString(), synced: 0 }

            if (updates.completed !== undefined) {
                row.done = updates.completed ? 1 : 0
                delete row.completed
            }

            if (!db()) {
                row.synced = 1
                if (row.done !== undefined) row.done = !!row.done
                const { error } = await (supabase.from('subtasks') as any).update(row).eq('id', id)
                if (error) return { data: null, error: error.message }
                return { data: { ...updates, id }, error: null }
            }

            await db().updateSubtask(id, row)
            dataSyncService.trigger()
            return { data: { ...updates, id }, error: null }
        },

        delete: async (id: string) => {
            if (!db()) {
                await (supabase.from('subtasks') as any).update({ deleted_at: new Date().toISOString() }).eq('id', id)
                return { error: null }
            }
            await db().softDeleteSubtask(id)
            dataSyncService.trigger()
            return { error: null }
        }
    },

    /* ================= FOCUS ================= */

    focus: {
        list: async () => {
            const user = await getUser()
            if (!user) return { data: [], error: 'No session' }

            if (!db()) {
                const { data, error } = await supabase
                    .from('focus_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })

                if (error) return { data: [], error: error.message }
                return { data: (data || []).map((r: any) => ({ ...r, ...(r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : {}) })), error: null }
            }

            const rows = await db().getSessions(user.id)
            return { data: rows.map((r: any) => ({ ...r, ...(r.metadata ? JSON.parse(r.metadata) : {}) })), error: null }
        },

        create: async (session: any) => {
            const user = await getUser()
            if (!user) return { data: null, error: 'No user' }

            const id = uuidv4()
            const row = {
                id,
                user_id: user.id,
                task_id: session.task_id,
                type: session.session_type || 'focus',
                // Callers pass `seconds` directly; keep `actual_seconds` as a legacy alias.
                seconds: session.seconds ?? session.actual_seconds ?? 0,
                start_time: session.start_time,
                end_time: session.end_time,
                metadata: JSON.stringify({
                    notes: session.notes,
                    focus_score: session.focus_score,
                    energy_level: session.energy_level
                }),
                created_at: new Date().toISOString(),
                synced: 0
            }

            if (!db()) {
                row.synced = 1
                const { error } = await (supabase.from('focus_sessions') as any).insert(row)
                if (error) return { data: null, error: error.message }
                return { data: { ...session, id }, error: null }
            }

            await db().saveSession(row)
            dataSyncService.trigger()
            return { data: { ...session, id }, error: null }
        },

        update: async (id: string, updates: any) => {
            const row: any = { ...updates, synced: 0 }

            if (updates.actual_seconds !== undefined) {
                row.seconds = updates.actual_seconds
                delete row.actual_seconds
            }

            if (updates.notes !== undefined || updates.focus_score !== undefined || updates.energy_level !== undefined) {
                row.metadata = JSON.stringify({
                    notes: updates.notes,
                    focus_score: updates.focus_score,
                    energy_level: updates.energy_level
                })
                delete updates.notes
                delete updates.focus_score
                delete updates.energy_level
                delete row.notes
                delete row.focus_score
                delete row.energy_level
            }

            if (!db()) {
                row.synced = 1
                const { error } = await (supabase.from('focus_sessions') as any).update(row).eq('id', id)
                if (error) return { error: error.message }
                return { error: null }
            }

            await db().updateFocusSession(id, row)
            dataSyncService.trigger()
            return { error: null }
        },

        deleteAll: async () => {
            const user = await getUser()
            if (!user) return { error: 'No user' }

            if (!db()) {
                const { error } = await (supabase.from('focus_sessions') as any)
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('user_id', user.id)
                    .is('deleted_at', null)

                if (error) return { error: error.message }
                return { error: null }
            }

            await db().softDeleteAllSessions(user.id)
            dataSyncService.trigger()
            return { error: null }
        }
    }
}
