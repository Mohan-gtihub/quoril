import { useMemo } from 'react'

/* ─── Types ─────────────────────────────────────────────────── */

export interface TaskRow {
    id: string
    title: string
    status: string
    estimated_minutes: number | null
    actual_seconds: number | null
    completed_at: string | null
    created_at: string
    is_recurring: number
    last_reset_date: string | null
    list_id: string | null
}

export interface EstimationEntry {
    id: string
    title: string
    estimatedMin: number
    actualMin: number
    accuracyPct: number   // min(est,actual) / max(est,actual) × 100 → always 0-100
    over: boolean         // true = overestimated, false = underestimated
}

export interface RecurringEntry {
    id: string
    title: string
    isCompleted: boolean
    lastReset: string | null
    streak: number
}

/* ─── Hook ───────────────────────────────────────────────────── */

export function useTaskReport(tasks: TaskRow[]) {
    // Completion basics
    const total = useMemo(() => tasks.length, [tasks])
    const completed = useMemo(() => tasks.filter(t => t.status === 'done').length, [tasks])
    const completionRate = useMemo(() => total > 0 ? Math.round((completed / total) * 100) : 0, [completed, total])

    // Overdue: due_at (not in current schema, use completed_at == null && status != done as proxy)
    const inProgress = useMemo(() => tasks.filter(t => t.status !== 'done' && t.status !== 'todo').length, [tasks])
    const todo = useMemo(() => tasks.filter(t => t.status === 'todo').length, [tasks])

    // Estimation accuracy (only tasks with both values)
    const estimationData = useMemo((): EstimationEntry[] => {
        return tasks
            .filter(t => t.status === 'done' && t.estimated_minutes && t.actual_seconds && t.actual_seconds > 0)
            .map(t => {
                const estMin = t.estimated_minutes!
                const actMin = t.actual_seconds! / 60
                const accuracyPct = Math.round((Math.min(estMin, actMin) / Math.max(estMin, actMin)) * 100)
                return {
                    id: t.id,
                    title: t.title,
                    estimatedMin: Math.round(estMin),
                    actualMin: Math.round(actMin),
                    accuracyPct,
                    over: estMin > actMin,
                }
            })
            .sort((a, b) => a.accuracyPct - b.accuracyPct)  // worst accuracy first
    }, [tasks])

    const overallAccuracy = useMemo(() => {
        if (estimationData.length === 0) return null
        const avg = estimationData.reduce((s, e) => s + e.accuracyPct, 0) / estimationData.length
        return Math.round(avg)
    }, [estimationData])

    const mostUnderestimated = useMemo(() => estimationData.filter(e => !e.over).slice(0, 5), [estimationData])
    const mostOverestimated = useMemo(() => estimationData.filter(e => e.over).slice(0, 5), [estimationData])

    // Recurring tasks
    const recurringData = useMemo((): RecurringEntry[] => {
        return tasks
            .filter(t => t.is_recurring === 1)
            .map(t => {
                const isCompleted = t.status === 'done'
                return {
                    id: t.id,
                    title: t.title,
                    isCompleted,
                    lastReset: t.last_reset_date,
                    streak: isCompleted ? 1 : 0,   // True streak needs history; use 1/0 for now
                }
            })
    }, [tasks])

    const recurringCompletedCount = useMemo(() => recurringData.filter(r => r.isCompleted).length, [recurringData])

    return {
        total,
        completed,
        inProgress,
        todo,
        completionRate,
        estimationData,
        overallAccuracy,
        mostUnderestimated,
        mostOverestimated,
        recurringData,
        recurringCompletedCount,
    }
}
