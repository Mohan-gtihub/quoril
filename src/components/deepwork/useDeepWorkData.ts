import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { platform } from '@/services/platform'
import { buildPeakHours } from '@/components/reports/hooks/useFocusReport'
import type { DateRange } from '@/components/reports/components/ReportsDatePicker'
import {
    computeAttentionSpan, topFocusTasks, bestDeepWorkHour,
    type FocusWindow, type TaskFocusRow,
} from './deepWorkMetrics'

/**
 * Dedicated Deep Work data hook. Reuses the same `reports.getDashboardData` IPC
 * as the Reports screen, but exposes the raw slices this screen needs
 * (focusWindows for the attention-span histogram, full taskFocus, peakHours,
 * deepWorkByDay) rather than the pre-digested Reports view models.
 */
export function useDeepWorkData(range: DateRange, retryKey = 0) {
    const { user } = useAuthStore()
    const [raw, setRaw] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const startDate = useMemo(() => range.startDate.toISOString(), [range.startDate])
    const endDate = useMemo(() => range.endDate.toISOString(), [range.endDate])

    useEffect(() => {
        if (!user?.id) { setLoading(false); return }
        setLoading(true)
        setError(null)

        if (!platform.capabilities.appTracking) {
            // Web build: no app-tracking IPC. Deep Work depends on focus-session
            // windows from the desktop DB, so resolve empty.
            setRaw(null)
            setLoading(false)
            return
        }

        window.electronAPI?.reports?.getDashboardData({ userId: user.id, startDate, endDate })
            .then((data: any) => { setRaw(data); setLoading(false) })
            .catch((err: any) => {
                console.error('[DeepWork] IPC error', err)
                setError('Failed to load deep work data.')
                setLoading(false)
            })
    }, [user?.id, startDate, endDate, retryKey])

    const focusWindows: FocusWindow[] = raw?.focusWindows ?? []
    const taskFocus: TaskFocusRow[] = raw?.taskFocus ?? []
    const deepWorkByDay: { day: string; deepSeconds: number; blockCount: number }[] = raw?.deepWorkByDay ?? []

    const attention = useMemo(() => computeAttentionSpan(focusWindows), [raw])
    const tasks = useMemo(() => topFocusTasks(taskFocus), [raw])
    const peakBins = useMemo(() => buildPeakHours(raw?.peakHours ?? []), [raw])
    const bestHour = useMemo(() => bestDeepWorkHour(peakBins), [peakBins])

    // Headline totals across the range.
    const totals = useMemo(() => {
        const deepSeconds = deepWorkByDay.reduce((s, d) => s + (d.deepSeconds ?? 0), 0)
        const blocks = deepWorkByDay.reduce((s, d) => s + (d.blockCount ?? 0), 0)
        return {
            hours: Math.round((deepSeconds / 3600) * 10) / 10,
            deepSeconds,
            blocks,
            longestMinutes: attention.longestMinutes,
        }
    }, [deepWorkByDay, attention])

    // Per-day trend, filled so an all-zero range still charts a flat baseline.
    const trend = useMemo(() =>
        deepWorkByDay.map(d => ({
            day: d.day,
            deepMinutes: Math.round((d.deepSeconds ?? 0) / 60),
            blocks: d.blockCount ?? 0,
        })),
        [deepWorkByDay])

    const hasData = totals.blocks > 0 || attention.sampleSize > 0

    return { loading, error, attention, tasks, peakBins, bestHour, totals, trend, hasData }
}
