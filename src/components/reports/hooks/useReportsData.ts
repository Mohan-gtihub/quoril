import { useState, useEffect, useMemo } from 'react'
import { eachDayOfInterval, format, startOfDay, endOfDay, subDays } from 'date-fns'
import { useAuthStore } from '@/store/authStore'
import { useFocusReport } from './useFocusReport'
import { useTaskReport } from './useTaskReport'
import { useAppReport } from './useAppReport'
import type { DateRange } from '../components/ReportsDatePicker'

/* ─── Default range ──────────────────────────────────────────── */

export function getLast7DaysRange(): DateRange {
    const end = endOfDay(new Date())
    const start = startOfDay(subDays(end, 6))
    return { startDate: start, endDate: end, label: 'Last 7 days' }
}

/* ─── Root Hook ──────────────────────────────────────────────── */

export function useReportsData(range: DateRange) {
    const { user } = useAuthStore()
    const [raw, setRaw] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const startDate = useMemo(() => range.startDate.toISOString(), [range.startDate])
    const endDate = useMemo(() => range.endDate.toISOString(), [range.endDate])
    const days = useMemo(() =>
        eachDayOfInterval({ start: range.startDate, end: range.endDate })
            .map(d => format(d, 'yyyy-MM-dd')),
        [range.startDate, range.endDate]
    )

    useEffect(() => {
        if (!user?.id) { setLoading(false); return }

        setLoading(true)
        setError(null)

        window.electronAPI?.reports?.getDashboardData({ userId: user.id, startDate, endDate })
            .then((data: any) => {
                setRaw(data)
                setLoading(false)
            })
            .catch((err: any) => {
                console.error('[Reports] IPC error', err)
                setError('Failed to load report data.')
                setLoading(false)
            })
    }, [user?.id, startDate, endDate])

    /* ── Sub-hooks ─────────────────────────────────────────────── */

    const focusReport = useFocusReport(
        raw?.focusSummary ?? null,
        raw?.weeklyTrend ?? [],
        days,
    )

    const taskReport = useTaskReport(raw?.taskStats ?? [])

    const appReport = useAppReport(
        raw?.appUsage ?? [],
        raw?.contextSwitching ?? [],
        raw?.focusSummary?.totalSeconds ?? 0,
        raw?.productiveAppSeconds ?? null,
        raw?.allAppSeconds ?? null,
    )

    const workspaceStats: any[] = useMemo(() => raw?.workspaceStats ?? [], [raw])

    return {
        loading,
        error,
        days,
        focusReport,
        taskReport,
        appReport,
        workspaceStats,
        focusSummary: raw?.focusSummary ?? null,
    }
}
