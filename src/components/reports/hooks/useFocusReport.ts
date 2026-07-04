import { useMemo } from 'react'

/* ─── Constants ──────────────────────────────────────────────── */

/** Penalty in seconds per interruption when calculating focus quality */
export const INTERRUPT_PENALTY_SECONDS = 30

/** Minimum uninterrupted seconds for a focus session to count as deep work (25 min). */
export const DEEP_WORK_MIN_SECONDS = 1500

/* ─── Pure Functions ─────────────────────────────────────────── */

export function buildPeakHours(
    rows: { hour: number; focusSeconds: number }[],
): { hour: number; minutes: number; isPeak: boolean }[] {
    const bySec: Record<number, number> = {}
    rows.forEach(r => { bySec[r.hour] = (bySec[r.hour] ?? 0) + r.focusSeconds })
    const bins = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        minutes: Math.round((bySec[hour] ?? 0) / 60),
        isPeak: false,
    }))
    const maxMin = Math.max(0, ...bins.map(b => b.minutes))
    if (maxMin > 0) {
        const peak = bins.find(b => b.minutes === maxMin)
        if (peak) peak.isPeak = true
    }
    return bins
}

export function computeDeepWorkTotals(
    rows: { deepSeconds: number; blockCount: number }[],
): { hours: number; blocks: number } {
    const seconds = rows.reduce((s, r) => s + (r.deepSeconds ?? 0), 0)
    const blocks = rows.reduce((s, r) => s + (r.blockCount ?? 0), 0)
    return { hours: Math.round((seconds / 3600) * 10) / 10, blocks }
}

export function mergeDeepWorkTrend(
    trendByDay: { day: string; focusMinutes: number }[],
    deepWorkByDay: { day: string; deepSeconds: number }[],
): { day: string; focusMinutes: number; deepMinutes: number }[] {
    const deepMap: Record<string, number> = {}
    deepWorkByDay.forEach(d => { deepMap[d.day] = Math.round((d.deepSeconds ?? 0) / 60) })
    return trendByDay.map(t => ({
        day: t.day,
        focusMinutes: t.focusMinutes,
        deepMinutes: deepMap[t.day] ?? 0,
    }))
}

/* ─── Types ─────────────────────────────────────────────────── */

export interface FocusSummary {
    totalSeconds: number
    sessionCount: number
    avgSeconds: number
    breakCount: number
}

export interface WeeklyTrendDay {
    day: string
    totalSeconds: number
    sessionCount: number
    focusMinutes: number
}

export interface FocusQualityDay {
    day: string
    qualityScore: number   // 0–100
    focusSeconds: number
    interruptions: number
}

/* ─── Hook ───────────────────────────────────────────────────── */

export function useFocusReport(
    focusSummary: FocusSummary | null,
    weeklyTrend: any[],
    targetDays: string[],  // array of 'yyyy-MM-dd' for the selected range
    deepWorkByDay: { day: string; deepSeconds: number; blockCount: number }[] = [],
    peakHours: { hour: number; focusSeconds: number }[] = [],
) {
    // Fill missing days with zeros → gapless chart
    const trendByDay = useMemo(() => {
        const map: Record<string, WeeklyTrendDay> = {}
        weeklyTrend.forEach(row => {
            map[row.day] = {
                day: row.day,
                totalSeconds: row.totalSeconds,
                sessionCount: row.sessionCount,
                focusMinutes: Math.round(row.totalSeconds / 60),
            }
        })
        return targetDays.map(day => map[day] ?? {
            day,
            totalSeconds: 0,
            sessionCount: 0,
            focusMinutes: 0,
        }) as WeeklyTrendDay[]
    }, [weeklyTrend, targetDays])

    // 7-day moving average of focus minutes
    const movingAvg = useMemo(() => {
        return trendByDay.map((_, i) => {
            const slice = trendByDay.slice(Math.max(0, i - 6), i + 1)
            const avg = slice.reduce((s, d) => s + d.focusMinutes, 0) / slice.length
            return Math.round(avg * 10) / 10
        })
    }, [trendByDay])

    // Today's summary helpers
    const todayMinutes = useMemo(() => Math.round((focusSummary?.totalSeconds ?? 0) / 60), [focusSummary])
    const avgMinutes = useMemo(() => Math.round((focusSummary?.avgSeconds ?? 0) / 60), [focusSummary])

    // Focus quality per day (using sessionCount as interruption proxy)
    const qualityByDay = useMemo((): FocusQualityDay[] => {
        return trendByDay.map(d => {
            const interruptions = d.sessionCount > 1 ? d.sessionCount - 1 : 0
            const penalty = interruptions * INTERRUPT_PENALTY_SECONDS
            const quality = d.totalSeconds > 0
                ? Math.round((d.totalSeconds / (d.totalSeconds + penalty)) * 100)
                : 0
            return { day: d.day, qualityScore: quality, focusSeconds: d.totalSeconds, interruptions }
        })
    }, [trendByDay])

    const bestDay = useMemo(() => qualityByDay.reduce((a, b) => b.qualityScore > a.qualityScore ? b : a, qualityByDay[0] ?? { day: '-', qualityScore: 0, focusSeconds: 0, interruptions: 0 }), [qualityByDay])
    const worstDay = useMemo(() => {
        // Seed from the FILTERED list — seeding with qualityByDay[0] (which may be
        // an excluded 0-focus day with qualityScore 0) made that day always "win".
        const withFocus = qualityByDay.filter(d => d.focusSeconds > 0)
        if (withFocus.length === 0) return { day: '-', qualityScore: 100, focusSeconds: 0, interruptions: 0 }
        return withFocus.reduce((a, b) => b.qualityScore < a.qualityScore ? b : a, withFocus[0])
    }, [qualityByDay])

    const deepWorkTotals = useMemo(() => computeDeepWorkTotals(deepWorkByDay), [deepWorkByDay])
    const peakHourBins = useMemo(() => buildPeakHours(peakHours), [peakHours])
    const focusTrend = useMemo(() => mergeDeepWorkTrend(trendByDay, deepWorkByDay), [trendByDay, deepWorkByDay])

    return {
        trendByDay,
        movingAvg,
        todayMinutes,
        avgMinutes,
        qualityByDay,
        bestDay,
        worstDay,
        deepWorkTotals,
        peakHourBins,
        focusTrend,
    }
}
