import { useMemo } from 'react'

/* ─── Constants ─────────────────────────────────────────────── */

const PRODUCTIVE_CATEGORIES = ['Development', 'Work', 'Coding', 'Programming']

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

/* ─── Hook ───────────────────────────────────────────────────── */

export function useAppReport(
    appUsage: AppUsageRow[],
    contextSwitching: any[],
    focusSummarySeconds: number,
    productiveAppSecondsRow: { productiveAppSeconds: number } | null,
    allAppSecondsRow: { totalSeconds: number; idleSeconds: number } | null,
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

    return {
        topApps,
        categoryBreakdown,
        idleRatio,
        productivityScore,
        contextByDay,
        avgDailySwitches,
    }
}
