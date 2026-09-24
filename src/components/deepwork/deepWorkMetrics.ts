/**
 * Deep Work metrics — the Electron equivalent of the Swift "Work Objects" screen.
 *
 * Swift measured an *attention span* from window-title drift and listed per-document
 * "work objects". Electron does not track window titles, so we adapt: an attention
 * span is derived from the length of deliberate deep-work blocks (focus sessions
 * >= 25 min), and "what you worked on" comes from per-task focus time (taskFocus).
 *
 * All inputs here are the raw arrays returned by `getReportsDashboardData` and
 * surfaced through `useReportsData`.
 */

/** Minimum uninterrupted seconds for a focus session to count as deep work (25 min). */
export const DEEP_WORK_MIN_SECONDS = 1500

export interface FocusWindow {
    start: string
    end: string
}

/** Duration in seconds of one focus window; 0 when unparseable. */
function windowSeconds(w: FocusWindow): number {
    const s = Date.parse(w.start)
    const e = Date.parse(w.end)
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0
    return Math.round((e - s) / 1000)
}

/* ─── Attention span (deep-block length distribution) ─────────── */

export interface AttentionSpan {
    /** Deep-block durations in minutes, ascending. */
    blockMinutes: number[]
    sampleSize: number
    medianMinutes: number
    avgMinutes: number
    longestMinutes: number
    /** Suggested session length, rounded to a friendly 5-min step. */
    suggestedMinutes: number
    /** Histogram buckets over deep-block lengths. */
    histogram: { label: string; from: number; to: number; count: number }[]
    /** Whether we have enough samples (>=5) to render the headline confidently. */
    ready: boolean
}

/** Fixed buckets (minutes) for the deep-block histogram. */
const HISTOGRAM_BUCKETS: { label: string; from: number; to: number }[] = [
    { label: '25–35', from: 25, to: 35 },
    { label: '35–45', from: 35, to: 45 },
    { label: '45–60', from: 45, to: 60 },
    { label: '60–90', from: 60, to: 90 },
    { label: '90m+', from: 90, to: Infinity },
]

function median(sorted: number[]): number {
    if (sorted.length === 0) return 0
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid]
}

export function computeAttentionSpan(focusWindows: FocusWindow[]): AttentionSpan {
    const blockMinutes = focusWindows
        .map(windowSeconds)
        .filter(sec => sec >= DEEP_WORK_MIN_SECONDS)
        .map(sec => Math.round(sec / 60))
        .sort((a, b) => a - b)

    const sampleSize = blockMinutes.length
    const med = median(blockMinutes)
    const avg = sampleSize > 0
        ? Math.round(blockMinutes.reduce((s, m) => s + m, 0) / sampleSize)
        : 0
    const longest = sampleSize > 0 ? blockMinutes[blockMinutes.length - 1] : 0

    // Suggest a session length off the median, snapped to a 5-min step, floored at 25.
    const suggested = med > 0 ? Math.max(25, Math.round(med / 5) * 5) : 25

    const histogram = HISTOGRAM_BUCKETS.map(b => ({
        ...b,
        count: blockMinutes.filter(m => m >= b.from && m < b.to).length,
    }))

    return {
        blockMinutes,
        sampleSize,
        medianMinutes: med,
        avgMinutes: avg,
        longestMinutes: longest,
        suggestedMinutes: suggested,
        histogram,
        ready: sampleSize >= 5,
    }
}

/* ─── "What you worked on" — top tasks by focus time ─────────── */

export interface TaskFocusRow {
    taskId: string
    title: string
    status: string
    focusSeconds: number
}

export interface DeepWorkTaskRow {
    taskId: string
    title: string
    status: string
    focusSeconds: number
    /** Estimated number of deep blocks this task represents (>=25m each). */
    estBlocks: number
}

/**
 * Top tasks by focus time. Per-task session counts aren't stored, so we estimate
 * deep-block count from total focus time (>=1 whenever a task has any focus).
 */
export function topFocusTasks(taskFocus: TaskFocusRow[], limit = 8): DeepWorkTaskRow[] {
    return [...taskFocus]
        .filter(t => t.focusSeconds > 0)
        .sort((a, b) => b.focusSeconds - a.focusSeconds)
        .slice(0, limit)
        .map(t => ({
            taskId: t.taskId,
            title: t.title,
            status: t.status,
            focusSeconds: t.focusSeconds,
            estBlocks: Math.max(1, Math.round(t.focusSeconds / DEEP_WORK_MIN_SECONDS)),
        }))
}

/* ─── Best deep-work time of day ─────────────────────────────── */

export interface PeakHourBin { hour: number; minutes: number; isPeak: boolean }

export function bestDeepWorkHour(bins: PeakHourBin[]): { hour: number; minutes: number } | null {
    const peak = bins.find(b => b.isPeak && b.minutes > 0)
        ?? bins.reduce<PeakHourBin | null>((best, b) => (b.minutes > (best?.minutes ?? 0) ? b : best), null)
    if (!peak || peak.minutes === 0) return null
    return { hour: peak.hour, minutes: peak.minutes }
}

export function formatHour(h: number): string {
    const suffix = h < 12 ? 'AM' : 'PM'
    const base = h % 12 === 0 ? 12 : h % 12
    return `${base} ${suffix}`
}

/* ─── Formatting ─────────────────────────────────────────────── */

export function fmtDuration(sec: number): string {
    if (!sec) return '0m'
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}
