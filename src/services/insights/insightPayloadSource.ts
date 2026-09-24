// Collects the numbers `buildInsightPayload` needs — the Electron port of Swift's
// InsightPayloadSource. Separate from the pure payload builder on purpose: this
// half touches IPC and the clock, so the privacy rules stay in the pure half
// (insightPayload.ts) where they can be tested exhaustively.
//
// It reads the exact same reports dashboard aggregate the Reports page uses
// (window.electronAPI.reports.getDashboardData), then reduces it to counts and
// percentages. No window titles, app names or task titles ever survive into the
// returned payload — see insightPayload.ts for why that boundary is load-bearing.

import { subDays } from 'date-fns'
import { platform } from '@/services/platform'
import { useAuthStore } from '@/store/authStore'
import {
    buildInsightPayload,
    type InsightPayload,
    type InsightPayloadInputs,
    type InsightTier,
} from './insightPayload'

/** Minutes ← seconds, rounded. */
const toMin = (seconds: number) => Math.round((seconds || 0) / 60)

/**
 * Build the privacy-safe payload for the last `rangeDays`.
 *
 * @param sharesActivityPatterns the consent toggle, read at call time (never
 *   cached) so revoking it takes effect on the very next generation. Gates the
 *   tier, and the activity block is gated a second time inside buildInsightPayload.
 * @returns null on any failure (logged) — the store treats null as "couldn't
 *   read your data", never as "no data".
 */
export async function buildInsightPayloadFor(
    rangeDays = 30,
    sharesActivityPatterns: boolean,
): Promise<InsightPayload | null> {
    try {
        const userId = useAuthStore.getState().user?.id
        if (!userId) return null
        if (!platform.capabilities.appTracking || !window.electronAPI?.reports?.getDashboardData) {
            // Without the local DB there is no focus/task history to summarise.
            return null
        }

        const to = new Date()
        const from = subDays(to, rangeDays)
        const startDate = from.toISOString()
        const endDate = to.toISOString()

        const raw: any = await window.electronAPI.reports.getDashboardData({
            userId,
            startDate,
            endDate,
        })
        if (!raw) return null

        const tier: InsightTier = sharesActivityPatterns ? 'withActivityPatterns' : 'sessionsOnly'

        const inputs: InsightPayloadInputs = {
            tier,
            rangeDays,
            focus: buildFocus(raw, rangeDays),
            tasks: buildTasks(raw),
            trend: buildTrend(raw, rangeDays),
            weekday: buildWeekday(raw.weeklyTrend ?? []),
            hour: buildHour(raw.peakHours ?? []),
            attention: buildAttention(raw),
            estimates: buildEstimates(raw.taskStats ?? []),
            activity: sharesActivityPatterns ? buildActivity(raw, rangeDays) : undefined,
        }

        return buildInsightPayload(inputs)
    } catch (err) {
        // Never silent: a nil payload surfaces to the user as a fault on our side,
        // so the real reason has to be recoverable from the log.
        console.error('[Insights] payload could not be built', err)
        return null
    }
}

/* ── Focus ─────────────────────────────────────────────────────── */

