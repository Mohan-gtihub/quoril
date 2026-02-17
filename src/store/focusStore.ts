import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'

import type { FocusSession } from '@/types/database'

import { localService } from '@/services/localStorage'
import { backupService } from '@/services/backupService'
import { soundService } from '@/services/soundService'
import { hydrateElapsed, getTaskEstimate } from '@/utils/sessionUtils'
import { sanitizeSessionData, mapSessionTypeToDB } from '@/utils/dataValidation'
import { useTaskStore } from './taskStore'
import { useSettingsStore } from './settingsStore'

/* ---------------------------------------------
   CONSTANTS
--------------------------------------------- */


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
    lastAlertElapsed: number // seconds (at which last alert played)

    /* Actions */
    startSession: (
        taskId: string,
        duration?: number,
        type?: SessionType
    ) => Promise<void>

    startFocus: (taskId: string) => Promise<void>

    startBreak: (durationMinutes?: number) => Promise<void>
    stopBreak: () => Promise<void>

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

    clearHistory: () => Promise<void>
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

            duration: 1500, // 25 min default
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
            pomodoroTotal: 1500,
            lastAlertElapsed: 0,

            /* ---------------- START ---------------- */

            startFocus: async (taskId: string) => {
                await get().startSession(taskId)
            },

            startBreak: async (durationMinutes) => {
                const state = get() // Fresh state

                // CRITICAL FIX: If a session is active, we MUST pause it to close the DB record
                // before starting the break state. Otherwise we leave open sessions.
                if (state.isActive && !state.isPaused) {
                    // updateStatus=false because we're just pausing for a break, maybe don't want to visually 'Pause' the task card?
                    // Actually, if we are in break, the task IS paused. So true is correct.
                    // But maybe we want the task card to show "Break"? 
                    // For now, let's just pause properly to save data.
                    await get().pauseSession(true)
                }

                // Re-get state after await
                // Re-get state after await

                const settings = useSettingsStore.getState()
                const mins = durationMinutes ?? settings.defaultBreakLength
                const seconds = mins * 60
                const now = Date.now()

                set({
                    isBreak: true,
                    breakRemaining: seconds,
                    breakRemainingAtStart: seconds,
                    breakElapsed: 0,
                    startTime: now,
                    lastAlertElapsed: 0,
                    isPaused: false, // Break is "running"

                    // Reset pomodoro start tracker so we don't double-fire
                    pomodoroRemainingAtStart: 0
                })
            },

            stopBreak: async () => {
                const s = get()

                // CRITICAL FIX: Accumulate correctly. 
                // totalBreak = accumulated (breakElapsed) + current session delta
                let totalBreak = s.breakElapsed
                if (s.startTime) {
                    const delta = Math.floor((Date.now() - s.startTime) / 1000)
                    totalBreak += delta
                }

                // Only log if we actually took a break
                if (totalBreak > 0) {
                    try {
                        const user = (await localService.auth.getUser()).data?.user
                        if (user) {
                            // CRITICAL FIX: Calculate accurate start time based on total duration
                            // This accounts for multiple pause/resume cycles during break
                            const accurateStartTime = new Date(Date.now() - (totalBreak * 1000)).toISOString()

                            const sessionData = sanitizeSessionData({
                                user_id: user.id,
                                task_id: s.taskId, // Associate with current task if any
                                start_time: accurateStartTime,
                                end_time: new Date().toISOString(),
                                planned_seconds: s.breakRemainingAtStart,
                                session_type: 'break',
                                seconds: totalBreak,
                            })
                            await localService.focus.create(sessionData)

                            // FIX: Removed "Recovery Break" task creation to avoid pollution
                        }
                    } catch (e) {
                        console.error('[Focus] break log failed', e)
                    }
                }

                const settings = useSettingsStore.getState()
                const pLength = (settings.pomodoroLength || 25) * 60
                const pTime = settings.pomodorosEnabled ? pLength : 0

                set({
                    isBreak: false,
                    isPaused: true, // Return to paused state for the task
                    startTime: null,
                    pomodoroRemaining: pTime,
                    pomodoroRemainingAtStart: pTime,
                    pomodoroTotal: pTime,
                    breakElapsed: 0
                })
            },

            startSession: async (taskId, duration, type = 'regular') => {
                try {
                    // CRITICAL FIX: Set state AFTER basic validation but BEFORE async DB ops?
                    // Actually, we want to set state Optimistically, but ensure consistency.
                    // The issue was setting isActive=true then failing.

                    const state = get()
                    if (state.isActive) {
                        await state.endSession()
                    }

                    const task = useTaskStore.getState().tasks.find(t => t.id === taskId)
                    if (!task) return

                    const now = Date.now()
                    const previous = hydrateElapsed(task)
                    const goal = duration ?? getTaskEstimate(task)

                    const settings = useSettingsStore.getState()
                    const pLength = (settings.pomodoroLength || 25) * 60
                    const pTime = settings.pomodorosEnabled ? pLength : 0

                    await useTaskStore.getState().startTask(taskId)

                    // Optimistic UI Update first
                    set({
                        currentSessionId: null, // Reset ID until DB responding
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
                        lastAlertElapsed: previous,
                        showCelebration: false,
                        celebratedTask: null,
                        celebratedDuration: 0
                    })

                    // Then Background DB Sync
                    try {
                        const user = (await localService.auth.getUser()).data?.user
                        if (user) {
                            const sessionData = sanitizeSessionData({
                                user_id: user.id,
                                task_id: taskId,
                                start_time: new Date(now).toISOString(),
                                planned_seconds: goal,
                                session_type: type,
                                seconds: 0,
                                end_time: null,
                            })
                            const { data } = await localService.focus.create(sessionData)

                            if (data) {
                                // If store is still active on same task, set ID
                                // Use functional set to check current state matches
                                set(s => (s.taskId === taskId && s.isActive ? { currentSessionId: data.id } : {}))
                            }
                        }
                    } catch (e) {
                        console.error('[Focus] Failed to create session record', e)
                        // Don't kill the UI session, just run locally? 
                        // Or warn user? behavior: generic error logging for now.
                    }

                    window.electronAPI.tracker.setContext(taskId)
                } catch (e) {
                    console.error('[Focus] start failed', e)
                }
            },

            /* ---------------- PAUSE ---------------- */

            pauseSession: async (updateStatus = true) => {
                const s = get()
                if (!s.startTime) return

                const delta = Math.floor((Date.now() - s.startTime) / 1000)
                const endISO = new Date().toISOString()
                const startISO = new Date(s.startTime).toISOString()

                if (s.isBreak) {
                    const totalBreak = s.breakElapsed + delta
                    set({ breakElapsed: totalBreak, startTime: null, isPaused: true })
                } else {
                    const total = s.elapsed + delta
                    const pRem = s.pomodoroRemainingAtStart - delta

                    // Close Database Session
                    if (s.currentSessionId) {
                        try {
                            const sessionUpdateData = sanitizeSessionData({
                                end_time: endISO,
                                seconds: delta,
                            })
                            await localService.focus.update(s.currentSessionId, sessionUpdateData)

                            // Optimistic Update
                            const dbType = mapSessionTypeToDB(s.sessionType)
                            const newSession: FocusSession = {
                                id: s.currentSessionId,
                                user_id: '',
                                task_id: s.taskId,
                                type: dbType,
                                seconds: delta,
                                start_time: startISO,
                                end_time: endISO,
                                created_at: startISO,
                                synced: 0,
                                metadata: null
                            }

                            set(state => ({
                                sessions: [newSession, ...state.sessions.filter(fs => fs.id !== newSession.id)]
                            }))
                        } catch (e) {
                            console.error("Failed to close session on pause", e)
                        }
                    }

                    // Update Task
                    if (s.taskId) {
                        const updates: any = { actual_seconds: total }
                        if (updateStatus) updates.status = 'paused'

                        await useTaskStore.getState().updateTask(s.taskId, updates)

                        // Fix: Removed duplicate backupService.save call (already handled in task update + below)
                    }

                    set({
                        elapsed: total,
                        startTime: null,
                        isPaused: true,
                        pomodoroRemaining: Math.max(0, pRem),
                        pomodoroRemainingAtStart: Math.max(0, pRem),
                        currentSessionId: null
                    })

                    // No fetchSessions() here (Race condition fix)
                }
            },

            /* ---------------- RESUME ---------------- */

            resumeSession: async () => {
                const s = get()
                const now = Date.now()

                // CRITICAL FIX: Handle Race Condition
                // 1. Fetch User first (async)
                // 2. Then set state (sync)
                // 3. Then create DB record

                let userId: string | null = null
                try {
                    const userData = await localService.auth.getUser()
                    if (userData.data?.user) userId = userData.data.user.id
                } catch (e) { console.error('Auth check failed on resume', e) }

                // State update: immediate
                set({ startTime: now, isPaused: false })

                // Logic
                if (!s.isBreak && s.taskId) {
                    await useTaskStore.getState().startTask(s.taskId)

                    if (userId) {
                        const sessionData = sanitizeSessionData({
                            user_id: userId,
                            task_id: s.taskId,
                            start_time: new Date(now).toISOString(),
                            planned_seconds: s.duration,
                            session_type: s.sessionType,
                            seconds: 0,
                            end_time: null,
                        })

                        try {
                            const { data } = await localService.focus.create(sessionData)
                            if (data) {
                                // Check if still same session context
                                set(curr => (curr.taskId === s.taskId && !curr.isPaused ? { currentSessionId: data.id } : {}))
                            }
                        } catch (e) {
                            console.error("Failed to create resumed session", e)
                        }
                    }
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
                    // Capture total BEFORE resetting state
                    const total = s.elapsed + delta

                    const endISO = new Date().toISOString()
                    const startISO = s.startTime ? new Date(s.startTime).toISOString() : endISO

                    if (s.currentSessionId) {
                        const sessionUpdateData = sanitizeSessionData({
                            end_time: endISO,
                            seconds: delta,
                            notes: notes ?? null,
                            focus_score: focusScore ?? null,
                            energy_level: energyLevel ?? null,
                        })
                        await localService.focus.update(s.currentSessionId, sessionUpdateData)

                        const dbType = mapSessionTypeToDB(s.sessionType)
                        const newSession: FocusSession = {
                            id: s.currentSessionId,
                            user_id: '',
                            task_id: s.taskId,
                            type: dbType,
                            seconds: delta,
                            start_time: startISO,
                            end_time: endISO,
                            created_at: startISO,
                            synced: 0,
                            metadata: JSON.stringify({
                                notes: notes ?? null,
                                focus_score: focusScore ?? null,
                                energy_level: energyLevel ?? null
                            })
                        }

                        set(state => ({
                            sessions: [newSession, ...state.sessions.filter(fs => fs.id !== newSession.id)]
                        }))
                    }

                    const task = useTaskStore.getState().tasks.find(t => t.id === s.taskId)
                    if (task) {
                        const taskUpdates: any = {
                            actual_seconds: total,
                            started_at: null
                        }

                        if (markCompleted) {
                            taskUpdates.status = 'done'
                            taskUpdates.completed_at = endISO

                            // Celebration State must be set BEFORE reset()
                            set({
                                showCelebration: true,
                                celebratedTask: task, // This is 'any' type in state, technically Task
                                celebratedDuration: total
                            })

                            const { successSoundEnabled, successSound } = useSettingsStore.getState()
                            if (successSoundEnabled) soundService.playSuccess(successSound)
                        }

                        await useTaskStore.getState().updateTask(s.taskId, taskUpdates)
                    }

                    // Reset State
                    set({
                        currentSessionId: null,
                        taskId: null,
                        isActive: false,
                        isPaused: false,
                        startTime: null,
                        elapsed: 0, // Reset AFTER usage
                        showFocusPanel: shouldClosePanel ? false : s.showFocusPanel,
                        isBreak: false,
                        pomodoroRemaining: 0,
                        breakRemaining: 0
                    })

                    window.electronAPI.tracker.setContext(null)
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
                    showFocusPanel: false
                })
            },

            skipToNext: async (nextId) => {
                const s = get()
                if (s.isActive) await s.endSession()
                if (nextId) await get().startSession(nextId)
            },

            /* ---------------- TIMER ---------------- */

            syncTimer: () => {
                const s = get()
                if (!s.isActive || !s.startTime || s.isPaused) return

                const activeTask = useTaskStore.getState().tasks.find(t => t.id === s.taskId)
                if (activeTask && activeTask.status === 'done') {
                    get().endSession()
                    return
                }

                const now = Date.now()
                const delta = Math.floor((now - s.startTime) / 1000)

                // BREAK MODE
                if (s.isBreak) {
                    const rem = Math.max(0, s.breakRemainingAtStart - delta)
                    set({ breakRemaining: rem })

                    if (rem === 0 && s.breakRemainingAtStart > 0) {
                        set({
                            breakRemaining: 0,
                            breakElapsed: s.breakRemainingAtStart,
                            isPaused: true,
                            startTime: null
                        })
                        toast("Break complete!", { icon: '🔔' })
                    }
                    return // EXIT early
                }

                // FOCUS MODE
                if (useSettingsStore.getState().pomodorosEnabled) {
                    const rem = Math.max(0, s.pomodoroRemainingAtStart - delta)

                    // Logic Check: Did we just hit 0?
                    if (rem === 0 && s.pomodoroRemainingAtStart > 0 && s.pomodoroRemaining > 0) {
                        set({ pomodoroRemaining: 0 }) // Sync update

                        // Trigger Break
                        toast("Focus session complete! Take a break.", { icon: '☕' })
                        get().startBreak()
                        return // EXIT to avoid double-process
                    }

                    set({ pomodoroRemaining: rem })
                }

                const total = s.elapsed + delta
                if (s.taskId) backupService.save(s.taskId, total)

                // ALERTS
                const settings = useSettingsStore.getState()
                if (settings.timedAlertsEnabled) {
                    const currentElapsed = s.elapsed + delta
                    const intervalSeconds = settings.alertInterval * 60

                    if (currentElapsed >= s.lastAlertElapsed + intervalSeconds) {
                        soundService.playAlert(settings.alertSound)
                        toast("Stay Focused! 🎯", { icon: '⚡' })
                        set({ lastAlertElapsed: currentElapsed })
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

            clearHistory: async () => {
                // 1. Delete all sessions from DB
                await localService.focus.deleteAll()

                // 2. Clear all task times (Fix for "dirty actual_seconds")
                await useTaskStore.getState().resetAllTaskTimes()

                // 3. Reset Local State
                set({
                    sessions: [],
                    elapsed: 0,
                    taskId: null,
                    currentSessionId: null,
                    isActive: false,
                    startTime: null
                })
            },

            updateRemainingTime: (newSeconds: number) => {
                const s = get()
                if (!s.isActive || s.isBreak) return
                if (s.duration === 0) {
                    set({ elapsed: newSeconds })
                } else {
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
                // do not persist startTime
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
            onRehydrateStorage: () => (state) => {
                // Rehydration Fix: If active but no startTime, we must pause.
                if (state && state.isActive && !state.startTime && !state.isPaused) {
                    state.isPaused = true
                    // state.isActive = true (keep active so user knows they were in a task)
                }
            }
        }
    )
)
