import type { TaskColumn } from '@/types/list'

export type TaskStatus =
    | 'todo'
    | 'planned'
    | 'active'
    | 'paused'
    | 'done'

export const COLUMN_STATUS: Record<TaskColumn, TaskStatus[]> = {
    backlog: ['todo'],
    this_week: ['planned'],
    today: ['active', 'paused'],
    done: ['done'],
}

export const COLUMN_DEFAULT: Record<TaskColumn, TaskStatus> = {
    backlog: 'todo',
    this_week: 'planned',
    today: 'active',
    done: 'done',
}