function buildFocus(raw: any, rangeDays: number): InsightPayloadInputs['focus'] {
    const trend: any[] = raw.weeklyTrend ?? []
    const deep: any[] = raw.deepWorkByDay ?? []

    const focusMinutesInRange = trend.reduce((s, d) => s + toMin(d.totalSeconds), 0)
    const breakMinutesInRange = 0 // weeklyTrend excludes breaks; no per-day break totals available.

    const todayKey = new Date().toISOString().slice(0, 10)
    const minutesToday = toMin((trend.find(d => d.day === todayKey)?.totalSeconds) ?? 0)

    const sessions = trend.reduce((s, d) => s + (d.sessionCount ?? 0), 0)
    const deepWorkSessions = deep.reduce((s, d) => s + (d.blockCount ?? 0), 0)
    const longestSessionMinutes = toMin(Math.max(0, ...trend.map(d => d.totalSeconds ?? 0), 0))

    // Efficiency: focus ÷ (focus + break). With no break totals this floors at 100
    // whenever there is focus; kept for shape parity with Swift's payload.
    const efficiencyPct = focusMinutesInRange + breakMinutesInRange > 0
        ? Math.round((focusMinutesInRange / (focusMinutesInRange + breakMinutesInRange)) * 100)
        : 0

    const daysWithFocus = trend.filter(d => (d.totalSeconds ?? 0) > 0).length
    const consistencyPct = rangeDays > 0 ? Math.round((daysWithFocus / rangeDays) * 100) : 0

    return {
        minutes_today: minutesToday,
        minutes_in_range: focusMinutesInRange,
        break_minutes_in_range: breakMinutesInRange,
        sessions,
        deep_work_sessions: deepWorkSessions,
        longest_session_minutes: longestSessionMinutes,
        efficiency_pct: efficiencyPct,
        consistency_pct: consistencyPct,
        focus_streak_days: currentFocusStreak(trend),
    }
}

/** Consecutive days with focus, counting back from the most recent day present. */
function currentFocusStreak(trend: any[]): number {
    const withFocus = new Set(trend.filter(d => (d.totalSeconds ?? 0) > 0).map(d => d.day))
    let streak = 0
    const cursor = new Date()
    // Allow "today" to be a rest day: begin the walk from yesterday if today is empty.
    if (!withFocus.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1)
    for (;;) {
        const key = cursor.toISOString().slice(0, 10)
        if (!withFocus.has(key)) break
        streak++
        cursor.setDate(cursor.getDate() - 1)
    }
    return streak
}

/* ── Tasks ─────────────────────────────────────────────────────── */

function buildTasks(raw: any): InsightPayloadInputs['tasks'] {
    const tasks: any[] = raw.taskStats ?? []
    const planned = raw.plannedToday ?? { dueToday: 0, completedOfDue: 0 }
    const doneInRange = raw.doneInRange ?? 0
    const todayKey = new Date().toISOString().slice(0, 10)

    const completedToday = tasks.filter(
        t => t.status === 'done' && typeof t.completed_at === 'string' && t.completed_at.slice(0, 10) === todayKey,
    ).length

    const open = tasks.filter(t => t.status !== 'done').length
    const completed = tasks.filter(t => t.status === 'done').length
    const total = tasks.length
    const completionRatePct = total > 0 ? Math.round((completed / total) * 100) : 0

    // Overdue: has a completed-of-due shortfall today (only signal available here).
    const overdue = Math.max(0, (planned.dueToday ?? 0) - (planned.completedOfDue ?? 0))

    const byPriority: Record<string, number> = {}
    for (const t of tasks) {
        if (t.status === 'done') continue
        const key = String(t.priority ?? 'none')
        byPriority[key] = (byPriority[key] ?? 0) + 1
    }

    return {
        completed_today: completedToday,
        completed_in_range: doneInRange,
        open,
        overdue,
        completion_rate_pct: completionRatePct,
        completion_streak_days: 0, // No per-day completion history in the aggregate.
        by_priority: byPriority,
    }
}

/* ── Trend (current window vs previous window) ─────────────────── */

