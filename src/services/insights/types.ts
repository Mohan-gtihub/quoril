// Platform-agnostic contract for the AI Insights module.
// The renderer builds a privacy-safe aggregated summary (see buildSummary.ts),
// hands it to platform.insights.generate(), and renders the structured result.
// Only aggregated metrics ever leave the device — never window titles, URLs,
// document names, or raw history.

export interface ReportInsightSummary {
    range: string
    active_time_minutes: number
    deep_work_minutes: number
    deep_work_blocks: number
    focus_sessions: number
    focus_minutes: number
    avg_session_minutes: number
    context_switches_per_day: number
    idle_percent: number
    tasks_completed: number
    tasks_total: number
    completion_rate: number
    focus_linked_percent: number
    distraction_during_focus_minutes: number
    distraction_percent: number
    best_focus_window: string | null
    worst_focus_window: string | null
    top_categories: { name: string; minutes: number }[]
    top_attention_leaks: { source: string; minutes: number }[]
}

export interface InsightItem {
    title: string
    detail: string
    suggestion: string
}

export interface InsightsResult {
    summary: string
    insights: InsightItem[]
    tomorrow_plan: string[]
}

// Discriminated response so the UI can show a clean error state instead of throwing.
export type InsightsResponse =
    | { ok: true; result: InsightsResult; model: string }
    | { ok: false; error: string }
