/**
 * Shared types for the voice-driven task agent.
 *
 * This module is intentionally free of React / Electron / DOM dependencies so
 * the core agent logic can be unit-tested in isolation.
 */

export type TaskPriority = 'low' | 'medium' | 'high'

/**
 * A partially- or fully-filled task, as understood by the agent so far.
 * `null` means "not yet known"; the UI treats nulls as "leave field untouched".
 */
export interface TaskDraft {
    title: string | null
    /** Estimated focus duration in minutes. 0 means "unlimited". */
    minutes: number | null
    priority: TaskPriority | null
    isRecurring: boolean | null
    /** Whether the user asked to start focusing immediately. */
    autoStart: boolean | null
}

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
    role: ChatRole
    content: string
}

/**
 * `complete`     – the agent has enough information; the form can be submitted.
 * `needs_input`  – a required field is missing/ambiguous; ask `question` aloud.
 */
export type AgentStatus = 'complete' | 'needs_input'

/**
 * The normalized result of a single conversational turn.
 */
export interface AgentTurn {
    status: AgentStatus
    /** Best-known draft after this turn (cumulative across the conversation). */
    draft: TaskDraft
    /** Question to read aloud when `status === 'needs_input'`. */
    question: string | null
    /** Confirmation/summary to read aloud when `status === 'complete'`. */
    message: string | null
}

export function emptyDraft(): TaskDraft {
    return {
        title: null,
        minutes: null,
        priority: null,
        isRecurring: null,
        autoStart: null,
    }
}
