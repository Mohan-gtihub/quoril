import { z } from 'zod'
import type { AgentTurn, TaskDraft, TaskPriority } from './types'
import { emptyDraft } from './types'

/**
 * The wire shape we ask the model to emit (snake_case, all fields optional).
 * We keep it permissive and normalize afterwards, because real models drift
 * from any schema no matter how firmly instructed.
 */
const rawTurnSchema = z
    .object({
        status: z.enum(['complete', 'needs_input']).optional(),
        title: z.union([z.string(), z.null()]).optional(),
        minutes: z.union([z.number(), z.string(), z.null()]).optional(),
        priority: z.union([z.string(), z.null()]).optional(),
        is_recurring: z.union([z.boolean(), z.string(), z.null()]).optional(),
        auto_start: z.union([z.boolean(), z.string(), z.null()]).optional(),
        question: z.union([z.string(), z.null()]).optional(),
        message: z.union([z.string(), z.null()]).optional(),
    })
    .passthrough()

export class AgentParseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AgentParseError'
    }
}

/** Trim a string value to non-empty text, or `null`. Used for title/question/message. */
function normalizeText(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function normalizeMinutes(value: unknown): number | null {
    if (value === null || value === undefined) return null
    const n = typeof value === 'string' ? parseInt(value, 10) : value
    if (typeof n !== 'number' || Number.isNaN(n)) return null
    // Clamp to a sane range; negative durations are meaningless.
    return Math.max(0, Math.round(n))
}

function normalizePriority(value: unknown): TaskPriority | null {
    if (typeof value !== 'string') return null
    const v = value.trim().toLowerCase()
    if (v === 'low') return 'low'
    if (v === 'medium' || v === 'normal' || v === 'med') return 'medium'
    if (v === 'high' || v === 'urgent' || v === 'critical' || v === 'asap') return 'high'
    return null
}

function normalizeBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase()
        if (['true', 'yes', 'y', '1'].includes(v)) return true
        if (['false', 'no', 'n', '0'].includes(v)) return false
    }
    return null
}

/**
 * Validate and normalize a raw parsed model object into an {@link AgentTurn}.
 * Throws {@link AgentParseError} when the input isn't a usable object.
 */
export function parseAgentTurn(raw: unknown): AgentTurn {
    const result = rawTurnSchema.safeParse(raw)
    if (!result.success) {
        throw new AgentParseError('Model output was not a valid object')
    }

    const data = result.data

    const draft: TaskDraft = {
        ...emptyDraft(),
        title: normalizeText(data.title),
        minutes: normalizeMinutes(data.minutes),
        priority: normalizePriority(data.priority),
        isRecurring: normalizeBoolean(data.is_recurring),
        autoStart: normalizeBoolean(data.auto_start),
    }

    const question = normalizeText(data.question)
    const message = normalizeText(data.message)

    // Trust an explicit status; otherwise infer one. A turn is "complete" only
    // when we have a title and the model isn't actively asking something.
    let status = data.status
    if (!status) {
        status = draft.title && !question ? 'complete' : 'needs_input'
    }

    // Guard against contradictory output (e.g. "complete" but no title).
    if (status === 'complete' && !draft.title) {
        status = 'needs_input'
    }

    return { status, draft, question, message }
}
