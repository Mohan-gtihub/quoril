import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'

import type { FocusSession } from '@/types/database'

import { localService } from '@/services/localStorage'
import { backupService } from '@/services/backupService'
import { soundService } from '@/services/soundService'
import { hydrateElapsed, getTaskEstimate, shouldFireOvertimeAlert } from '@/utils/sessionUtils'

/**
 * Dedicated sound for timer lifecycle transitions (time's-up / overtime,
 * break-over, pomodoro→break) — distinct from the interval "stay focused" nag,
 * which uses the user's configured alertSound. Swap this one value to change it.
 */
const LIFECYCLE_ALERT_SOUND = 'sonar'
import { sanitizeSessionData, mapSessionTypeToDB } from '@/utils/dataValidation'
import { useTaskStore } from './taskStore'
import { useSettingsStore } from './settingsStore'
import { platform } from '@/services/platform'
import { analytics } from '@/services/analytics'

/* ---------------------------------------------
   CONSTANTS
--------------------------------------------- */

/**
 * Focus notification — shows inline inside the Super Focus pill (so it never
 * overlaps the floating pill window) and falls back to a normal toast when the
 * full app UI is visible. Also fires a native OS notification (outside the app)
 * so the user is alerted even when the app isn't the focused window.
 */
function focusNotify(message: string) {
    // Native OS notification (no-op on web / when unavailable).
    platform.notifications.show('Quoril', message)

    const inSuperFocus = useSettingsStore.getState().superFocusMode
    if (inSuperFocus) {
        useFocusStore.setState({ focusFlash: message })
        setTimeout(() => {
            if (useFocusStore.getState().focusFlash === message) {
                useFocusStore.setState({ focusFlash: null })
            }
        }, 2600)
    } else {
        toast(message)
    }
}

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
    sessionStartedAt: number | null // ms — wall-clock when the CURRENT sitting began; survives pause/resume, cleared on end. Anchors live per-session stats.
    sessionBaseElapsed: number // seconds — `elapsed` at the moment this sitting began, so focused-this-session = elapsed - sessionBaseElapsed

    duration: number // seconds (goal)

    sessionType: SessionType

    showFocusPanel: boolean

    /* Celebration State */
    showCelebration: boolean
    celebratedTask: import('@/types/database').Task | null
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
    overtimeAlerted: boolean // whether the "time's up" alert already fired for the current countdown
    focusFlash: string | null // transient reminder text shown inline in the Super Focus pill
    lastTickTime: number | null // ms (wall-clock of last syncTimer tick; sleep detection)
    completedPomodoros: number // count of focus pomodoros completed in the current cycle (long-break cadence)
    isLongBreak: boolean // whether the active break is a long break

    /* Actions */
    startSession: (
        taskId: string,
        duration?: number,
        type?: SessionType
    ) => Promise<void>

    startFocus: (taskId: string) => Promise<void>

    startBreak: (durationMinutes?: number, opts?: { auto?: boolean }) => Promise<void>
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

    syncTimer: () => Promise<void>

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
            sessionStartedAt: null,
            sessionBaseElapsed: 0,

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
            overtimeAlerted: false,
            focusFlash: null,
            lastTickTime: null,
            completedPomodoros: 0,
            isLongBreak: false,

            /* ---------------- START ---------------- */

            startFocus: async (taskId: string) => {
                await get().startSession(taskId)
            },

            startBreak: async (durationMinutes, opts) => {
                const state = get() // Fresh state

                // CRITICAL FIX: If a session is active, we MUST pause it to close the DB record
                // before starting the break state. Otherwise we leave open sessions.
                if (state.isActive && !state.isPaused) {
                    await get().pauseSession(true)
                }

                const settings = useSettingsStore.getState()

                // Long-break cadence: when a focus pomodoro auto-completes, count it
                // and switch to a long break every Nth completion (C3). Manual breaks
                // (explicit duration, not auto) don't advance the cycle.
                let completed = get().completedPomodoros
                let isLong = false
                if (opts?.auto) {
                    completed += 1
                    const cadence = Math.max(1, settings.pomodorosUntilLongBreak || 4)
                    isLong = completed % cadence === 0
                }

                const defaultMins = isLong
                    ? (settings.longBreakLength || 20)
                    : settings.defaultBreakLength
                const mins = durationMinutes ?? defaultMins
                const seconds = mins * 60
                const now = Date.now()

                set({
                    isBreak: true,
                    isLongBreak: isLong,
                    completedPomodoros: completed,
                    breakRemaining: seconds,
                    breakRemainingAtStart: seconds,
                    breakElapsed: 0,
                    startTime: now,
                    lastTickTime: now,
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
                                session_type: s.isLongBreak ? 'long_break' : 'break',
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
                    isLongBreak: false,
                    isPaused: s.isActive && !!s.taskId,
                    startTime: null,
                    lastTickTime: null,
                    pomodoroRemaining: pTime,
                    pomodoroRemainingAtStart: pTime,
                    pomodoroTotal: pTime,
                    breakElapsed: 0
                })

                if (s.isActive && s.taskId) {
                    await get().resumeSession()
                }
            },

            startSession: async (taskId, duration, type = 'regular') => {
                try {
                    // CRITICAL FIX: Set state AFTER basic validation but BEFORE async DB ops?
                    // Actually, we want to set state Optimistically, but ensure consistency.
                    // The issue was setting isActive=true then failing.

                    const state = get()

                    // FIX: Prevent double-start / double-logging for the same task
                    if (state.isActive && state.taskId === taskId && !state.isPaused) {
                        return
                    }

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
                        sessionStartedAt: now,
                        sessionBaseElapsed: previous,
                        breakElapsed: 0,
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
                        overtimeAlerted: false,
                        lastTickTime: now,
                        showCelebration: false,
                        celebratedTask: null,
                        celebratedDuration: 0
                    })

                    // Emitted after the double-start / missing-task guards above,
                    // so this counts real starts only.
                    analytics.track('focus.started', {
                        durationMinutes: Math.round(goal / 60),
                        type,
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
                                set(s => (s.taskId === taskId && s.isActive ? { currentSessionId: data.id } : {}))
                            }
                        }
                        platform.tracker.setContext(taskId)
                    } catch (e) {
                        console.error('[Focus] Failed to create session record', e)
                    }
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
                    set({ breakElapsed: totalBreak, startTime: null, isPaused: true, lastTickTime: null })
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
                            // Surface the failure: the segment's time may not have
                            // been persisted, so the user gets a signal instead of
                            // silently losing tracked time (L5).
                            toast.error("Couldn't save this focus segment. Your time may be incomplete.")
                        }
                    }

                    // Update Task
                    if (s.taskId) {
                        // Clear started_at so the task stops accruing live wall-clock
                        // time while paused. Without this, getTaskTotalActual(..., true)
                        // keeps counting from started_at and the "pause" never actually
                        // stops the clock (matches endSession / tasks.pause semantics).
                        const updates: any = { actual_seconds: total, started_at: null }
                        if (updateStatus) updates.status = 'paused'

                        // Persist defensively: a failed cloud write (RLS/schema
                        // rejection surfaces as a thrown null from updateTask) must
                        // not abort the pause. We still apply the paused UI state
                        // below so the timer actually stops for the user (L5).
                        try {
                            await useTaskStore.getState().updateTask(s.taskId, updates)
                        } catch (e) {
                            console.error('[Focus] Failed to persist paused task state', e)
                        }
                    }

                    set({
                        elapsed: total,
                        startTime: null,
                        isPaused: true,
                        pomodoroRemaining: Math.max(0, pRem),
                        pomodoroRemainingAtStart: Math.max(0, pRem),
                        currentSessionId: null,
                        lastTickTime: null
                    })

                    // No fetchSessions() here (Race condition fix)
                }
            },

            /* ---------------- RESUME ---------------- */

            resumeSession: async () => {
                const before = get()
                const now = Date.now()

                let userId: string | null = null
                try {
                    const userData = await localService.auth.getUser()
                    if (userData.data?.user) userId = userData.data.user.id
                } catch (e) { console.error('Auth check failed on resume', e) }

                // M5: The user may have paused/switched tasks during the await above.
                // Re-read fresh state and abort if the resume context no longer holds
                // (different task, or already running) so we never create a session
                // record against a stale task snapshot.
                const s = get()
                if (s.taskId !== before.taskId || (s.isActive && !s.isPaused)) {
                    return
                }

                // State update: immediate
                set({ startTime: now, isPaused: false, lastTickTime: now })

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
                        breakRemaining: 0,
                        lastTickTime: null
                    })

                    // ACTIVATION EVENT. `total` is the task's cumulative time
                    // across all sittings; the time focused in THIS session is
                    // measured from sessionBaseElapsed (the value of `elapsed`
                    // when this sitting began). Falls back to `total` if the
                    // session was rehydrated without that anchor.
                    const sessionSeconds = s.sessionStartedAt !== null
                        ? Math.max(0, total - s.sessionBaseElapsed)
                        : total
                    analytics.track('focus.completed', {
                        seconds: sessionSeconds,
                        type: s.sessionType,
                        markedTaskCompleted: markCompleted,
                    })

                    platform.tracker.setContext(null)
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

            syncTimer: async () => {
                const s = get()
                if (!s.isActive || !s.startTime || s.isPaused) return

                const activeTask = useTaskStore.getState().tasks.find(t => t.id === s.taskId)
                if (activeTask && activeTask.status === 'done') {
                    get().endSession()
                    return
                }

                const now = Date.now()
                const delta = Math.floor((now - s.startTime) / 1000)

                // Sleep detection: a *gap* between consecutive ticks (not total
                // elapsed) larger than this means the machine was suspended or the
                // tab was frozen for a long time. A legitimately long but continuous
                // session keeps ticking ~1s apart and is never force-paused (H1).
                const SLEEP_GAP = 300 // 5 min between ticks ⇒ machine slept
                const gap = s.lastTickTime ? Math.floor((now - s.lastTickTime) / 1000) : 0

                if (gap > SLEEP_GAP) {
                    // Credit only the time we can actually account for (up to the
                    // last observed tick), then pause. Pausing recomputes the delta
                    // from startTime, so first pin startTime to lastTickTime to
                    // exclude the slept interval — avoids crediting a multi-hour
                    // sleep as focus while still keeping the real work (H1).
                    focusNotify('Paused — inactivity detected')
                    set({ startTime: s.lastTickTime ?? s.startTime })
                    await get().pauseSession(false)
                    set({ lastTickTime: null })
                    return
                }

                set({ lastTickTime: now })

                // BREAK MODE
                if (s.isBreak) {
                    const rem = Math.max(0, s.breakRemainingAtStart - delta)
                    set({ breakRemaining: rem })

                    if (rem === 0 && s.breakRemainingAtStart > 0) {
                        // Persist the completed break NOW. Otherwise a subsequent
                        // startSession() (which routes through endSession, not
                        // stopBreak) clears isBreak and the whole break is lost from
                        // reports. Zero breakElapsed afterwards so a later stopBreak
                        // doesn't double-log the same break.
                        try {
                            const user = (await localService.auth.getUser()).data?.user
                            if (user) {
                                const totalBreak = s.breakRemainingAtStart
                                const accurateStartTime = new Date(Date.now() - (totalBreak * 1000)).toISOString()
                                const sessionData = sanitizeSessionData({
                                    user_id: user.id,
                                    task_id: s.taskId,
                                    start_time: accurateStartTime,
                                    end_time: new Date().toISOString(),
                                    planned_seconds: s.breakRemainingAtStart,
                                    session_type: s.isLongBreak ? 'long_break' : 'break',
                                    seconds: totalBreak,
                                })
                                await localService.focus.create(sessionData)
                            }
                        } catch (e) {
                            console.error('[Focus] auto-complete break log failed', e)
                        }
                        // End the break for real: leaving isBreak=true here makes
                        // the timer recompute a fresh full break (breakRemainingAtStart
                        // minus the just-zeroed breakElapsed) and effectively loop.
                        // Drop out of break and arm the next focus pomodoro, then
                        // AUTO-RESUME the task countdown (better UX than landing paused).
                        // A sound + reminder covers the "unattended" case so focus time
                        // never resumes silently.
                        const bSettings = useSettingsStore.getState()
                        const bPLength = (bSettings.pomodoroLength || 25) * 60
                        const bPTime = bSettings.pomodorosEnabled ? bPLength : 0
                        set({
                            isBreak: false,
                            isLongBreak: false,
                            breakRemaining: 0,
                            breakElapsed: 0,
                            isPaused: true,        // momentary — resumeSession() flips this
                            startTime: null,
                            lastTickTime: null,
                            pomodoroRemaining: bPTime,
                            pomodoroRemainingAtStart: bPTime,
                            pomodoroTotal: bPTime,
                        })
                        soundService.playAlert(LIFECYCLE_ALERT_SOUND)
                        focusNotify('Break over — back to focus')
                        await get().resumeSession()
                    }
                    return // EXIT early
                }

                // FOCUS MODE
                if (useSettingsStore.getState().pomodorosEnabled) {
                    const rem = Math.max(0, s.pomodoroRemainingAtStart - delta)

                    // Logic Check: Did we just hit 0?
                    if (rem === 0 && s.pomodoroRemainingAtStart > 0 && s.pomodoroRemaining > 0) {
                        set({ pomodoroRemaining: 0 }) // Sync update

                        // Trigger Break (auto ⇒ advances long-break cadence)
                        soundService.playAlert(LIFECYCLE_ALERT_SOUND)
                        focusNotify('Session complete — take a break')
                        get().startBreak(undefined, { auto: true })
                        return // EXIT to avoid double-process
                    }

                    set({ pomodoroRemaining: rem })
                }

                const total = s.elapsed + delta
                if (s.taskId) backupService.save(s.taskId, total)

                // ALERTS
                const settings = useSettingsStore.getState()

                // TIME'S UP — the task countdown just crossed its goal. Fire a sound +
                // reminder ONCE per crossing instead of silently slipping into overtime.
                if (shouldFireOvertimeAlert(total, s.duration, s.overtimeAlerted)) {
                    soundService.playAlert(LIFECYCLE_ALERT_SOUND)
                    focusNotify("Time's up — you're now in overtime")
                    set({ overtimeAlerted: true })
                } else if (s.duration > 0 && total < s.duration && s.overtimeAlerted) {
                    // Countdown was extended back under the goal — re-arm the alert.
                    set({ overtimeAlerted: false })
                }

                if (settings.timedAlertsEnabled) {
                    const currentElapsed = s.elapsed + delta
                    const intervalSeconds = settings.alertInterval * 60

                    if (currentElapsed >= s.lastAlertElapsed + intervalSeconds) {
                        soundService.playAlert(settings.alertSound)
                        focusNotify('Stay focused')
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
                    sessionStartedAt: null,
                    sessionBaseElapsed: 0,
                    breakElapsed: 0,
                    showFocusPanel: false,
                    isBreak: false,
                    pomodoroRemaining: 0,
                    breakRemaining: 0,
                    lastTickTime: null,
                    overtimeAlerted: false,
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
                // Persist startTime so a reload/crash can reconstruct in-flight
                // time instead of silently dropping it (H2). Rehydration folds
                // the wall-clock delta into `elapsed` and clears startTime.
                startTime: s.startTime,
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
                pomodoroTotal: s.pomodoroTotal,
                lastTickTime: s.lastTickTime,
                completedPomodoros: s.completedPomodoros,
                isLongBreak: s.isLongBreak
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return

                // A live session can rehydrate for two very different reasons:
                //  1) genuine cold start / crash recovery (app was closed a while), or
                //  2) a quick window handoff — e.g. minimising into the separate
                //     focus-pill window, or handing the session back to the main
                //     window on exit — which restarts a renderer within seconds.
                // Only (1) should force-pause. Detect (2) by a tiny gap since the
                // last tick and keep the session running seamlessly (no fold, no
                // pause) so minimising into the pill doesn't auto-pause the task.
                const HANDOFF_GRACE = 30 // seconds
                const lastSeen = state.lastTickTime ?? state.startTime
                const gapSinceSeen = lastSeen
                    ? Math.floor((Date.now() - lastSeen) / 1000)
                    : Infinity
                if (state.isActive && state.startTime && !state.isPaused && gapSinceSeen <= HANDOFF_GRACE) {
                    return
                }

                // H2: If we persisted a live startTime, the app was closed/crashed
                // mid-session. Reconstruct the in-flight time from wall-clock and
                // fold it into the accumulated total, then land in a paused state
                // so the user explicitly resumes. Cap the credited delta at
                // MAX_DELTA (1h) to avoid crediting time across a multi-day close.
                if (state.isActive && state.startTime && !state.isPaused) {
                    const MAX_DELTA = 3600
                    const rawDelta = Math.floor((Date.now() - state.startTime) / 1000)
                    const delta = Math.max(0, Math.min(rawDelta, MAX_DELTA))

                    if (state.isBreak) {
                        state.breakElapsed = (state.breakElapsed || 0) + delta
                    } else {
                        state.elapsed = (state.elapsed || 0) + delta
                        const pRem = (state.pomodoroRemainingAtStart || 0) - delta
                        state.pomodoroRemaining = Math.max(0, pRem)
                        state.pomodoroRemainingAtStart = Math.max(0, pRem)
                    }

                    // Close the orphaned (never-ended) DB session so the recovered
                    // time is reflected in the session-based reports, not just in
                    // the task's cached spent_s. Deferred because rehydrate is sync.
                    const recoveredId = state.currentSessionId
                    const recoveredStart = state.startTime
                    if (recoveredId && delta > 0) {
                        Promise.resolve().then(() =>
                            localService.focus.update(recoveredId, sanitizeSessionData({
                                end_time: new Date().toISOString(),
                                seconds: delta,
                                start_time: new Date(recoveredStart!).toISOString(),
                            })).catch((e) => console.error('[Focus] crash-recovery session close failed', e))
                        )
                    }
                    state.currentSessionId = null
                }

                // Either way, a rehydrated session must not keep a live startTime:
                // it would otherwise double-count from the original start on the
                // next tick. Pause and clear so resume creates a fresh segment.
                if (state.isActive) {
                    state.isPaused = true
                    state.startTime = null
                }
            }
        }
    )
)
