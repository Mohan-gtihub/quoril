import type { ReportInsightSummary } from './types'

/** Raw inputs pulled from the report hooks — kept explicit so this stays pure & testable. */
export interface BuildSummaryInput {
    rangeLabel: string
    activeSeconds: number
    deepWorkHours: number
    deepWorkBlocks: number
    focusSessions: number
    focusSeconds: number
    avgSessionSeconds: number
    contextSwitchesPerDay: number
    idlePercent: number
    tasksCompleted: number
    tasksTotal: number
    completionRate: number
    focusLinkedPercent: number
    distractionDuringFocusSeconds: number
    distractionPercent: number
    overallDistractionSeconds: number
    overallDistractionPercent: number
    distractionByCategory: { category: string; seconds: number }[]
    peakHours: { hour: number; minutes: number; isPeak: boolean }[]
    topCategories: { name: string; seconds: number }[]
    // Only distracting apps are treated as attention leaks.
    distractingApps: { name: string; seconds: number }[]
}

const DISTRACTING = ['Social', 'Entertainment', 'Gaming', 'News']
export { DISTRACTING }

function hourLabel(h: number): string {
    const suffix = h < 12 ? 'AM' : 'PM'
    const base = h % 12 === 0 ? 12 : h % 12
    return `${base}:00 ${suffix}`
}

/** "10:00 AM – 11:00 AM" for a single peak hour bucket. */
function windowLabel(h: number): string {
    return `${hourLabel(h)} – ${hourLabel((h + 1) % 24)}`
}

const round = (n: number) => Math.round(n)

/**
 * Turn raw report metrics into the privacy-safe aggregated summary sent to the model.
 * Best window = the peak focus hour; worst = the lowest non-zero focus hour.
 */
export function buildInsightSummary(input: BuildSummaryInput): ReportInsightSummary {
    const withFocus = input.peakHours.filter(b => b.minutes > 0)
    const best = withFocus.reduce<typeof withFocus[number] | null>(
        (a, b) => (a === null || b.minutes > a.minutes ? b : a), null)
    const worst = withFocus.length > 1
        ? withFocus.reduce((a, b) => (b.minutes < a.minutes ? b : a), withFocus[0])
        : null

    const leaks = input.distractingApps
        .filter(a => a.seconds > 0)
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 5)
        .map(a => ({ source: a.name, minutes: round(a.seconds / 60) }))

    return {
        range: input.rangeLabel,
        active_time_minutes: round(input.activeSeconds / 60),
        deep_work_minutes: round(input.deepWorkHours * 60),
        deep_work_blocks: input.deepWorkBlocks,
        focus_sessions: input.focusSessions,
        focus_minutes: round(input.focusSeconds / 60),
        avg_session_minutes: round(input.avgSessionSeconds / 60),
        context_switches_per_day: round(input.contextSwitchesPerDay),
        idle_percent: round(input.idlePercent),
        tasks_completed: input.tasksCompleted,
        tasks_total: input.tasksTotal,
        completion_rate: round(input.completionRate),
        focus_linked_percent: round(input.focusLinkedPercent),
        distraction_during_focus_minutes: round(input.distractionDuringFocusSeconds / 60),
        distraction_percent: round(input.distractionPercent),
        overall_distraction_minutes: round(input.overallDistractionSeconds / 60),
        overall_distraction_percent: round(input.overallDistractionPercent),
        distraction_by_category: input.distractionByCategory
            .filter(c => c.seconds > 0)
            .map(c => ({ category: c.category, minutes: round(c.seconds / 60) })),
        best_focus_window: best ? windowLabel(best.hour) : null,
        worst_focus_window: worst ? windowLabel(worst.hour) : null,
        top_categories: input.topCategories
            .filter(c => c.seconds > 0)
            .slice(0, 6)
            .map(c => ({ name: c.name, minutes: round(c.seconds / 60) })),
        top_attention_leaks: leaks,
    }
}
