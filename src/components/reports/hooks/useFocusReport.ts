import { useMemo } from 'react'

/* ─── Constants ──────────────────────────────────────────────── */

/** Penalty in seconds per interruption when calculating focus quality */
export const INTERRUPT_PENALTY_SECONDS = 30

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
    targetDays: string[]  // array of 'yyyy-MM-dd' for the selected range
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
    const worstDay = useMemo(() => qualityByDay.filter(d => d.focusSeconds > 0).reduce((a, b) => b.qualityScore < a.qualityScore ? b : a, qualityByDay[0] ?? { day: '-', qualityScore: 100, focusSeconds: 0, interruptions: 0 }), [qualityByDay])

    return {
        trendByDay,
        movingAvg,
        todayMinutes,
        avgMinutes,
        qualityByDay,
        bestDay,
        worstDay,
    }
}
