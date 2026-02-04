// useTimerDisplay.ts
import { useState, useEffect } from 'react'
import { useFocusStore } from '@/store/focusStore'

/**
 * Custom hook to derive a real-time timer display for the current focus session.
 * - Shows elapsed, remaining time, and progress.
 * - Updates every second when session is active.
 * - Uses FocusStore.elapsed as the single source of truth for base time.
 */
export function useTimerDisplay() {
    const isActive = useFocusStore(s => s.isActive)
    const isPaused = useFocusStore(s => s.isPaused)
    const startTime = useFocusStore(s => s.startTime)
    const storeElapsed = useFocusStore(s => s.elapsed)
    const duration = useFocusStore(s => s.duration)
    const taskId = useFocusStore(s => s.taskId)

    // Tick state to force re-render every second
    const [, setTick] = useState(0)

    // When session is running, tick every second
    useEffect(() => {
        if (!isActive || isPaused || startTime == null) return
        const id = setInterval(() => setTick(t => t + 1), 1000)
        return () => clearInterval(id)
    }, [isActive, isPaused, startTime])

    // Display elapsed time:
    // - Use storeElapsed (DB + backup totals) as base
    // - Add live delta if session is running
    const liveDelta =
        isActive && !isPaused && startTime != null
            ? Math.floor((Date.now() - startTime) / 1000)
            : 0

    const elapsed = storeElapsed + liveDelta

    // Remaining time, progress, overtime
    const totalSeconds = duration
    const remainingTime = totalSeconds - elapsed
    const isOvertime = duration > 0 && remainingTime < 0
    const progress =
        duration > 0 && totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0

    return {
        isActive,
        isPaused,
        taskId,
        duration,
        elapsed,
        remainingTime,
        isOvertime,
        progress,
        totalSeconds,
    }
}
