import { Task, Subtask, List } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabase'
import { dataSyncService } from './dataSyncService'

/* ---------------- HELPERS ---------------- */

const getUser = async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) return data.session.user

    // Double check with getUser (JWT verification)
    const { data: userData } = await supabase.auth.getUser()
    return userData.user || null
}

const db = () => (window as any).electronAPI?.db

/* ---------------- TASK MAP ---------------- */

const mapTask = (row: any): Task => {
    if (!row) return row

    const [date, time] = row.due_at
        ? row.due_at.split('T')
        : [null, null]

    return {
        ...row,
        actual_seconds: row.spent_s || 0,
        estimated_minutes: row.estimate_m || 0,
        due_date: date,
        due_time: time?.split('.')[0] || null,
        parent_task_id: row.parent_id,
        sync_status: row.synced ? 'synced' : 'pending',
        is_recurring: Boolean(row.is_recurring),
        last_reset_date: row.last_reset_date
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
                    .eq('user_id', user.id)
                    .is('deleted_at', null)

                if (listId && listId !== 'all') {
                    query = query.eq('list_id', listId)
                }

                const { data, error } = await query.order('sort_order', { ascending: true })
                if (error) return { data: [], error: error.message }
                return { data: (data || []).map(mapTask), error: null }
            }

            const rows = await db().getTasks(user.id, listId)
            return { data: rows.map(mapTask), error: null }
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
                spent_s: 0,
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
            // Helper function to safely update due date/time
            const updateDueDateTime = async (row: any, updates: any): Promise<void> => {
                if (updates.due_date || updates.due_time) {
                    // Use a single query to get existing task data if needed
                    const existing = await getExistingDueDateTime(row.id)
                    
                    // Combine due_date and due_time into due_at field
                    const newDueDate = updates.due_date || existing.due_date
                    const newDueTime = updates.due_time || existing.due_time
                    row.due_at = newDueDate && newDueTime ? `${newDueDate}T${newDueTime}` : newDueDate || null
                } else {
                    // If no due date/time provided, keep existing values
                    const existing = await getExistingDueDateTime(row.id)
                    row.due_at = existing.due_date && existing.due_time ? `${existing.due_date}T${existing.due_time}` : existing.due_date || null
                }
            }

            await updateDueDateTime(row, updates)

            if (!db()) {
                row.synced = 1
                const { data, error } = await (supabase.from('tasks') as any).update(row).eq('id', id).select().single()
                if (error) return { data: null, error: error.message }
                return { data: mapTask(data), error: null }
            }

            const keys = Object.keys(row)
            await db().exec(`UPDATE tasks SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...Object.values(row), id])
            dataSyncService.trigger()

            const [fresh] = await db().exec('SELECT * FROM tasks WHERE id=?', [id])
            return { data: mapTask(fresh), error: null }
        },

        delete: async (id: string) => {
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
            if (!db()) {
                const { error } = await (supabase.from('tasks') as any).delete().eq('id', id)
                return { error: error?.message || null }
            }
            await db().hardDeleteTask(id)
            dataSyncService.trigger()
            return { error: null }
        },

        start: (id: string) => {
            if (!db()) return // Fallback handled by store usually? No, store calls this. 
            // If No DB, we technically can't "START" locally with high precision if the logic is in C++.
            // But looking at previous code: `db()?.startTask(id)` implies it returns something?
            // Actually `startTask` in local DB likely updates `started_at` column.

            // Fallback:
            // supabase.from('tasks').update({ started_at: new Date().toISOString() }).eq('id', id)
            // But this is async and `start` here calculates duration?
            // The `db().startTask(id)` likely returns the updated task row?
            return db()?.startTask(id)
        },

        pause: (id: string) => db()?.pauseTask(id),

        reorder: async (items: { id: string; sort_order: number }[]) => {
            if (!db()) {
                // Parallel update for speed to prevent UI reverting
                await Promise.all(items.map(item =>
                    (supabase.from('tasks') as any).update({ sort_order: item.sort_order }).eq('id', item.id)
                ))
                return
            }

            for (const item of items) {
                await db().exec('UPDATE tasks SET sort_order=?, synced=0 WHERE id=?', [item.sort_order, item.id])
            }
            dataSyncService.trigger()
        },

        // Helper for Permanent Delete List
        deleteByListId: async (listId: string) => {
            if (!db()) {
                const { error } = await (supabase.from('tasks') as any).delete().eq('list_id', listId)
                return { error: error?.message || null }
            }
            // Use Soft Delete for Sync compatibility
            await db().exec('UPDATE tasks SET deleted_at = ?, synced = 0 WHERE list_id = ?', [new Date().toISOString(), listId])
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
                    .eq('user_id', user.id)
                    .is('deleted_at', null)
                    .order('sort_order')

                if (error) return { data: [], error: error.message }

                // Filter archived
                const filtered = (data || []).filter((l: any) => archived ? !!l.archived_at : !l.archived_at)
                return { data: filtered, error: null }
            }

            const rows = await db().getLists(user.id, archived)
            return { data: rows, error: null }
        },

        create: async (list: any) => {
            const user = await getUser()
            if (!user) return { data: null, error: 'No User' }

            const data = {
                id: uuidv4(),
                user_id: user.id,
                name: list.name || 'Untitled',
                color: list.color || '#3b82f6',
                icon: list.icon || 'list',
                sort_order: list.sort_order || 0,
                is_system: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
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

            const keys = Object.keys(data)
            await db().exec(`UPDATE lists SET ${keys.map(k => `${k}=?`).join(',')} WHERE id = ?`, [...Object.values(data), id])
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
            return { data: rows.map((r: any) => ({ ...r, completed: !!r.done })), error: null }
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

            const keys = Object.keys(row)
            await db().exec(`UPDATE subtasks SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...Object.values(row), id])
            dataSyncService.trigger()
            return { data: { ...updates, id }, error: null }
        },

        delete: async (id: string) => {
            if (!db()) {
                await (supabase.from('subtasks') as any).update({ deleted_at: new Date().toISOString() }).eq('id', id)
                return { error: null }
            }
            await db().exec('UPDATE subtasks SET deleted_at=?, synced=0 WHERE id=?', [new Date().toISOString(), id])
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
                seconds: session.actual_seconds || 0,
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

            const keys = Object.keys(row)
            await db().exec(`UPDATE focus_sessions SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...Object.values(row), id])
            dataSyncService.trigger()

            return { error: null }
        }
    }
}
