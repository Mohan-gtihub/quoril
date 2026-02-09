import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'

import type { FocusSession } from '@/types/database'

import { localService } from '@/services/localStorage'
import { backupService } from '@/services/backupService'
import { audioService } from '@/services/audioService'
import { hydrateElapsed, getTaskEstimate } from '@/utils/sessionUtils'
import { useTaskStore } from './taskStore'
import { useSettingsStore } from './settingsStore'
import { useListStore } from './listStore'

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type SessionType =
    | 'regular'
    | 'deep_work'
    | 'quick_sprint'
    | 'pomodoro'
    | 'focus'
    | 'break'
    | 'long_break'

export interface FocusState {
    /* Current Session */
    currentSessionId: string | null
    taskId: string | null

    isActive: boolean
    isPaused: boolean

    startTime: number | null // ms
    elapsed: number // seconds (accumulated)

    duration: number // seconds (goal)

    sessionType: SessionType

    showFocusPanel: boolean

    /* Celebration State */
    showCelebration: boolean
    celebratedTask: any | null
    celebratedDuration: number

    /* History */
    sessions: FocusSession[]
    loading: boolean

    /* Pomodoro / Break State */
    isBreak: boolean
    breakRemaining: number // seconds (live)
    breakElapsed: number // seconds (accumulated break time)
    breakRemainingAtStart: number // seconds (base for delta)
    pomodoroRemaining: number // seconds (live)
    pomodoroRemainingAtStart: number // seconds (base for delta)
    pomodoroTotal: number // seconds (progress denominator)
    lastAlertTime: number | null // ms

    /* Actions */
    startSession: (
        taskId: string,
        duration?: number,
        type?: SessionType
    ) => Promise<void>

    startFocus: (taskId: string) => Promise<void>

    startBreak: (durationMinutes?: number) => void
    stopBreak: () => void

    pauseSession: (updateStatus?: boolean) => Promise<void>
    resumeSession: () => Promise<void>

    endSession: (
        notes?: string,
        focusScore?: number,
        energyLevel?: number,
        shouldClosePanel?: boolean,
        markCompleted?: boolean
    ) => Promise<void>

    dismissCelebration: () => void

    skipToNext: (nextTaskId?: string) => Promise<void>

    syncTimer: () => void

    fetchSessions: () => Promise<void>

    reset: () => void

    setShowFocusPanel: (v: boolean) => void

    updateRemainingTime: (newSeconds: number) => void
}

/* ---------------------------------------------
   STORE
--------------------------------------------- */