function buildTrend(raw: any, rangeDays: number): InsightPayloadInputs['trend'] {
    const trend: any[] = raw.weeklyTrend ?? []
    // Split the range in half: recent `windowDays` vs the `windowDays` before it.
    const windowDays = Math.max(1, Math.round(rangeDays / 2))
    const now = new Date()
    const currentStart = subDays(now, windowDays).toISOString().slice(0, 10)
    const previousStart = subDays(now, windowDays * 2).toISOString().slice(0, 10)

    const inWindow = (day: string, lo: string, hi: string) => day >= lo && day < hi
    const currentDays = trend.filter(d => d.day >= currentStart)
    const previousDays = trend.filter(d => inWindow(d.day, previousStart, currentStart))

    const sum = (rows: any[], f: (d: any) => number) => rows.reduce((s, d) => s + f(d), 0)

    const curMinutes = sum(currentDays, d => toMin(d.totalSeconds))
    const prevMinutes = sum(previousDays, d => toMin(d.totalSeconds))
    const curSessions = sum(currentDays, d => d.sessionCount ?? 0)
    const prevSessions = sum(previousDays, d => d.sessionCount ?? 0)
    const curDone = countDoneBetween(raw.taskStats ?? [], currentStart)
    const prevDone = countDoneBetween(raw.taskStats ?? [], previousStart, currentStart)

    // Efficiency proxy: with no break totals, use days-active ratio per window.
    const eff = (rows: any[]) => {
        const active = rows.filter(d => (d.totalSeconds ?? 0) > 0).length
        return windowDays > 0 ? Math.round((active / windowDays) * 100) : 0
    }

    return {
        window_days: windowDays,
        focus_minutes: { current: curMinutes, previous: prevMinutes },
        tasks_completed: { current: curDone, previous: prevDone },
        sessions: { current: curSessions, previous: prevSessions },
        efficiency: { current: eff(currentDays), previous: eff(previousDays) },
    }
}

function countDoneBetween(tasks: any[], lo: string, hi?: string): number {
    return tasks.filter(t => {
        if (t.status !== 'done' || typeof t.completed_at !== 'string') return false
        const day = t.completed_at.slice(0, 10)
        return day >= lo && (hi === undefined || day < hi)
    }).length
}

/* ── Weekday / Hour averages ───────────────────────────────────── */

function buildWeekday(weeklyTrend: any[]): InsightPayloadInputs['weekday'] {
    // Average focus minutes per weekday (Sun=0..Sat=6) across the days present.
    const totals: Record<number, number> = {}
    const counts: Record<number, number> = {}
    for (const d of weeklyTrend) {
        if (typeof d.day !== 'string') continue
        const wd = new Date(`${d.day}T00:00:00`).getDay()
        totals[wd] = (totals[wd] ?? 0) + toMin(d.totalSeconds)
        counts[wd] = (counts[wd] ?? 0) + 1
    }
    return Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        avgMinutes: counts[weekday] ? Math.round(totals[weekday] / counts[weekday]) : 0,
    }))
}

function buildHour(peakHours: any[]): InsightPayloadInputs['hour'] {
    // peakHours is total focus seconds per hour across the whole range. We surface
    // it as per-hour minutes (a relative shape); buildInsightPayload drops zeros.
    return (peakHours ?? []).map((r: any) => ({
        hour: r.hour,
        avgMinutes: toMin(r.focusSeconds),
    }))
}

/* ── Attention (from distraction-during-focus) ─────────────────── */

function buildAttention(raw: any): InsightPayloadInputs['attention'] | undefined {
    const focusWindows: any[] = raw.focusWindows ?? []
    const distracting: any[] = raw.distractingSessions ?? []
    const sampleSize = focusWindows.length
    if (sampleSize === 0) return undefined

    // Per-session distraction seconds via overlap.
    const parse = (s: string) => Date.parse(s)
    const overlap = (aS: number, aE: number, bS: number, bE: number) =>
        Math.max(0, Math.min(aE, bE) - Math.max(aS, bS))

    const driftSeconds: number[] = []
    let unbroken = 0
    for (const f of focusWindows) {
        const fs = parse(f.start)
        const fe = parse(f.end)
        if (!(fe > fs)) continue
        let ms = 0
        for (const d of distracting) ms += overlap(fs, fe, parse(d.start), parse(d.end))
        const seconds = Math.round(ms / 1000)
        driftSeconds.push(seconds)
        if (seconds === 0) unbroken++
    }
    if (driftSeconds.length === 0) return undefined

    const medianDriftSeconds = median(driftSeconds)
    return {
        sample_size: driftSeconds.length,
        // First-drift and drifts-per-session need per-event data the aggregate
        // doesn't carry; report 0 rather than invent them.
        median_first_drift_minutes: 0,
        median_drifts_per_session: 0,
        median_drift_seconds: medianDriftSeconds,
        unbroken_sessions: unbroken,
    }
}

