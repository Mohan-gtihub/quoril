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
    const {
        isActive,
        isPaused,
        startTime,
        elapsed: storeElapsed,
        duration,
        taskId,
        isBreak,
        breakElapsed,
        breakRemainingAtStart,
        pomodoroRemaining,
        pomodoroTotal
    } = useFocusStore()

    // Tick state to force re-render every second
    const [, setTick] = useState(0)

    // When session is running (or in break), tick every second
    useEffect(() => {
        // Tick if (active AND !paused) OR (isBreak AND !paused)
        // Since isPaused now reflects the *current mode's* state, we just check !isPaused
        if (!isActive || isPaused || startTime == null) return
        const id = setInterval(() => setTick(t => t + 1), 1000)
        return () => clearInterval(id)
    }, [isActive, isPaused, startTime])

    // Display elapsed time:
    const liveDelta =
        isActive && !isPaused && startTime != null
            ? Math.floor((Date.now() - startTime) / 1000)
            : 0

    // If Break: Main task elapsed is FROZEN at storeElapsed
    // If Task: Main task elapsed = storeElapsed + liveDelta
    const elapsed = isBreak ? storeElapsed : (storeElapsed + liveDelta)

    // Remaining time, progress, overtime
    const totalSeconds = duration
    const remainingTime = totalSeconds - elapsed
    const isOvertime = duration > 0 && remainingTime < 0
    const progress =
        duration > 0 && totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0

    return {
        isActive,
        isPaused,
        isBreak,
        taskId,
        duration,
        elapsed,
        remainingTime,
        isOvertime,
        progress,
        totalSeconds,
        breakRemaining: isBreak
            ? Math.max(0, breakRemainingAtStart - (breakElapsed + liveDelta))
            : 0,
        breakRemainingAtStart,
        pomodoroRemaining: isBreak ? 0 : pomodoroRemaining,
        pomodoroTotal
    }
}
