import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { FocusSession } from '@/types/database'

import { localService } from '@/services/localStorage'
import { backupService } from '@/services/backupService'
import { hydrateElapsed, getTaskEstimate } from '@/utils/sessionUtils'
import { useTaskStore } from './taskStore'

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

interface FocusState {
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

    /* History */

    sessions: FocusSession[]
    loading: boolean

    /* Actions */

    startSession: (
        taskId: string,
        duration?: number,
        type?: SessionType
    ) => Promise<void>

    startFocus: (taskId: string) => Promise<void>

    pauseSession: () => Promise<void>
    resumeSession: () => Promise<void>

    endSession: (
        notes?: string,
        focusScore?: number,
        energyLevel?: number
    ) => Promise<void>

    skipToNext: (nextTaskId?: string) => Promise<void>

    syncTimer: () => void

    fetchSessions: () => Promise<void>

    reset: () => void

    setShowFocusPanel: (v: boolean) => void
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

            sessions: [],
            loading: false,

            /* ---------------- START ---------------- */

            startSession: async (
                taskId,
                duration,
                type: SessionType = 'regular'
            ) => {
                try {
                    const state = get()

                    /* Close old session */

                    if (state.isActive) {
                        await state.endSession()
                    }

                    const task =
                        useTaskStore
                            .getState()
                            .tasks.find(t => t.id === taskId)

                    if (!task) return

                    const now = Date.now()

                    const previous =
                        hydrateElapsed(task)

                    const goal =
                        duration ??
                        getTaskEstimate(task)

                    /* Mark task active */

                    await useTaskStore
                        .getState()
                        .startTask(taskId)

                    /* Init state */

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
                    })

                    /* Create history row */

                    const user =
                        (await localService.auth.getUser())
                            .data?.user

                    if (!user) return

                    const { data } =
                        await localService.focus.create({
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

            startFocus: async (taskId) => {
                await get().startSession(taskId)
            },

            /* ---------------- PAUSE ---------------- */

            pauseSession: async () => {
                const s = get()

                if (!s.taskId || !s.startTime) return

                const delta =
                    Math.floor((Date.now() - s.startTime) / 1000)

                const total = s.elapsed + delta

                await useTaskStore
                    .getState()
                    .pauseTask(s.taskId)

                await useTaskStore
                    .getState()
                    .updateTask(s.taskId, {
                        actual_seconds: total,
                    })

                backupService.save(s.taskId, total)

                set({
                    elapsed: total,
                    startTime: null,
                    isPaused: true,
                })
            },

            /* ---------------- RESUME ---------------- */

            resumeSession: async () => {
                const s = get()

                if (!s.taskId) return

                await useTaskStore
                    .getState()
                    .startTask(s.taskId)

                set({
                    startTime: Date.now(),
                    isPaused: false,
                })
            },

            /* ---------------- END ---------------- */

            endSession: async (
                notes,
                focusScore,
                energyLevel
            ) => {
                const s = get()

                if (!s.taskId) {
                    get().reset()
                    return
                }

                try {
                    const delta = s.startTime
                        ? Math.floor(
                            (Date.now() - s.startTime) / 1000
                        )
                        : 0

                    const total = s.elapsed + delta

                    const endISO =
                        new Date().toISOString()

                    /* Update history */

                    if (s.currentSessionId) {
                        await localService.focus.update(
                            s.currentSessionId,
                            {
                                end_time: endISO,
                                actual_seconds: delta,
                                notes: notes ?? null,
                                focus_score: focusScore ?? null,
                                energy_level: energyLevel ?? null,
                            }
                        )
                    }

                    /* Update task */

                    await useTaskStore
                        .getState()
                        .updateTask(s.taskId, {
                            actual_seconds: total,
                        })

                    /* Reset */

                    set({
                        currentSessionId: null,
                        taskId: null,

                        isActive: false,
                        isPaused: false,

                        startTime: null,
                        elapsed: 0,

                        showFocusPanel: false,
                    })

                    await get().fetchSessions()

                } catch (e) {
                    console.error('[Focus] end failed', e)
                    get().reset()
                }
            },

            /* ---------------- SKIP ---------------- */

            skipToNext: async (nextId) => {
                const s = get()

                if (s.isActive) {
                    // Update task status and time before ending
                    await s.endSession()
                }

                if (nextId) {
                    await get().startSession(nextId)
                }
            },

            /* ---------------- TIMER ---------------- */

            syncTimer: () => {
                const s = get()

                if (!s.isActive || !s.startTime) return

                const display =
                    s.elapsed +
                    Math.floor((Date.now() - s.startTime) / 1000)

                /* Hot backup only */

                if (s.taskId) {
                    backupService.save(s.taskId, display)
                }
            },

            /* ---------------- HISTORY ---------------- */

            fetchSessions: async () => {
                try {
                    set({ loading: true })

                    const { data, error } =
                        await localService.focus.list()

                    if (error) throw error

                    set({
                        sessions: data || [],
                        loading: false,
                    })

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
                })
            },

            setShowFocusPanel: (v) => {
                set({ showFocusPanel: v })
            },
        }),

        /* ---------------- PERSIST ---------------- */

        {
            name: 'focus-storage',

            partialize: (s) => ({
                currentSessionId: s.currentSessionId,
                taskId: s.taskId,

                isActive: s.isActive,
                isPaused: s.isPaused,

                startTime: s.startTime,
                elapsed: s.elapsed,

                duration: s.duration,

                sessionType: s.sessionType,
                showFocusPanel: s.showFocusPanel,
            }),
        }
    )
)
