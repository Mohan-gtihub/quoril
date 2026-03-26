import { create } from 'zustand'

import type { Task, Subtask } from '@/types/database'
import type { TaskColumn } from '@/types/list'

import { localService } from '@/services/localStorage'
import { backupService } from '@/services/backupService'
import { soundService } from '@/services/soundService'
import { useSettingsStore } from './settingsStore'
import { parseTitleForTime } from '@/utils/timeParser'

import {
    COLUMN_STATUS,
    COLUMN_DEFAULT,
    type TaskStatus,
} from '@/utils/columnMap'

interface TaskState {
    tasks: Task[]
    subtasks: Record<string, Subtask[]>

    loading: boolean
    error: string | null

    selectedTaskId: string | null

    fetchTasks: (listId?: string) => Promise<void>
    fetchTasksByColumn: (listId: string, column: TaskColumn) => Promise<Task[]>

    createTask: (
        task: Partial<Task>,
        column: TaskColumn
    ) => Promise<Task>

    updateTask: (id: string, updates: Partial<Task>) => Promise<Task>

    deleteTask: (id: string) => Promise<void>

    toggleComplete: (id: string) => Promise<void>

    startTask: (id: string) => Promise<void>
    pauseTask: (id: string) => Promise<void>
    archiveTask: (id: string) => Promise<void>
    softDeleteTask: (id: string) => Promise<void>
    permanentDeleteTask: (id: string) => Promise<void>
    hardDeleteTask: (id: string) => Promise<void>
    restoreTask: (id: string) => Promise<void>

    moveTaskToColumn: (
        taskId: string,
        column: TaskColumn
    ) => Promise<void>

    reorderTasks: (
        tasks: { id: string; sort_order: number }[]
    ) => Promise<void>

    getColumnStatuses: (column: TaskColumn) => string[]
    getTodayPlannedMinutes: () => number

    setSelectedTask: (id: string | null) => void
    clearError: () => void

    toggleTaskRecurring: (id: string) => Promise<void>
    syncRecurringTasks: () => Promise<void>

    /* Subtasks */

    fetchSubtasks: (taskId: string) => Promise<void>
    createSubtask: (taskId: string, title: string) => Promise<void>
    toggleSubtask: (subtaskId: string) => Promise<void>
    deleteSubtask: (subtaskId: string) => Promise<void>

    resetAllTaskTimes: () => Promise<void>
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    subtasks: {},

    loading: false,
    error: null,

    selectedTaskId: null,

    /* ---------------- FETCH ---------------- */

    fetchTasks: async (listId) => {
        try {
            set({ loading: true, error: null })

            const { data, error } = await localService.tasks.list(listId)

            if (error) {
                if (error === 'No session') {
                    set({ loading: false })
                    return
                }
                throw new Error(error)
            }

            set({
                tasks: data || [],
                loading: false,
            })

            // Run daily reset check
            await get().syncRecurringTasks()
        } catch (e) {
            set({
                error: 'Failed to load tasks',
                loading: false,
            })
        }
    },

