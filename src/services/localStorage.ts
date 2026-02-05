import { Task, Subtask, List } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabase'
import { dataSyncService } from './dataSyncService'

/* ---------------- HELPERS ---------------- */

const getUser = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.user || null
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
        sync_status: row.synced ? 'synced' : 'pending'
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
            if (!db()) return { data: [], error: 'No DB' }
            const rows = await db().getTasks(user.id, listId)
            return { data: rows.map(mapTask), error: null }
        },

        create: async (task: Partial<Task>) => {
            const user = await getUser()
            if (!user || !db()) return { data: null, error: 'No user' }

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
                synced: 0
            }

            await db().saveTask(row)
            dataSyncService.trigger()
            return { data: mapTask(row), error: null }
        },

        update: async (id: string, updates: any) => {
            if (!db()) return { error: 'No DB' }

            const row: any = { ...updates, updated_at: new Date().toISOString(), synced: 0 }

            // Normalized Mapping
            if (updates.actual_seconds !== undefined) row.spent_s = updates.actual_seconds
            if (updates.estimated_minutes !== undefined) row.estimate_m = updates.estimated_minutes
            if (updates.parent_task_id !== undefined) row.parent_id = updates.parent_task_id

            delete row.actual_seconds
            delete row.estimated_minutes
            delete row.parent_task_id

            if (updates.due_date || updates.due_time) {
                const [old] = await db().exec('SELECT due_at FROM tasks WHERE id = ?', [id])
                const [d, t] = (old?.due_at || 'T').split('T')
                row.due_at = `${updates.due_date || d}T${updates.due_time || t || '00:00:00'}`
            }

            const keys = Object.keys(row)
            await db().exec(`UPDATE tasks SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...Object.values(row), id])
            dataSyncService.trigger()

            const [fresh] = await db().exec('SELECT * FROM tasks WHERE id=?', [id])
            return { data: mapTask(fresh), error: null }
        },

        delete: async (id: string) => {
            if (!db()) return { error: 'No DB' }
            await db().deleteTask(id)
            dataSyncService.trigger()
            return { error: null }
        },

        permanentDelete: async (id: string) => {
            if (!db()) return { error: 'No DB' }
            await db().hardDeleteTask(id)
            dataSyncService.trigger()
            return { error: null }
        },

        start: (id: string) => db()?.startTask(id),
        pause: (id: string) => db()?.pauseTask(id),

        reorder: async (items: { id: string; sort_order: number }[]) => {
            if (!db()) return
            for (const item of items) {
                await db().exec('UPDATE tasks SET sort_order=?, synced=0 WHERE id=?', [item.sort_order, item.id])
            }
            dataSyncService.trigger()
        }
    },

    /* ================= LISTS ================= */

    lists: {
        list: async (archived: boolean = false) => {
            const user = await getUser()
            if (!user) return { data: [], error: 'No session' }
            if (!db()) return { data: [], error: 'No DB' }
            const rows = await db().getLists(user.id, archived)
            return { data: rows, error: null }
        },

        create: async (list: any) => {
            const user = await getUser()
            if (!user || !db()) return { data: null, error: 'No DB' }

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

            await db().saveList(data)
            dataSyncService.trigger()
            return { data: data as List, error: null }
        },

        update: async (id: string, updates: any) => {
            if (!db()) return { error: 'No DB' }
            const data = { ...updates, updated_at: new Date().toISOString(), synced: 0 }
            const keys = Object.keys(data)
            await db().exec(`UPDATE lists SET ${keys.map(k => `${k}=?`).join(',')} WHERE id = ?`, [...Object.values(data), id])
            dataSyncService.trigger()
            return { data: { ...updates, id }, error: null }
        },

        delete: async (id: string) => {
            if (!db()) return { error: 'No DB' }
            await db().deleteList(id)
            dataSyncService.trigger()
            return { error: null }
        },

        permanentDelete: async (id: string) => {
            if (!db()) return { error: 'No DB' }
            await db().hardDeleteList(id)
            dataSyncService.trigger()
            return { error: null }
        },

        archive: async (id: string) => {
            if (!db()) return { error: 'No DB' }
            await db().archiveList(id)
            return { error: null }
        },

        restore: async (id: string) => {
            if (!db()) return { error: 'No DB' }
            await db().restoreList(id)
            return { error: null }
        }
    },

    /* ================= SUBTASKS ================= */

    subtasks: {
        list: async (taskId: string) => {
            if (!db()) return { data: [], error: 'No DB' }
            const user = await getUser()
            if (!user) return { data: [], error: 'No session' }
            const rows = await db().getSubtasks(taskId)
            return { data: rows.map((r: any) => ({ ...r, completed: !!r.done })), error: null }
        },

        create: async (sub: Partial<Subtask>) => {
            const user = await getUser()
            if (!user || !db() || !sub.task_id) return { data: null, error: 'Invalid Task' }

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

            await db().saveSubtask(row)
            dataSyncService.trigger()
            return { data: { ...row, completed: !!row.done }, error: null }
        },

        update: async (id: string, updates: any) => {
            if (!db()) return { error: 'No DB' }
            const row: any = { ...updates, updated_at: new Date().toISOString(), synced: 0 }

            if (updates.completed !== undefined) {
                row.done = updates.completed ? 1 : 0
                delete row.completed
            }

            const keys = Object.keys(row)
            await db().exec(`UPDATE subtasks SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...Object.values(row), id])
            dataSyncService.trigger()
            return { data: { ...updates, id }, error: null }
        },

        delete: async (id: string) => {
            if (!db()) return { error: 'No DB' }
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
            if (!db()) return { data: [], error: 'No DB' }
            const rows = await db().getSessions(user.id)
            return { data: rows.map((r: any) => ({ ...r, ...(r.metadata ? JSON.parse(r.metadata) : {}) })), error: null }
        },

        create: async (session: any) => {
            const user = await getUser()
            if (!user || !db()) return { data: null, error: 'No user' }

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

            await db().saveSession(row)
            dataSyncService.trigger()
            return { data: { ...session, id }, error: null }
        },

        update: async (id: string, updates: any) => {
            if (!db()) return { error: 'No DB' }

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

            const keys = Object.keys(row)
            await db().exec(`UPDATE focus_sessions SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...Object.values(row), id])
            dataSyncService.trigger()

            return { error: null }
        }
    }
}
