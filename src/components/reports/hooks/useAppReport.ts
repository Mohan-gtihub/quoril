import { useMemo } from 'react'

/* ─── Types ──────────────────────────────────────────────────── */

export interface AppUsageRow {
    appName: string
    category: string
    totalSeconds: number
    idleSeconds: number
    sessionCount: number
}

export interface ContextSwitchDay {
    day: string
    sessionCount: number
    avgDuration: number
    shortSessions: number
    label: 'Deep Work' | 'Balanced' | 'Scattered'
}

export interface ProductivityScore {
    score: number          // 0–100
    focusSeconds: number
    productiveAppSeconds: number
    totalActiveSeconds: number
}

/* ─── Functions ──────────────────────────────────────────────── */

export function overlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
    return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
}

export function computeDistractionDuringFocus(
    focusWindows: { start: string; end: string }[],
    distractingSessions: { start: string; end: string }[],
): { distractionSeconds: number; focusSeconds: number; pct: number } {
    let distractionMs = 0
    let focusMs = 0
    for (const f of focusWindows) {
        const fs = Date.parse(f.start)
        const fe = Date.parse(f.end)
        if (!(fe > fs)) continue
        focusMs += fe - fs
        for (const d of distractingSessions) {
            distractionMs += overlapMs(fs, fe, Date.parse(d.start), Date.parse(d.end))
        }
    }
    const focusSeconds = Math.round(focusMs / 1000)
    const distractionSeconds = Math.round(distractionMs / 1000)
    const pct = focusSeconds > 0 ? Math.round((distractionSeconds / focusSeconds) * 100) : 0
    return { distractionSeconds, focusSeconds, pct }
}

/* ─── Hook ───────────────────────────────────────────────────── */

export function useAppReport(
    appUsage: AppUsageRow[],
    contextSwitching: any[],
    focusSummarySeconds: number,
    productiveAppSecondsRow: { productiveAppSeconds: number } | null,
    allAppSecondsRow: { totalSeconds: number; idleSeconds: number } | null,
    focusWindows: { start: string; end: string }[] = [],
    distractingSessions: { start: string; end: string }[] = [],
    distractionActiveSeconds: number = 0,
    distractionByCategory: { category: string; activeSeconds: number }[] = [],
) {
    // Top 10 apps by active time
    const topApps = useMemo(() => {
        return appUsage
            .map(a => ({
                ...a,
                activeSeconds: Math.max(0, a.totalSeconds - a.idleSeconds),
            }))
            .sort((a, b) => b.activeSeconds - a.activeSeconds)
            .slice(0, 10)
    }, [appUsage])

    // Category breakdown
    const categoryBreakdown = useMemo(() => {
        const map: Record<string, number> = {}
        appUsage.forEach(a => {
            const cat = a.category || 'Other'
            map[cat] = (map[cat] ?? 0) + Math.max(0, a.totalSeconds - a.idleSeconds)
        })
        return Object.entries(map)
            .map(([category, seconds]) => ({ category, seconds }))
            .sort((a, b) => b.seconds - a.seconds)
    }, [appUsage])

    // Idle vs active ratio
    const idleRatio = useMemo(() => {
        const total = allAppSecondsRow?.totalSeconds ?? 0
        const idle = allAppSecondsRow?.idleSeconds ?? 0
        return total > 0 ? Math.round((idle / total) * 100) : 0
    }, [allAppSecondsRow])

    // Productivity Score
    const productivityScore = useMemo((): ProductivityScore => {
        const focusSec = focusSummarySeconds
        const prodAppSec = productiveAppSecondsRow?.productiveAppSeconds ?? 0
        const totalActive = Math.max(1, (allAppSecondsRow?.totalSeconds ?? 0) - (allAppSecondsRow?.idleSeconds ?? 0))
        const productive = focusSec + prodAppSec
        const score = Math.min(100, Math.round((productive / totalActive) * 100))
        return {
            score: isNaN(score) ? 0 : score,
            focusSeconds: focusSec,
            productiveAppSeconds: prodAppSec,
            totalActiveSeconds: totalActive,
        }
    }, [focusSummarySeconds, productiveAppSecondsRow, allAppSecondsRow])

    // Context Switching per day with classification
    const contextByDay = useMemo((): ContextSwitchDay[] => {
        return (contextSwitching ?? []).map(row => {
            const count = row.sessionCount ?? 0
            const label: ContextSwitchDay['label'] =
                count <= 20 ? 'Deep Work' :
                    count <= 60 ? 'Balanced' : 'Scattered'
            return {
                day: row.day,
                sessionCount: count,
                avgDuration: Math.round(row.avgDuration ?? 0),
                shortSessions: row.shortSessions ?? 0,
                label,
            }
        })
    }, [contextSwitching])

    const avgDailySwitches = useMemo(() => {
        if (contextByDay.length === 0) return 0
        return Math.round(contextByDay.reduce((s, d) => s + d.sessionCount, 0) / contextByDay.length)
    }, [contextByDay])

    const distractionDuringFocus = useMemo(
        () => computeDistractionDuringFocus(focusWindows, distractingSessions),
        [focusWindows, distractingSessions],
    )

    // Overall distraction — distracting active time as a share of total active
    // (non-idle) time across the whole range. Timer-independent, so it stays
    // meaningful even when the user never runs a focus session.
    const distractionOverall = useMemo(() => {
        const totalActive = Math.max(0, (allAppSecondsRow?.totalSeconds ?? 0) - (allAppSecondsRow?.idleSeconds ?? 0))
        const distractingSeconds = Math.max(0, distractionActiveSeconds)
        const pct = totalActive > 0 ? Math.min(100, Math.round((distractingSeconds / totalActive) * 100)) : 0
        const byCategory = distractionByCategory
            .map(c => ({ category: c.category, seconds: Math.max(0, c.activeSeconds) }))
            .filter(c => c.seconds > 0)
            .sort((a, b) => b.seconds - a.seconds)
        return { distractingSeconds, totalActiveSeconds: totalActive, pct, byCategory }
    }, [allAppSecondsRow, distractionActiveSeconds, distractionByCategory])

    return {
        topApps,
        categoryBreakdown,
        idleRatio,
        productivityScore,
        contextByDay,
        avgDailySwitches,
        distractionDuringFocus,
        distractionOverall,
    }
}
