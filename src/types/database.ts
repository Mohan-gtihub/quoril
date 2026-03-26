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
                    workspace_id: string | null
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
                    workspace_id?: string | null
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
                    workspace_id?: string | null
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
                }
            }

            focus_sessions: {
                Row: {
                    id: string
                    user_id: string
                    task_id: string | null

                    type: 'focus' | 'break' | 'long_break' | 'deep_work'

                    seconds: number

                    start_time: string
                    end_time: string | null

                    metadata: string | null

                    created_at: string
                }

                Insert: {
                    id?: string
                    user_id: string
                    task_id?: string | null

                    type: 'focus' | 'break' | 'long_break' | 'deep_work'

                    seconds?: number

                    start_time: string
                    end_time?: string | null

                    metadata?: string | null

                    created_at?: string
                }

                Update: {
                    id?: string
                    user_id?: string
                    task_id?: string | null

                    type?: 'focus' | 'break' | 'long_break' | 'deep_work'

                    seconds?: number

                    start_time?: string
                    end_time?: string | null

                    metadata?: string | null

                    created_at?: string
                }
            }
        }
    }
}

/* ================= APP TYPES ================= */

/**
 * Raw row shape from the local SQLite database.
 * `synced` is a local-only tracking field — it does NOT exist in Supabase.
 * It is stripped from payloads before any cloud upsert.
 */
export type DbTaskRow = Database['public']['Tables']['tasks']['Row'] & {
    synced: number
    is_recurring?: number | boolean
    last_reset_date?: string | null
}

/**
 * App-level Task type with camelCase convenience fields.
 * The snake_case fields from DbTaskRow are kept for backwards compatibility
 * but should not be used in new code.
 */
export type Task = DbTaskRow & {
    /** @deprecated use estimateMinutes */
    estimated_minutes?: number
    /** camelCase alias for estimate_m */
    estimateMinutes: number

    /** @deprecated use focusSeconds */
    actual_seconds?: number
    /** camelCase alias for spent_s */
    focusSeconds: number

    /** Parsed date portion of due_at (YYYY-MM-DD) */
    due_date?: string | null
    /** Parsed time portion of due_at (HH:MM:SS) */
    due_time?: string | null

    /** @deprecated use parentTaskId */
    parent_task_id?: string | null
    /** camelCase alias for parent_id */
    parentTaskId: string | null

    sync_status?: 'synced' | 'pending'
    prev_status?: TaskStatus
    is_recurring: boolean
    last_reset_date?: string | null
}

export type Subtask = Database['public']['Tables']['subtasks']['Row'] & {
    /** Local-only sync tracking field — not in Supabase */
    synced?: number
    /** App-layer alias for `done` — always normalised by mapSubtask */
    completed?: boolean
}

export type List = Database['public']['Tables']['lists']['Row'] & {
    /** Local-only sync tracking field — not in Supabase */
    synced?: number
}

export type FocusSession =
    Database['public']['Tables']['focus_sessions']['Row'] & {
        /** Local-only sync tracking field — not in Supabase */
        synced?: number
        notes?: string
        focus_score?: number
        energy_level?: number
    }

export type TaskStatus =
    Database['public']['Tables']['tasks']['Row']['status']

export type TaskPriority =
    Database['public']['Tables']['tasks']['Row']['priority']
