import { useState, useEffect, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { platform } from '@/services/platform'

/* ─── Types ──────────────────────────────────────────────── */

export interface HourlyBucket {
    hour: number
    totalSeconds: number
    uniqueApps: number
}

export interface AppEntry {
    appName: string
    category: string
    totalSeconds: number
    sessionCount: number
    firstSeen: string
    lastSeen: string
}

export interface CategoryEntry {
    category: string
    totalSeconds: number
    appCount: number
}

export interface DomainEntry {
    domain: string
    category: string
    totalSeconds: number
    sessionCount: number
}

export interface WeeklyDay {
    day: string
    totalSeconds: number
    uniqueApps: number
    sessionCount: number
}

export interface TimelineEntry {
    appName: string
    category: string
    startTime: string
    endTime: string
    durationSeconds: number
    windowTitle: string
}

export interface DayTotals {
    totalScreenTime: number
    totalApps: number
    totalSessions: number
    longestSession: number
}

export interface ProductivityBucket {
    bucket: 'productive' | 'unproductive' | 'neutral'
    totalSeconds: number
}

export interface ScreenTimeData {
    loading: boolean
    trackingAvailable: boolean
    /** Window titles + website/domain detail (macOS Accessibility / non-mac desktop). */
    detailAvailable: boolean
    date: string
    setDate: (d: string) => void
    hourly: HourlyBucket[]
    apps: AppEntry[]
    categories: CategoryEntry[]
    domains: DomainEntry[]
    weekly: WeeklyDay[]
    timeline: TimelineEntry[]
    totals: DayTotals
    productivity: ProductivityBucket[]
    peakHour: number
    avgDailySeconds: number
    todayVsAvg: number // percentage: +20 means 20% above average
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useScreenTimeData(): ScreenTimeData {
    const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
    const [raw, setRaw] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [trackingAvailable, setTrackingAvailable] = useState(platform.capabilities.appTracking)
    const [detailAvailable, setDetailAvailable] = useState(platform.capabilities.appTracking)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        Promise.resolve(platform.screenTime.isTrackingAvailable())
            .then(async (available) => {
                if (cancelled) return
                setTrackingAvailable(available)
                Promise.resolve(platform.screenTime.isDetailTrackingAvailable())
                    .then((detail) => { if (!cancelled) setDetailAvailable(detail) })
                    .catch(() => { if (!cancelled) setDetailAvailable(false) })
                if (!available) {
                    setRaw(null)
                    setLoading(false)
                    return
                }
                const data = await platform.screenTime.getData({ date })
                if (cancelled) return
                setRaw(data)
                setLoading(false)
            })
            .catch((err: any) => {
                if (cancelled) return
                console.error('[ScreenTime] Failed:', err)
                setTrackingAvailable(false)
                setLoading(false)
            })
        return () => { cancelled = true }
    }, [date])

    // Refresh every 30s for live updates
    useEffect(() => {
        if (!trackingAvailable) return
        const today = format(new Date(), 'yyyy-MM-dd')
        if (date !== today) return
        const interval = setInterval(() => {
            platform.screenTime.getData({ date })
                .then((data: any) => setRaw(data))
                .catch(() => {})
        }, 30000)
        return () => clearInterval(interval)
    }, [date, trackingAvailable])

    const hourly = useMemo((): HourlyBucket[] => {
        const map: Record<number, HourlyBucket> = {}
        for (let h = 0; h < 24; h++) map[h] = { hour: h, totalSeconds: 0, uniqueApps: 0 }
        ;(raw?.hourlyBreakdown ?? []).forEach((r: any) => {
            map[r.hour] = { hour: r.hour, totalSeconds: r.totalSeconds ?? 0, uniqueApps: r.uniqueApps ?? 0 }
        })
        return Object.values(map).sort((a, b) => a.hour - b.hour)
    }, [raw])

    const apps = useMemo((): AppEntry[] => raw?.appBreakdown ?? [], [raw])
    const categories = useMemo((): CategoryEntry[] => raw?.categoryTotals ?? [], [raw])
    const domains = useMemo((): DomainEntry[] => raw?.domainBreakdown ?? [], [raw])
    const weekly = useMemo((): WeeklyDay[] => {
        // Fill in missing days with zeros
        const map: Record<string, WeeklyDay> = {}
        for (let i = 6; i >= 0; i--) {
            const d = format(subDays(new Date(date + 'T12:00:00'), i), 'yyyy-MM-dd')
            map[d] = { day: d, totalSeconds: 0, uniqueApps: 0, sessionCount: 0 }
        }
        ;(raw?.weeklyTrend ?? []).forEach((r: any) => {
            if (map[r.day]) map[r.day] = r
        })
        return Object.values(map)
    }, [raw, date])
    const timeline = useMemo((): TimelineEntry[] => raw?.appTimeline ?? [], [raw])
    const totals = useMemo((): DayTotals => raw?.dayTotals ?? { totalScreenTime: 0, totalApps: 0, totalSessions: 0, longestSession: 0 }, [raw])
    const productivity = useMemo((): ProductivityBucket[] => raw?.productivitySplit ?? [], [raw])

    const peakHour = useMemo(() => {
        const max = hourly.reduce((best, h) => h.totalSeconds > best.totalSeconds ? h : best, hourly[0])
        return max?.hour ?? 0
    }, [hourly])

    const avgDailySeconds = useMemo(() => {
        // Exclude the selected day itself so "vs average" compares against the
        // OTHER days, not an average that already includes the value being compared.
        const days = weekly.filter(d => d.day !== date && d.totalSeconds > 0)
        if (days.length === 0) return 0
        return Math.round(days.reduce((s, d) => s + d.totalSeconds, 0) / days.length)
    }, [weekly, date])

    const todayVsAvg = useMemo(() => {
        if (avgDailySeconds === 0) return 0
        return Math.round(((totals.totalScreenTime - avgDailySeconds) / avgDailySeconds) * 100)
    }, [totals.totalScreenTime, avgDailySeconds])

    return {
        loading,
        trackingAvailable,
        detailAvailable,
        date,
        setDate,
        hourly,
        apps,
        categories,
        domains,
        weekly,
        timeline,
        totals,
        productivity,
        peakHour,
        avgDailySeconds,
        todayVsAvg,
    }
}
