// The privacy boundary for AI Insights — a TypeScript port of Swift's
// InsightPayload. Exactly what leaves the machine when a briefing is generated,
// and nothing else. Every field is a number or a fixed enum label; there is no
// string field carrying user content. That is load-bearing twice over:
//   1. Privacy — window titles, app names, and task titles are excluded at every
//      tier, with or without consent.
//   2. Injection — a payload with no free text has no channel for instructions to
//      reach the model, so prompt injection is structurally impossible.
//
// Tier 0 (sessionsOnly) ships task + focus numbers that already sync to Supabase.
// Tier 1 (withActivityPatterns) adds shape-of-work signals derived from app
// sessions — counts and category shares, never names — and only when the user
// opts in.

export type InsightTier = 'sessionsOnly' | 'withActivityPatterns'

export interface InsightFocus {
    minutes_today: number
    minutes_in_range: number
    break_minutes_in_range: number
    sessions: number
    deep_work_sessions: number
    longest_session_minutes: number
    /** Focus ÷ (focus + break), as a percentage. */
    efficiency_pct: number
    /** Days in the range with any focus, as a percentage. */
    consistency_pct: number
    focus_streak_days: number
}

export interface InsightTasks {
    completed_today: number
    completed_in_range: number
    open: number
    overdue: number
    completion_rate_pct: number
    completion_streak_days: number
    /** Counts per priority, keyed by the priority's raw value. */
    by_priority: Record<string, number>
}

export interface InsightDelta { current: number; previous: number }

export interface InsightTrend {
    window_days: number
    focus_minutes: InsightDelta
    tasks_completed: InsightDelta
    sessions: InsightDelta
    efficiency: InsightDelta
}

export interface InsightAttention {
    sample_size: number
    median_first_drift_minutes: number
    median_drifts_per_session: number
    median_drift_seconds: number
    unbroken_sessions: number
    suggested_session_minutes?: number
}

export interface InsightEstimates {
    sample_size: number
    on_target: number
    overrun: number
    underrun: number
    /** Median (actual − estimate) ÷ estimate, as a percentage. */
    median_variance_pct: number
}

/** Shape of work, never its content. Present only at withActivityPatterns. */
export interface InsightActivity {
    context_switches_per_hour: number
    blocks_per_focus_session: number
    longest_unbroken_block_minutes: number
    distinct_apps_per_day: number
    /** Share of tracked time per category label (%), keyed by our fixed labels. */
    category_share_pct: Record<string, number>
}

// snake_case throughout — the payload is read by a prompt, and a model reads
// `median_first_drift_minutes` more reliably than the camelCase spelling.
export interface InsightPayload {
    tier: InsightTier
    range_days: number
    focus: InsightFocus
    tasks: InsightTasks
    trend: InsightTrend
    /** Average focus minutes per weekday (not totals), keyed "Mon".."Sun". */
    weekday_avg_focus_minutes: Record<string, number>
    hour_avg_focus_minutes: Record<string, number>
    attention?: InsightAttention
    estimates?: InsightEstimates
    activity?: InsightActivity
}

/** The aggregates InsightPayload is built from — mirrors the Electron reports data. */
export interface InsightPayloadInputs {
    tier: InsightTier
    rangeDays: number
    focus: InsightFocus
    tasks: InsightTasks
    trend: InsightTrend
    /** [{ weekday: 0-6 (Sun=0), avgMinutes }] */
    weekday: { weekday: number; avgMinutes: number }[]
    /** [{ hour: 0-23, avgMinutes }] */
    hour: { hour: number; avgMinutes: number }[]
    attention?: InsightAttention
    estimates?: InsightEstimates
    /** Provided only when the caller has consent; gated again here by tier. */
    activity?: InsightActivity
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Assemble the payload. Pure — no I/O, no clock. Everything it can get wrong is
 * therefore testable, which matters because the thing it must not get wrong is
 * the privacy boundary. The tier decides whether activity is included, not the
 * caller's good intentions.
 */
export function buildInsightPayload(input: InsightPayloadInputs): InsightPayload {
    const weekday_avg_focus_minutes: Record<string, number> = {}
    for (const p of input.weekday) {
        if (p.avgMinutes > 0) weekday_avg_focus_minutes[WEEKDAY_LABELS[((p.weekday % 7) + 7) % 7]] = p.avgMinutes
    }
    const hour_avg_focus_minutes: Record<string, number> = {}
    for (const p of input.hour) {
        if (p.avgMinutes > 0) hour_avg_focus_minutes[String(p.hour)] = p.avgMinutes
    }

    const payload: InsightPayload = {
        tier: input.tier,
        range_days: input.rangeDays,
        focus: input.focus,
        tasks: input.tasks,
        trend: input.trend,
        weekday_avg_focus_minutes,
        hour_avg_focus_minutes,
    }

    if (input.attention && input.attention.sample_size > 0) payload.attention = input.attention
    if (input.estimates && input.estimates.sample_size > 0) payload.estimates = input.estimates
    // Consent gate: activity is dropped unless the tier explicitly allows it.
    if (input.tier === 'withActivityPatterns' && input.activity) payload.activity = input.activity

    return payload
}

/** Every run of digits in a string. */
export function digitRuns(text: string): Set<string> {
    return new Set(text.match(/\d+/g) ?? [])
}

/**
 * Encode exactly as it will be sent, with sorted keys so identical data yields
 * identical bytes — which keeps the Settings preview honest and the cache stable.
 */
export function encodePayload(payload: InsightPayload): string {
    return JSON.stringify(payload, Object.keys(flatten(payload)).sort())
}

// Recursively collect keys so JSON.stringify's replacer sorts nested objects too.
function flatten(obj: any, acc: Record<string, true> = {}): Record<string, true> {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const k of Object.keys(obj)) {
            acc[k] = true
            flatten(obj[k], acc)
        }
    }
    return acc
}

/** Every digit run present in the payload — the allow-list for briefing evidence. */
export function numbersPresent(payload: InsightPayload): Set<string> {
    return digitRuns(JSON.stringify(payload))
}
