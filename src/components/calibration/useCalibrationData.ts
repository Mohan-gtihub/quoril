import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { platform } from '@/services/platform'
import type { TaskRow } from '@/components/reports/hooks/useTaskReport'

/**
 * Fetches the finished-task history that calibration reads from. Mirrors the
 * Reports dashboard IPC call, but scoped to just the task rows we need.
 *
 * Calibration is inherently a lifetime picture — the more finished, timed tasks
 * the better the pattern — so unlike Reports it isn't windowed to a date range.
 * The dashboard query returns all non-deleted tasks regardless of the from/to
 * dates (only focus/app rows are range-filtered), so any range works here; we
 * simply pass a wide one.
 */
export function useCalibrationData(retryKey = 0): {
    tasks: TaskRow[]
    loading: boolean
    error: string | null
    /** false on web / when app tracking (local DB) isn't available. */
    available: boolean
} {
    const { user } = useAuthStore()
    const [tasks, setTasks] = useState<TaskRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const available = platform.capabilities.appTracking

    useEffect(() => {
        if (!user?.id) { setLoading(false); return }
        if (!available) { setLoading(false); return }

        setLoading(true)
        setError(null)

        const endDate = new Date().toISOString()
        // Wide start so every finished task is included (task rows aren't
        // range-filtered by the dashboard query, but we pass a sane window).
        const startDate = new Date('2000-01-01').toISOString()

        window.electronAPI?.reports?.getDashboardData({ userId: user.id, startDate, endDate })
            .then((data: any) => {
                setTasks((data?.taskStats ?? []) as TaskRow[])
                setLoading(false)
            })
            .catch((err: any) => {
                console.error('[Calibration] IPC error', err)
                setError('Failed to load calibration data.')
                setLoading(false)
            })
    }, [user?.id, available, retryKey])

    return { tasks, loading, error, available }
}
