import { Task } from '@/types/database'
import { backupService } from '@/services/backupService'

/**
 * Returns the total actual seconds spent on a task, handling legacy data.
 * Checks local backup for crash resilience (returns Max(DB, Backup)).
 */
export const getTaskTotalActual = (task: Task | null | undefined, includeLive: boolean = false): number => {
    if (!task) return 0

    // Ensure base is integer (use spent_s from DB)
    const baseSeconds = Math.floor(task.spent_s || 0)

    // Only include live delta if requested (legacy or non-focus calculation)
    let liveDelta = 0
    if (includeLive && task.started_at) {
        liveDelta = Math.floor((Date.now() - new Date(task.started_at).getTime()) / 1000)
    }

    const backupValue = backupService.get(task.id) || 0
    // Return integer to prevent floating-point values in DB
    return Math.floor(Math.max(baseSeconds + liveDelta, backupValue))
}

/**
 * Robustly hydrates the base elapsed time for a task from DB + Backup.
 * This is used as the "Starting Point" before adding live deltas.
 */
export const hydrateElapsed = (task: Task | null | undefined): number => {
    if (!task) return 0
    // Ensure integer return value
    return Math.floor(getTaskTotalActual(task, false))
}

export const getTaskEstimate = (task: Task | null | undefined): number => {
    if (!task) return 25 * 60
    const minutes = task.estimated_minutes || 0
    return minutes > 0 ? minutes * 60 : 25 * 60
}

export const calculateRemainingSeconds = (task: Task | null | undefined, activeElapsedSeconds: number = 0): number => {
    if (!task) return 25 * 60

    const estimate = getTaskEstimate(task)
    // If activeElapsedSeconds is 0, we check if the task has a live 'started_at' to include.
    // This provides resilience for skips and restarts.
    const includeLive = activeElapsedSeconds === 0
    const storedActual = getTaskTotalActual(task, includeLive)
    const totalActual = Math.floor(storedActual + activeElapsedSeconds)

    // Return integer to prevent floating-point values
    return Math.floor(estimate - totalActual)
}

/**
 * @deprecated Use calculateRemainingSeconds instead for better clarity
 */
export const calculateSessionDuration = (task: Task): number => {
    return Math.max(0, calculateRemainingSeconds(task, 0))
}