function median(nums: number[]): number {
    if (nums.length === 0) return 0
    const sorted = [...nums].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

/* ── Estimates (task estimate accuracy) ────────────────────────── */

function buildEstimates(tasks: any[]): InsightPayloadInputs['estimates'] | undefined {
    const rows = tasks.filter(
        t => t.status === 'done' && t.estimated_minutes && t.actual_seconds && t.actual_seconds > 0,
    )
    if (rows.length === 0) return undefined

    // Variance = (actual − estimate) ÷ estimate. On-target within ±10%.
    const variances: number[] = []
    let onTarget = 0
    let overrun = 0
    let underrun = 0
    for (const t of rows) {
        const estMin = t.estimated_minutes
        const actMin = t.actual_seconds / 60
        const variance = (actMin - estMin) / estMin
        variances.push(Math.round(variance * 100))
        if (variance > 0.1) overrun++
        else if (variance < -0.1) underrun++
        else onTarget++
    }

    return {
        sample_size: rows.length,
        on_target: onTarget,
        overrun,
        underrun,
        median_variance_pct: median(variances),
    }
}

/* ── Activity (only with consent) ──────────────────────────────── */

function buildActivity(raw: any, rangeDays: number): InsightPayloadInputs['activity'] | undefined {
    const appUsage: any[] = raw.appUsage ?? []
    const contextSwitching: any[] = raw.contextSwitching ?? []
    const deep: any[] = raw.deepWorkByDay ?? []
    if (appUsage.length === 0 && contextSwitching.length === 0) return undefined

    // Context switches per hour: total sessions ÷ tracked hours (from durations).
    const totalSwitches = contextSwitching.reduce((s, d) => s + (d.sessionCount ?? 0), 0)
    const trackedSeconds = appUsage.reduce((s, a) => s + Math.max(0, a.totalSeconds ?? 0), 0)
    const trackedHours = Math.max(1, trackedSeconds / 3600)
    const contextSwitchesPerHour = Math.round(totalSwitches / trackedHours)

    // Category share % from app usage (our fixed labels, never app names).
    const byCategory: Record<string, number> = {}
    for (const a of appUsage) {
        const active = Math.max(0, (a.totalSeconds ?? 0) - (a.idleSeconds ?? 0))
        const cat = a.category || 'Other'
        byCategory[cat] = (byCategory[cat] ?? 0) + active
    }
    const totalActive = Object.values(byCategory).reduce((s, v) => s + v, 0)
    const categorySharePct: Record<string, number> = {}
    if (totalActive > 0) {
        for (const [cat, sec] of Object.entries(byCategory)) {
            const share = Math.round((sec / totalActive) * 100)
            if (share > 0) categorySharePct[cat] = share
        }
    }

    // Distinct apps per day: average unique apps across days with context data.
    const days = Math.max(1, contextSwitching.length)
    const distinctAppsPerDay = Math.round(appUsage.length / Math.min(days, rangeDays))

    // Longest unbroken block: the biggest single deep-work day total, in minutes.
    const longestUnbrokenBlockMinutes = toMin(Math.max(0, ...deep.map(d => d.deepSeconds ?? 0), 0))

    // Blocks per focus session: deep-work blocks ÷ focus sessions.
    const focusSessions = (raw.weeklyTrend ?? []).reduce((s: number, d: any) => s + (d.sessionCount ?? 0), 0)
    const deepBlocks = deep.reduce((s, d) => s + (d.blockCount ?? 0), 0)
    const blocksPerFocusSession = focusSessions > 0 ? Math.round(deepBlocks / focusSessions) : 0

    return {
        context_switches_per_hour: contextSwitchesPerHour,
        blocks_per_focus_session: blocksPerFocusSession,
        longest_unbroken_block_minutes: longestUnbrokenBlockMinutes,
        distinct_apps_per_day: distinctAppsPerDay,
        category_share_pct: categorySharePct,
    }
}
