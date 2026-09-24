// Renderer-side transport for the `quoril-insights` Supabase Edge Function — the
// same function the Quoril-Swift app calls (both projects share one Supabase
// project). This is the pin-to-pin port of Swift's InsightClient /
// PlanningExplanationClient: the AI key (NVIDIA) lives only in the edge function,
// never in the client, and the caller's Supabase access token authenticates the
// request (supabase-js's functions.invoke attaches it automatically, exactly as
// src/services/slack.ts does).
//
// Two modes, distinguished by the payload the renderer already builds:
//   • Briefing  — an InsightPayload (has `tier`); returns a JSON string of
//                 { headline, insights, experiment } which insightStore validates.
//   • Planning  — { kind: 'planning', ...five integers }; returns plain text
//                 which planningExplanation validates.
// The report-summary flow (reports InsightsModal, a desktop-only extra with a
// different result schema) is NOT an edge concern — see isReportSummary below.

import { supabase } from '@/services/supabase'

const FUNCTION = 'quoril-insights'
// Mirrors the model pinned server-side in the edge function. Reported to the UI
// only as a label; changing the model there does not require an app release.
export const EDGE_MODEL = 'nvidia/nvidia-nemotron-nano-9b-v2'

const PLANNING_KEYS = [
    'plannedMinutes',
    'capacityMinutes',
    'openWindowCount',
    'proposedBlockCount',
    'adjustmentPercent',
] as const

/** The five-integer day-fit input, tagged by planningExplanation. */
export function isPlanning(summary: unknown): summary is Record<string, number> & { kind: 'planning' } {
    return !!summary && typeof summary === 'object' && (summary as any).kind === 'planning'
}

/** The InsightPayload the briefing store builds (never a report summary). */
export function isBriefingPayload(summary: unknown): boolean {
    return !!summary && typeof summary === 'object' && typeof (summary as any).tier === 'string'
}

/** The reports-modal ReportInsightSummary — handled by the legacy backend only. */
export function isReportSummary(summary: unknown): boolean {
    return !!summary && typeof summary === 'object'
        && typeof (summary as any).range === 'string'
        && typeof (summary as any).active_time_minutes === 'number'
}

// A briefing/planning result, or a failure that says whether it's worth trying a
// fallback backend. `retryable: false` means the answer is authoritative (e.g. a
// real per-user quota) and must be surfaced rather than routed around.
export type EdgeResult =
    | { ok: true; result: any; model: string }
    | { ok: false; error: string; retryable: boolean }

// Map the edge function's terse error codes to user-facing copy, and decide
// whether a fallback backend should be tried. A quota is authoritative; every
// infrastructure failure is worth a second attempt.
function mapError(code: string, retryAfterMinutes?: number): { error: string; retryable: boolean } {
    switch (code) {
        case 'quota': {
            const mins = typeof retryAfterMinutes === 'number' && retryAfterMinutes > 0 ? retryAfterMinutes : 60
            return { error: `Daily AI limit reached. Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`, retryable: false }
        }
        case 'not_configured':
            return { error: 'AI insights are not configured on the server.', retryable: true }
        case 'upstream_busy':
            return { error: 'The AI service is busy right now. Try again shortly.', retryable: true }
        case 'upstream_failed':
            return { error: 'The AI service could not complete the request.', retryable: true }
        case 'bad_request':
            return { error: "Couldn't build a valid request for insights.", retryable: false }
        case 'Unauthorized':
            return { error: 'Sign in to Quoril to generate insights.', retryable: false }
        default:
            return { error: 'Could not reach the insights service.', retryable: true }
    }
}

/**
 * Call the edge function. Returns a briefing object/string or a planning string.
 * Never throws — failures come back as `{ ok: false, retryable }` so the caller
 * can decide whether to fall back to another backend.
 */
export async function generateViaEdge(summary: unknown): Promise<EdgeResult> {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
        // Without a session the function 401s; a fallback backend (which posts an
        // anonymous aggregate) may still work, so mark this retryable.
        return { ok: false, error: 'Sign in to Quoril to generate insights.', retryable: true }
    }

    const planning = isPlanning(summary)
    let body: { payload: unknown; mode?: string }
    if (planning) {
        const payload: Record<string, number> = {}
        for (const k of PLANNING_KEYS) {
            const n = Number((summary as any)[k])
            payload[k] = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
        }
        body = { payload, mode: 'planning_explanation' }
    } else {
        body = { payload: summary }
    }

    let data: any
    let error: any
    try {
        ({ data, error } = await supabase.functions.invoke(FUNCTION, { body }))
    } catch (e) {
        return { ok: false, error: 'Could not reach the insights service.', retryable: true }
    }

    if (error) {
        // FunctionsHttpError carries the JSON body ({ error, retryAfterMinutes }) on
        // .context — read it to distinguish a quota from a transient failure.
        let code = ''
        let retryAfterMinutes: number | undefined
        const ctx = (error as any).context
        if (ctx && typeof ctx.json === 'function') {
            try {
                const b = await ctx.json()
                code = b?.error ?? ''
                retryAfterMinutes = b?.retryAfterMinutes
            } catch { /* non-JSON error body */ }
        }
        const mapped = mapError(code, retryAfterMinutes)
        return { ok: false, ...mapped }
    }

    const content = data?.content
    if (typeof content !== 'string' || !content.trim()) {
        return { ok: false, error: 'The insights service returned an empty response.', retryable: true }
    }

    // Planning: plain text, validated by the caller. Briefing: the raw JSON
    // string, validated (and fence-stripped) by insightStore's validateBriefing.
    return { ok: true, result: content.trim(), model: EDGE_MODEL }
}
