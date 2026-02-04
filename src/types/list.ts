import { Database } from './database'

// List types from database
export type List = Database['public']['Tables']['lists']['Row']
export type ListInsert = Database['public']['Tables']['lists']['Insert']
export type ListUpdate = Database['public']['Tables']['lists']['Update']

// Task column for kanban board
export type TaskColumn = 'backlog' | 'this_week' | 'today' | 'done'

// Extended task type with column (using type instead of interface)
export type TaskWithColumn = Database['public']['Tables']['tasks']['Row'] & {
    column?: TaskColumn
}

// List with statistics
export interface ListWithStats extends List {
    taskCount: number
    pendingCount: number
    estimatedMinutes: number
}
