export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            tasks: {
                Row: {
                    id: string
                    user_id: string
                    list_id: string | null

                    title: string
                    description: string | null

                    status: 'todo' | 'planned' | 'active' | 'paused' | 'done'
                    priority: 'low' | 'medium' | 'high' | 'critical'

                    estimate_m: number
                    spent_s: number

                    started_at: string | null
                    due_at: string | null
                    completed_at: string | null

                    parent_id: string | null
                    sort_order: number

                    created_at: string
                    updated_at: string
                    deleted_at: string | null

                    synced: number
                }

                Insert: {
                    id?: string
                    user_id: string
                    list_id?: string | null

                    title: string
                    description?: string | null

                    status?: 'todo' | 'planned' | 'active' | 'paused' | 'done'
                    priority?: 'low' | 'medium' | 'high' | 'critical'

                    estimate_m?: number
                    spent_s?: number

                    started_at?: string | null
                    due_at?: string | null
                    completed_at?: string | null

                    parent_id?: string | null
                    sort_order?: number

                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null

                    synced?: number
                }

                Update: {
                    id?: string
                    user_id?: string
                    list_id?: string | null

                    title?: string
                    description?: string | null

                    status?: 'todo' | 'planned' | 'active' | 'paused' | 'done'
                    priority?: 'low' | 'medium' | 'high' | 'critical'

                    estimate_m?: number
                    spent_s?: number

                    started_at?: string | null
                    due_at?: string | null
                    completed_at?: string | null

                    parent_id?: string | null
                    sort_order?: number

                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null

                    synced?: number
                }
            }

            lists: {
                Row: {
                    id: string
                    user_id: string

                    name: string
                    color: string
                    icon: string

                    sort_order: number
                    is_system: boolean

                    created_at: string
                    updated_at: string

                    archived_at: string | null
                    deleted_at: string | null

                    synced: number
                }

                Insert: {
                    id?: string
                    user_id: string

                    name: string
                    color?: string
                    icon?: string

                    sort_order?: number
                    is_system?: boolean

                    created_at?: string
                    updated_at?: string

                    archived_at?: string | null
                    deleted_at?: string | null

                    synced?: number
                }

                Update: {
                    id?: string
                    user_id?: string

                    name?: string
                    color?: string
                    icon?: string

                    sort_order?: number
                    is_system?: boolean

                    created_at?: string
                    updated_at?: string

                    archived_at?: string | null
                    deleted_at?: string | null

                    synced?: number
                }
            }

            subtasks: {
                Row: {
                    id: string
                    task_id: string
                    user_id: string

                    title: string
                    done: boolean

                    sort_order: number

                    created_at: string
                    updated_at: string
                    deleted_at: string | null

                    synced: number
                }

                Insert: {
                    id?: string
                    task_id: string
                    user_id: string

                    title: string
                    done?: boolean

                    sort_order?: number

                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null

                    synced?: number
                }

                Update: {
                    id?: string
                    task_id?: string
                    user_id?: string

                    title?: string
                    done?: boolean

                    sort_order?: number

                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null

                    synced?: number
                }
            }

            focus_sessions: {
                Row: {
                    id: string
                    user_id: string
                    task_id: string | null

                    type: 'focus' | 'break' | 'long_break'

                    seconds: number

                    start_time: string
                    end_time: string | null

                    metadata: string | null

                    created_at: string

                    synced: number
                }

                Insert: {
                    id?: string
                    user_id: string
                    task_id?: string | null

                    type: 'focus' | 'break' | 'long_break'

                    seconds?: number

                    start_time: string
                    end_time?: string | null

                    metadata?: string | null

                    created_at?: string

                    synced?: number
                }

                Update: {
                    id?: string
                    user_id?: string
                    task_id?: string | null

                    type?: 'focus' | 'break' | 'long_break'

                    seconds?: number

                    start_time?: string
                    end_time?: string | null

                    metadata?: string | null

                    created_at?: string

                    synced?: number
                }
            }
        }
    }
}

/* ================= APP TYPES ================= */

export type Task = Database['public']['Tables']['tasks']['Row'] & {
    actual_seconds?: number
    estimated_minutes?: number
    due_date?: string | null
    due_time?: string | null
    parent_task_id?: string | null
    sync_status?: 'synced' | 'pending'
    prev_status?: TaskStatus
}

export type Subtask = Database['public']['Tables']['subtasks']['Row'] & {
    completed?: boolean
}

export type List = Database['public']['Tables']['lists']['Row']

export type FocusSession =
    Database['public']['Tables']['focus_sessions']['Row'] & {
        notes?: string
        focus_score?: number
        energy_level?: number
    }

export type TaskStatus =
    Database['public']['Tables']['tasks']['Row']['status']

export type TaskPriority =
    Database['public']['Tables']['tasks']['Row']['priority']