    fetchTasksByColumn: async (listId, column) => {
        try {
            const statuses = COLUMN_STATUS[column]

            const data = get().tasks.filter(
                (t) =>
                    (listId === 'all' || t.list_id === listId) &&
                    statuses.includes(t.status as TaskStatus)
            )

            return data.sort(
                (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
            )
        } catch {
            return []
        }
    },

    /* ---------------- CREATE ---------------- */

    createTask: async (task, column) => {
        try {
            set({ loading: true, error: null })

            const status = COLUMN_DEFAULT[column]

            /* Sort order */

            const siblings = get().tasks.filter(
                (t) =>
                    t.list_id === task.list_id &&
                    COLUMN_STATUS[column].includes(t.status as TaskStatus)
            )

            const maxOrder = siblings.reduce(
                (m, t) => Math.max(m, t.sort_order ?? 0),
                -1
            )

            const finalTask: Partial<Task> = {
                ...task,
                status,
                sort_order: maxOrder + 1,
            }

            /* Parse time */

            if (finalTask.title && !finalTask.estimated_minutes) {
                const { cleanTitle, minutes } = parseTitleForTime(
                    finalTask.title
                )

                if (minutes) {
                    finalTask.title = cleanTitle
                    finalTask.estimated_minutes = minutes
                }
            }

            const { data, error } =
                await localService.tasks.create(finalTask)

            if (error || !data) throw error

            set((s) => ({
                tasks: [data, ...s.tasks],
                loading: false,
            }))

            return data
        } catch (e) {
            set({
                error: 'Create failed',
                loading: false,
            })

            throw e
        }
    },

    /* ---------------- UPDATE ---------------- */

    updateTask: async (id, updates) => {
        const prev = get().tasks

        try {
            set({ error: null })

            const final = { ...updates }

            if (final.title && final.estimated_minutes === undefined) {
                const { cleanTitle, minutes } =
                    parseTitleForTime(final.title)

                if (minutes) {
                    final.title = cleanTitle
                    final.estimated_minutes = minutes
                }
            }

            /* Optimistic */

            set({
                tasks: prev.map((t) =>
                    t.id === id
                        ? { ...t, ...final }
                        : t
                ),
            })

            if (typeof final.actual_seconds === 'number') {
                backupService.save(id, final.actual_seconds)
            }

            const { data, error } =
                await localService.tasks.update(id, final)

            if (error || !data) throw error

            set((s) => ({
                tasks: s.tasks.map((t) =>
                    t.id === id ? data : t
                ),
            }))

            return data
        } catch (e) {
            set({
                tasks: prev,
                error: 'Update failed',
            })

            throw e
        }
    },

    /* ---------------- DELETE ---------------- */

    archiveTask: async (id) => {
        const prev = get().tasks
        try {
            set({
                tasks: prev.filter((t) => t.id !== id),
            })
            // Update with deleted_at (Soft Delete)
            await localService.tasks.update(id, { deleted_at: new Date().toISOString() })

            backupService.remove(id)
        } catch {
            set({ tasks: prev, error: 'Archive failed' })
        }
    },

    restoreTask: async (id) => {
        // Logic to restore if we could see them
        await localService.tasks.update(id, { deleted_at: null })
        await get().fetchTasks()
    },

    softDeleteTask: async (id) => {
        const prev = get().tasks
        try {
            set({ error: null, tasks: prev.filter((t) => t.id !== id) })
            backupService.remove(id)
            await localService.tasks.update(id, { deleted_at: new Date().toISOString() })
        } catch (e) {
            set({ tasks: prev, error: 'Delete failed' })
        }
    },

    permanentDeleteTask: async (id) => {
        await get().hardDeleteTask(id)
    },

    hardDeleteTask: async (id) => {
        const prev = get().tasks
        try {
            set({ error: null, tasks: prev.filter((t) => t.id !== id) })
            backupService.remove(id)
            await localService.tasks.permanentDelete(id)
        } catch (e) {
            set({ tasks: prev, error: 'Hard delete failed' })
        }
    },

    // Legacy Alias
    deleteTask: async (id) => {
        await get().softDeleteTask(id)
    },

    /* ---------------- COMPLETE ---------------- */

    toggleComplete: async (id) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return

        try {
            if (task.status === 'done') {
                await get().moveTaskToColumn(id, 'today')
                return
            }

            await get().moveTaskToColumn(id, 'done')

            const { successSoundEnabled, successSound } = useSettingsStore.getState()
            if (successSoundEnabled) {
                soundService.playSuccess(successSound)
            }
        } catch (e) {
            console.error('Failed to toggle complete:', e)
            set({ error: 'Failed to complete task' })
        }
    },

    /* ---------------- FOCUS ---------------- */

    startTask: async (id) => {
        try {
            const { data, error } =
                await localService.tasks.start(id)

            if (error || !data) throw error

            set((s) => ({
                tasks: s.tasks.map((t) =>
                    t.id === id ? data : t
                ),
            }))
        } catch {
            set({ error: 'Start failed' })
        }
    },

    pauseTask: async (id: string) => {
        try {
            const { data, error } =
                await localService.tasks.pause(id)

            if (error || !data) throw error

            set((s) => ({
                tasks: s.tasks.map((t) =>
                    t.id === id ? data : t
                ),
            }))
        } catch {
            set({ error: 'Pause failed' })
        }
    },

    /* ---------------- MOVE ---------------- */

    moveTaskToColumn: async (taskId, column) => {
        try {
            const status = COLUMN_DEFAULT[column]

            const targets = get().tasks.filter((t) =>
                COLUMN_STATUS[column].includes(
                    t.status as TaskStatus
                )
            )

            const max = targets.reduce(
                (m, t) => Math.max(m, t.sort_order ?? 0),
                -1
            )

            const updates: Partial<Task> = {
                status,
                sort_order: max + 1,
                // Set completion timestamp when moving to done column
                completed_at: column === 'done' ? new Date().toISOString() : undefined,
                // Don't try to update due_date/due_time - they don't exist as separate columns
            }

            await get().updateTask(taskId, updates)
        } catch (e) {
            console.error(e)
        }
    },

    /* ---------------- ORDER ---------------- */

    reorderTasks: async (updates) => {
        const prev = get().tasks

        try {
            const map = new Map(
                updates.map((t) => [t.id, t.sort_order])
            )

            set({
                tasks: prev.map((t) =>
                    map.has(t.id)
                        ? {
                            ...t,
                            sort_order: map.get(t.id)!,
                        }
                        : t
                ),
            })

            await localService.tasks.reorder(updates)
        } catch {
            set({ tasks: prev })
        }
    },

    getColumnStatuses: (column) => {
        return COLUMN_STATUS[column]
    },

    /* ---------------- METRICS ---------------- */

    getTodayPlannedMinutes: () => {
        return get().tasks
            .filter((t) =>
                !t.deleted_at &&
                COLUMN_STATUS.today.includes(
                    t.status as TaskStatus
                )
            )
            .reduce(
                (sum, t) =>
                    sum + (t.estimated_minutes ?? 0),
                0
            )
    },