export const useFocusStore = create<FocusState>()(
    persist(
        (set, get) => ({
            /* ---------------- STATE ---------------- */
            currentSessionId: null,
            taskId: null,

            isActive: false,
            isPaused: false,

            startTime: null,
            elapsed: 0,

            duration: 25 * 60,

            sessionType: 'regular',
            showFocusPanel: false,

            showCelebration: false,
            celebratedTask: null,
            celebratedDuration: 0,

            sessions: [],
            loading: false,

            isBreak: false,
            breakRemaining: 0,
            breakElapsed: 0,
            breakRemainingAtStart: 0,
            pomodoroRemaining: 0,
            pomodoroRemainingAtStart: 0,
            pomodoroTotal: 25 * 60,
            lastAlertTime: null,

            /* ---------------- START ---------------- */

            startFocus: async (taskId: string) => {
                await get().startSession(taskId)
            },

            startBreak: (durationMinutes) => {
                const state = get()
                // CHECKPOINT: Save current task progress if active
                if (state.isActive && !state.isPaused && state.startTime) {
                    const delta = Math.floor((Date.now() - state.startTime) / 1000)
                    const total = state.elapsed + delta
                    set({ elapsed: total })
                }

                const settings = useSettingsStore.getState()
                const mins = durationMinutes ?? settings.defaultBreakLength
                const seconds = mins * 60

                set({
                    isBreak: true,
                    breakRemaining: seconds,
                    breakRemainingAtStart: seconds,
                    breakElapsed: 0,
                    startTime: Date.now(),
                    lastAlertTime: Date.now(),
                    isPaused: false // Explicitly running
                })
            },

            stopBreak: async () => {
                const s = get()
                // CHECKPOINT: Save break progress
                if (s.startTime) {
                    const delta = Math.floor((Date.now() - s.startTime) / 1000)
                    const totalBreak = s.breakElapsed + delta

                    try {
                        // LOG THE BREAK SESSION
                        const user = (await localService.auth.getUser()).data?.user
                        if (user) {
                            // 1. Log Session
                            await localService.focus.create({
                                user_id: user.id,
                                task_id: s.taskId,
                                start_time: new Date(Date.now() - (totalBreak * 1000)).toISOString(),
                                end_time: new Date().toISOString(),
                                planned_seconds: s.breakRemainingAtStart,
                                session_type: 'break',
                                actual_seconds: totalBreak,
                            })

                            // 2. Create Completed Task (Artifact) for Kanban Board
                            const { selectedListId } = useListStore.getState()
                            // Fallback to first list if 'all' or null
                            let targetListId = selectedListId === 'all' ? null : selectedListId
                            if (!targetListId) {
                                const allLists = useListStore.getState().lists
                                if (allLists.length > 0) targetListId = allLists[0].id
                            }

                            if (targetListId) {
                                await useTaskStore.getState().createTask({
                                    title: "Recovery Break - " + Math.round(totalBreak / 60) + "m",
                                    list_id: targetListId,
                                    actual_seconds: totalBreak,
                                    estimated_minutes: Math.ceil(s.breakRemainingAtStart / 60),
                                    completed_at: new Date().toISOString() // Mark as completed
                                }, 'done') // Pass 'done' column explicitly
                            }
                        }
                    } catch (e) {
                        console.error('[Focus] break log failed', e)
                    }
                }

                const settings = useSettingsStore.getState()
                const pTime = settings.pomodorosEnabled ? 25 * 60 : 0

                set({
                    isBreak: false,
                    isPaused: true, // Safety: Pause main task, let user resume
                    startTime: null, // Clear timer ref
                    pomodoroRemaining: pTime,
                    pomodoroRemainingAtStart: pTime,
                    pomodoroTotal: pTime,
                    breakElapsed: 0
                })
            },

            startSession: async (taskId, duration, type = 'regular') => {
                try {
                    const state = get()
                    const settings = useSettingsStore.getState()

                    if (state.isActive) {
                        await state.endSession()
                    }

                    const task = useTaskStore.getState().tasks.find(t => t.id === taskId)
                    if (!task) return

                    const now = Date.now()
                    const previous = hydrateElapsed(task)
                    const goal = duration ?? getTaskEstimate(task)
                    const pTime = settings.pomodorosEnabled ? 25 * 60 : 0

                    await useTaskStore.getState().startTask(taskId)

                    set({
                        currentSessionId: null,
                        taskId,
                        isActive: true,
                        isPaused: false,
                        startTime: now,
                        elapsed: previous,
                        duration: goal,
                        sessionType: type,
                        showFocusPanel: true,
                        isBreak: false,
                        pomodoroTotal: pTime,
                        pomodoroRemaining: pTime,
                        pomodoroRemainingAtStart: pTime,
                        breakRemaining: 0,
                        breakRemainingAtStart: 0,
                        lastAlertTime: now,
                        // Clear celebration if starting new
                        showCelebration: false,
                        celebratedTask: null,
                        celebratedDuration: 0
                    })

                    const user = (await localService.auth.getUser()).data?.user
                    if (!user) return

                    const { data } = await localService.focus.create({
                        user_id: user.id,
                        task_id: taskId,
                        start_time: new Date(now).toISOString(),
                        planned_seconds: goal,
                        session_type: type,
                        actual_seconds: 0,
                        end_time: null,
                    })

                    if (data) {
                        set({ currentSessionId: data.id })
                    }
                } catch (e) {
                    console.error('[Focus] start failed', e)
                }
            },

            /* ---------------- PAUSE ---------------- */

            pauseSession: async (updateStatus = true) => {
                const s = get()
                if (!s.startTime) return // Nothing running

                const delta = Math.floor((Date.now() - s.startTime) / 1000)

                if (s.isBreak) {
                    // Update BREAK elapsed
                    const totalBreak = s.breakElapsed + delta
                    set({ breakElapsed: totalBreak, startTime: null, isPaused: true })
                } else {
                    // Update TASK elapsed
                    const total = s.elapsed + delta
                    const pRem = s.pomodoroRemainingAtStart - delta

                    if (s.taskId) {
                        if (updateStatus) {
                            await useTaskStore.getState().updateTask(s.taskId, { status: 'paused', actual_seconds: total, started_at: null })
                        } else {
                            await useTaskStore.getState().updateTask(s.taskId, { actual_seconds: total })
                        }
                        backupService.save(s.taskId, total)
                    }

                    set({
                        elapsed: total,
                        startTime: null,
                        isPaused: true,
                        pomodoroRemaining: Math.max(0, pRem),
                        pomodoroRemainingAtStart: Math.max(0, pRem)
                    })
                }
            },

            /* ---------------- RESUME ---------------- */

            resumeSession: async () => {
                const s = get()

                // Reset start time to NOW for whichever mode is active
                set({ startTime: Date.now(), isPaused: false })

                if (!s.isBreak && s.taskId) {
                    await useTaskStore.getState().startTask(s.taskId)
                }
            },

            /* ---------------- END ---------------- */

            endSession: async (notes, focusScore, energyLevel, shouldClosePanel = true, markCompleted = false) => {
                const s = get()
                if (!s.taskId) {
                    get().reset()
                    return
                }

                try {
                    const delta = s.startTime ? Math.floor((Date.now() - s.startTime) / 1000) : 0
                    const total = s.elapsed + delta
                    const endISO = new Date().toISOString()

                    // Close Focus Session Record
                    if (s.currentSessionId) {
                        await localService.focus.update(s.currentSessionId, {
                            end_time: endISO,
                            actual_seconds: delta,
                            notes: notes ?? null,
                            focus_score: focusScore ?? null,
                            energy_level: energyLevel ?? null,
                        })
                    }

                    // Update Task
                    const task = useTaskStore.getState().tasks.find(t => t.id === s.taskId)
                    if (task) {
                        const updates: any = {
                            actual_seconds: total,
                            started_at: null // Ensure backend knows it's stopped
                        }

                        if (markCompleted) {
                            updates.status = 'done'
                            updates.completed_at = endISO
                            // Cache for celebration before clearing
                            set({
                                showCelebration: true,
                                celebratedTask: task,
                                celebratedDuration: total
                            })
                            // Play sound
                            const { successSoundEnabled } = useSettingsStore.getState()
                            if (successSoundEnabled) audioService.playSuccess()
                        }

                        await useTaskStore.getState().updateTask(s.taskId, updates)
                    }

                    set({
                        currentSessionId: null,
                        taskId: null,
                        isActive: false,
                        isPaused: false,
                        startTime: null,
                        elapsed: 0,
                        showFocusPanel: shouldClosePanel ? false : s.showFocusPanel,
                        isBreak: false,
                        pomodoroRemaining: 0,
                        breakRemaining: 0
                    })
                    await get().fetchSessions()
                } catch (e) {
                    console.error('[Focus] end failed', e)
                    get().reset()
                }
            },

            dismissCelebration: () => {
                set({
                    showCelebration: false,
                    celebratedTask: null,
                    celebratedDuration: 0,
                    showFocusPanel: false // Close panel when dismissed
                })
            },

            /* ---------------- SKIP ---------------- */

            skipToNext: async (nextId) => {
                const s = get()
                if (s.isActive) await s.endSession()
                if (nextId) await get().startSession(nextId)
            },

            /* ---------------- TIMER ---------------- */

            syncTimer: () => {
                const s = get()
                if (!s.isActive || !s.startTime) return

                const delta = Math.floor((Date.now() - s.startTime) / 1000)

                if (s.isBreak) {
                    const rem = Math.max(0, s.breakRemainingAtStart - delta)
                    set({ breakRemaining: rem })

                    // STOP AT ZERO (Don't go negative, Don't auto-stop)
                    if (rem === 0 && s.breakRemainingAtStart > 0) {
                        set({
                            breakRemaining: 0,
                            breakElapsed: s.breakRemainingAtStart, // Cap at max
                            isPaused: true, // "Wait for me"
                            startTime: null // Stop ticking
                        })
                        toast("Break complete! Resume work or take more time.", { icon: '🔔' })
                    }
                } else {
                    if (useSettingsStore.getState().pomodorosEnabled) {
                        const rem = Math.max(0, s.pomodoroRemainingAtStart - delta)
                        set({ pomodoroRemaining: rem })
                        if (rem === 0 && s.pomodoroRemainingAtStart > 0) {
                            get().startBreak()
                            toast("Focus session complete! Take a break.", { icon: '☕' })
                        }
                    }

                    const total = s.elapsed + delta
                    if (s.taskId) backupService.save(s.taskId, total)

                    // ALERT LOGIC
                    const settings = useSettingsStore.getState()
                    if (settings.timedAlertsEnabled && s.lastAlertTime) {
                        const intervalMs = settings.alertInterval * 60 * 1000
                        if (Date.now() - s.lastAlertTime >= intervalMs) {
                            audioService.playAlert()
                            set({ lastAlertTime: Date.now() })
                        }
                    }
                }
            },

            /* ---------------- HISTORY ---------------- */

            fetchSessions: async () => {
                try {
                    set({ loading: true })
                    const { data, error } = await localService.focus.list()
                    if (error) throw error
                    set({ sessions: data ?? [], loading: false })
                } catch {
                    set({ loading: false })
                }
            },

            /* ---------------- UI ---------------- */

            reset: () => {
                set({
                    currentSessionId: null,
                    taskId: null,
                    isActive: false,
                    isPaused: false,
                    startTime: null,
                    elapsed: 0,
                    showFocusPanel: false,
                    isBreak: false,
                    pomodoroRemaining: 0,
                    breakRemaining: 0,
                    showCelebration: false,
                    celebratedTask: null,
                    celebratedDuration: 0
                })
            },

            setShowFocusPanel: (v) => set({ showFocusPanel: v }),

            updateRemainingTime: (newSeconds) => {
                const s = get()
                if (!s.isActive || s.isBreak) return

                // When we edit the timer, we're adjusting how much time has "elapsed"
                // so that the display shows the desired time.
                // Display logic: remainingTime = duration - elapsed
                // So: elapsed = duration - newRemainingTime

                // If it's a stopwatch (duration 0), remainingTime is -elapsed
                // formatTime displays abs(remainingTime)
                if (s.duration === 0) {
                    set({ elapsed: newSeconds })
                } else {
                    // For countdown timers
                    set({ elapsed: s.duration - newSeconds })
                }
            },
        }),
        {
            name: 'focus-storage',
            partialize: (s) => ({
                currentSessionId: s.currentSessionId,
                taskId: s.taskId,
                isActive: s.isActive,
                isPaused: s.isPaused,
                // DO NOT persist startTime - it should be set fresh on resume
                elapsed: s.elapsed,
                duration: s.duration,
                sessionType: s.sessionType,
                showFocusPanel: s.showFocusPanel,
                isBreak: s.isBreak,
                breakRemaining: s.breakRemaining,
                breakElapsed: s.breakElapsed,
                breakRemainingAtStart: s.breakRemainingAtStart,
                pomodoroRemaining: s.pomodoroRemaining,
                pomodoroRemainingAtStart: s.pomodoroRemainingAtStart,
                pomodoroTotal: s.pomodoroTotal
            }),
        }
    )
)
