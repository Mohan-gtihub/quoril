import { create } from 'zustand'

import type { Task, Subtask } from '@/types/database'
import type { TaskColumn } from '@/types/list'

import { localService } from '@/services/localStorage'
import { backupService } from '@/services/backupService'
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

    /* Subtasks */

    fetchSubtasks: (taskId: string) => Promise<void>
    createSubtask: (taskId: string, title: string) => Promise<void>
    toggleSubtask: (subtaskId: string) => Promise<void>
    deleteSubtask: (subtaskId: string) => Promise<void>
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

            if (error) throw error

            set({
                tasks: data || [],
                loading: false,
            })
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
                    t.list_id === listId &&
                    statuses.includes(t.status as TaskStatus)
            )

            return data.sort(
                (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
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
                (m, t) => Math.max(m, t.sort_order || 0),
                -1
            )

            let finalTask: Partial<Task> = {
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

            let final = { ...updates }

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

    deleteTask: async (id) => {
        const prev = get().tasks

        try {
            set({ error: null })

            set({
                tasks: prev.filter((t) => t.id !== id),
            })

            backupService.remove(id)

            const { error } =
                await localService.tasks.delete(id)

            if (error) throw error
        } catch (e) {
            await get().fetchTasks()

            set({ error: 'Delete failed' })

            throw e
        }
    },

    /* ---------------- COMPLETE ---------------- */

    toggleComplete: async (id) => {
        const task = get().tasks.find((t) => t.id === id)

        if (!task) return

        const isDone = task.status === 'done'

        const updates: Partial<Task> = isDone
            ? {
                status: (task.prev_status ??
                    'todo') as TaskStatus,
                completed_at: null,
            }
            : {
                status: 'done',
                prev_status: task.status,
                completed_at: new Date().toISOString(),
            }

        await get().updateTask(id, updates)
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

    pauseTask: async (id) => {
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
                (m, t) => Math.max(m, t.sort_order || 0),
                -1
            )

            await get().updateTask(taskId, {
                status,
                sort_order: max + 1,
            })
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
                COLUMN_STATUS.today.includes(
                    t.status as TaskStatus
                )
            )
            .reduce(
                (sum, t) =>
                    sum + (t.estimated_minutes || 0),
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

    /* ---------------- SUBTASKS ---------------- */

    fetchSubtasks: async (taskId) => {
        try {
            const { data, error } =
                await localService.subtasks.list(taskId)

            if (error) throw error

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
}))