    /* ---------------- UI ---------------- */

    setSelectedTask: (id) => {
        set({ selectedTaskId: id })

        if (id) get().fetchSubtasks(id)
        else set({ subtasks: {} })
    },

    clearError: () => {
        set({ error: null })
    },

    toggleTaskRecurring: async (id) => {
        const task = get().tasks.find(t => t.id === id)
        if (!task) return

        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const today = `${year}-${month}-${day}`

        await get().updateTask(id, {
            is_recurring: !task.is_recurring,
            last_reset_date: !task.is_recurring ? today : null
        })
    },

    syncRecurringTasks: async () => {
        const { tasks, updateTask } = get()
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const today = `${year}-${month}-${day}`

        const toReset = tasks.filter(t => t.is_recurring && t.last_reset_date !== today)
        if (toReset.length === 0) return

        await Promise.all(toReset.map(async (task) => {
            await updateTask(task.id, {
                status: 'active',
                completed_at: null,
                actual_seconds: 0,
                last_reset_date: today
            })

            if (!get().subtasks[task.id]) {
                await get().fetchSubtasks(task.id)
            }

            const taskSubtasks = get().subtasks[task.id] || []
            await Promise.all(
                taskSubtasks
                    .filter(sub => sub.completed)
                    .map(sub => localService.subtasks.update(sub.id, { completed: false }).catch(e => {
                        console.error('Failed to reset subtask:', sub.id, e)
                    }))
            )

            set((s) => ({
                subtasks: {
                    ...s.subtasks,
                    [task.id]: (s.subtasks[task.id] || []).map(st => ({
                        ...st,
                        completed: false,
                        done: false
                    }))
                }
            }))
        }))
    },

    /* ---------------- SUBTASKS ---------------- */

    fetchSubtasks: async (taskId) => {
        try {
            const { data, error } =
                await localService.subtasks.list(taskId)

            if (error) {
                if (error === 'No session') return
                throw new Error(error)
            }

            set((s) => ({
                subtasks: {
                    ...s.subtasks,
                    [taskId]: data || []
                }
            }))
        } catch {
            set({ error: 'Subtask load failed' })
        }
    },

    createSubtask: async (taskId, title) => {
        try {
            const currentSubtasks = get().subtasks[taskId] || []
            const { data, error } =
                await localService.subtasks.create({
                    task_id: taskId,
                    title,
                    completed: false,
                    sort_order: currentSubtasks.length,
                })

            if (error || !data) throw error

            set((s) => ({
                subtasks: {
                    ...s.subtasks,
                    [taskId]: [
                        ...(s.subtasks[taskId] || []),
                        { ...data, done: !!data.done } as Subtask
                    ]
                }
            }))
        } catch {
            set({ error: 'Subtask create failed' })
        }
    },

    toggleSubtask: async (id) => {
        // Find the subtask across all task IDs in the map
        let foundTaskId: string | null = null
        let sub: Subtask | undefined

        for (const [taskId, list] of Object.entries(get().subtasks)) {
            const match = list.find((s) => s.id === id)
            if (match) {
                foundTaskId = taskId
                sub = match
                break
            }
        }

        if (!sub || !foundTaskId) return

        try {
            const { data, error } =
                await localService.subtasks.update(id, {
                    completed: !sub.completed,
                })

            if (error || !data) throw error

            const taskId = foundTaskId
            set((s) => ({
                subtasks: {
                    ...s.subtasks,
                    [taskId]: s.subtasks[taskId].map((t) =>
                        t.id === id ? {
                            ...t,
                            ...data,
                            task_id: data.task_id || t.task_id,
                            completed: data.completed !== undefined ? !!data.completed : t.completed
                        } : t
                    )
                }
            }))
        } catch {
            set({ error: 'Subtask update failed' })
        }
    },

    deleteSubtask: async (id) => {
        // Find the subtask across all task IDs in the map
        let foundTaskId: string | null = null

        for (const [taskId, list] of Object.entries(get().subtasks)) {
            if (list.some((s) => s.id === id)) {
                foundTaskId = taskId
                break
            }
        }

        if (!foundTaskId) return

        try {
            const { error } =
                await localService.subtasks.delete(id)

            if (error) throw error

            const taskId = foundTaskId
            set((s) => ({
                subtasks: {
                    ...s.subtasks,
                    [taskId]: s.subtasks[taskId].filter(
                        (t) => t.id !== id
                    )
                }
            }))
        } catch {
            set({ error: 'Subtask delete failed' })
        }
    },

    resetAllTaskTimes: async () => {
        try {
            // Optimistic update
            set((s) => ({
                tasks: s.tasks.map(t => ({ ...t, actual_seconds: 0 }))
            }))
            await localService.tasks.resetAllTimes()
        } catch {
            set({ error: 'Failed to reset task times' })
        }
    }
}))
