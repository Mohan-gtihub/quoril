// Local planning intelligence — a deterministic, side-effect-free port of the
// Swift DayFitAnalyzer. Given a day, the open tasks, closed-task history, and the
// day's busy intervals (calendar events), it answers "can this day fit?" and
// proposes user-approvable time blocks. Nothing here writes; the store applies
// the proposals as calendar events only after the user confirms.

import type { Task, TaskPriority } from '@/types/database'

/** Working hours the planner schedules within (local time). */
export const WORK_START_HOUR = 9
export const WORK_END_HOUR = 18

/** Minimum usable gap — windows shorter than this are ignored. */
const MIN_WINDOW_MINUTES = 15
/** Default estimate for an unestimated task. */
const DEFAULT_ESTIMATE_MINUTES = 30

export interface BusyInterval {
    start: Date
    end: Date
}

export interface Proposal {
    /** Same as task.id — one proposal per task. */
    id: string
    task: Task
    start: Date
    end: Date
    /** Learned-adjusted estimate, rounded to 5m, floored at 15m. */
    adjustedMinutes: number
}

export interface DayFitAnalysis {
    day: Date
    capacityMinutes: number
    plannedMinutes: number
    /** Learned ratio of actual/estimated time, clamped 0.75–2.0. */
    adjustmentFactor: number
    freeWindows: BusyInterval[]
    proposals: Proposal[]
    remainingMinutes: number
    isOverloaded: boolean
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
}

function atHour(day: Date, hour: number): Date {
    const d = new Date(day)
    d.setHours(hour, 0, 0, 0)
    return d
}

function minutesBetween(a: Date, b: Date): number {
    return Math.floor((b.getTime() - a.getTime()) / 60000)
}

/** Chronologically sort and coalesce overlapping/adjacent intervals. */
function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
    const sorted = [...intervals].sort((l, r) => l.start.getTime() - r.start.getTime())
    const result: BusyInterval[] = []
    for (const interval of sorted) {
        const last = result[result.length - 1]
        if (!last || interval.start.getTime() > last.end.getTime()) {
            result.push({ start: interval.start, end: interval.end })
        } else {
            last.end = new Date(Math.max(last.end.getTime(), interval.end.getTime()))
        }
    }
    return result
}

/** The gaps between busy intervals within [start, end] — the free windows. */
function findGaps(start: Date, end: Date, busy: BusyInterval[]): BusyInterval[] {
    let cursor = start
    const result: BusyInterval[] = []
    for (const interval of busy) {
        if (interval.start.getTime() > cursor.getTime()) {
            result.push({ start: cursor, end: interval.start })
        }
        cursor = new Date(Math.max(cursor.getTime(), interval.end.getTime()))
    }
    if (cursor.getTime() < end.getTime()) {
        result.push({ start: cursor, end })
    }
    return result
}

const isDone = (t: Task) => t.status === 'done'

/**
 * The learned adjustment factor: how much longer (or shorter) tasks actually take
 * versus their estimate. Uses the median of actual/estimate over closed tasks with
 * enough signal, so a single wild outlier can't skew the plan. Clamped 0.75–2.0.
 */
export function learnedAdjustment(history: Task[]): number {
    const samples: number[] = []
    for (const t of history) {
        const estimateM = t.estimateMinutes ?? t.estimate_m ?? 0
        const spentS = t.focusSeconds ?? t.spent_s ?? 0
        if (!isDone(t) || estimateM < 5 || spentS < 60) continue
        samples.push(spentS / (estimateM * 60))
    }
    if (samples.length < 3) return 1.0
    samples.sort((a, b) => a - b)
    const median = samples[Math.floor(samples.length / 2)]
    return Math.min(Math.max(median, 0.75), 2.0)
}

function adjustedEstimate(task: Task, factor: number): number {
    const baseline = (task.estimateMinutes ?? task.estimate_m ?? 0) > 0
        ? (task.estimateMinutes ?? task.estimate_m)
        : DEFAULT_ESTIMATE_MINUTES
    return Math.max(15, Math.round((baseline * factor) / 5) * 5)
}

/**
 * Analyse whether the day's open work fits its free time, and greedily propose
 * time blocks in priority order. Pure — deterministic given identical inputs.
 */
export function analyzeDayFit(params: {
    day: Date
    tasks: Task[]
    history: Task[]
    busy: BusyInterval[]
}): DayFitAnalysis {
    const { day, tasks, history, busy } = params
    const workStart = atHour(day, WORK_START_HOUR)
    const workEnd = atHour(day, WORK_END_HOUR)

    const factor = learnedAdjustment(history)

    // Clip busy intervals to work hours, drop empties, merge.
    const clipped = busy
        .map((interval) => {
            const start = new Date(Math.max(interval.start.getTime(), workStart.getTime()))
            const end = new Date(Math.min(interval.end.getTime(), workEnd.getTime()))
            return end.getTime() > start.getTime() ? { start, end } : null
        })
        .filter((x): x is BusyInterval => x !== null)
    const mergedBusy = mergeIntervals(clipped)

    const freeWindows = findGaps(workStart, workEnd, mergedBusy)
        .filter((w) => minutesBetween(w.start, w.end) >= MIN_WINDOW_MINUTES)

    const capacityMinutes = freeWindows.reduce((sum, w) => sum + minutesBetween(w.start, w.end), 0)

    // Open, top-level tasks only (a checklist child never gets its own block).
    const openTasks = tasks.filter((t) => !isDone(t) && !(t.parentTaskId ?? t.parent_id))

    const adjusted = new Map<string, number>()
    for (const t of openTasks) adjusted.set(t.id, adjustedEstimate(t, factor))

    const plannedMinutes = openTasks.reduce((sum, t) => sum + (adjusted.get(t.id) ?? DEFAULT_ESTIMATE_MINUTES), 0)

    // Rank: priority, then earliest due, then shortest.
    const ranked = [...openTasks].sort((lhs, rhs) => {
        const pl = PRIORITY_RANK[lhs.priority] ?? 2
        const pr = PRIORITY_RANK[rhs.priority] ?? 2
        if (pl !== pr) return pl - pr
        const dl = lhs.due_at ? Date.parse(lhs.due_at) : null
        const dr = rhs.due_at ? Date.parse(rhs.due_at) : null
        if (dl !== null && dr !== null && dl !== dr) return dl - dr
        if (dl !== null && dr === null) return -1
        if (dl === null && dr !== null) return 1
        return (adjusted.get(lhs.id) ?? DEFAULT_ESTIMATE_MINUTES) - (adjusted.get(rhs.id) ?? DEFAULT_ESTIMATE_MINUTES)
    })

    // Greedy first-fit into the free windows, advancing a per-window cursor.
    const cursors = freeWindows.map((w) => w.start.getTime())
    const proposals: Proposal[] = []
    for (const task of ranked) {
        const minutes = adjusted.get(task.id) ?? DEFAULT_ESTIMATE_MINUTES
        const durationMs = minutes * 60000
        const index = freeWindows.findIndex((w, i) => cursors[i] + durationMs <= w.end.getTime())
        if (index === -1) continue // does not fit anywhere today — skip
        const start = new Date(cursors[index])
        const end = new Date(cursors[index] + durationMs)
        proposals.push({ id: task.id, task, start, end, adjustedMinutes: minutes })
        cursors[index] = end.getTime()
    }

    const remainingMinutes = capacityMinutes - plannedMinutes
    return {
        day,
        capacityMinutes,
        plannedMinutes,
        adjustmentFactor: factor,
        freeWindows,
        proposals,
        remainingMinutes,
        isOverloaded: remainingMinutes < 0,
    }
}
