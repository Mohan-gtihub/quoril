import { create } from 'zustand'

import { platform } from '@/services/platform'
import { useAuthStore } from './authStore'
import { useTaskStore } from './taskStore'
import {
    analyzeDayFit,
    type BusyInterval,
    type DayFitAnalysis,
} from '@/services/planning/dayFitAnalyzer'
import { explainPlan } from '@/services/planning/planningExplanation'

interface PlanningState {
    analysis: DayFitAnalysis | null
    explanation: string
    loading: boolean
    /** Calendar-event ids created by the last apply — enables one-tap undo. */
    undoToken: string[] | null
    /** Proposal ids the user has checked; defaults to all when analysis runs. */
    selectedIds: Set<string>

    analyzeForDay: (day: Date) => Promise<void>
    refreshExplanation: (allowRemote?: boolean) => Promise<void>
    toggleProposal: (id: string) => void
    setSelected: (ids: Set<string>) => void
    applyProposals: () => Promise<void>
    undoApply: () => Promise<void>
}

/** Local-time start/end of the given calendar day. */
function dayBounds(day: Date): { startISO: string; endISO: string } {
    const start = new Date(day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(day)
    end.setHours(23, 59, 59, 999)
    return { startISO: start.toISOString(), endISO: end.toISOString() }
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
    analysis: null,
    explanation: '',
    loading: false,
    undoToken: null,
    selectedIds: new Set<string>(),

    analyzeForDay: async (day) => {
        const userId = useAuthStore.getState().user?.id
        if (!userId) {
            set({ analysis: null, explanation: '', loading: false })
            return
        }

        set({ loading: true })

        try {
            const tasks = useTaskStore.getState().tasks

            const { startISO, endISO } = dayBounds(day)

            let busy: BusyInterval[] = []
            try {
                const events = await platform.calendar.list(userId, startISO, endISO)
                busy = (events || [])
                    .filter((ev: any) => ev?.start_at && ev?.end_at)
                    .map((ev: any) => ({
                        start: new Date(ev.start_at),
                        end: new Date(ev.end_at),
                    }))
            } catch {
                // No calendar backend (e.g. web) — treat the day as fully open.
                busy = []
            }

            // The analyzer filters closed tasks itself, so the full list doubles
            // as the learning history.
            const analysis = analyzeDayFit({ day, tasks, history: tasks, busy })

            set({
                analysis,
                selectedIds: new Set(analysis.proposals.map((p) => p.id)),
                loading: false,
            })

            await get().refreshExplanation(false)
        } catch {
            set({ loading: false })
        }
    },

    refreshExplanation: async (allowRemote = false) => {
        const { analysis } = get()
        if (!analysis) {
            set({ explanation: '' })
            return
        }
        try {
            const explanation = await explainPlan(analysis, allowRemote)
            set({ explanation })
        } catch {
            set({ explanation: '' })
        }
    },

    toggleProposal: (id) => {
        set((s) => {
            const next = new Set(s.selectedIds)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return { selectedIds: next }
        })
    },

    setSelected: (ids) => set({ selectedIds: new Set(ids) }),

    applyProposals: async () => {
        const { analysis, selectedIds } = get()
        const userId = useAuthStore.getState().user?.id
        if (!analysis || !userId) return

        const chosen = analysis.proposals.filter((p) => selectedIds.has(p.id))
        if (chosen.length === 0) return

        set({ loading: true })

        const savedIds: string[] = []
        try {
            for (const proposal of chosen) {
                const id = crypto.randomUUID()
                await platform.calendar.save({
                    id,
                    user_id: userId,
                    title: proposal.task.title,
                    start_at: proposal.start.toISOString(),
                    end_at: proposal.end.toISOString(),
                    notes: 'Planned from Quoril',
                    url: null,
                    alarm_lead_minutes: 10,
                    is_recurring: 0,
                    source: 'quoril',
                    task_id: proposal.task.id,
                })
                savedIds.push(id)
            }

            set({ undoToken: savedIds })
            // Re-run so capacity/proposals reflect the newly booked blocks.
            await get().analyzeForDay(analysis.day)
        } catch {
            set({ loading: false })
        }
    },

    undoApply: async () => {
        const { undoToken, analysis } = get()
        if (!undoToken || undoToken.length === 0) {
            set({ undoToken: null })
            return
        }
        try {
            for (const id of undoToken) {
                await platform.calendar.remove(id)
            }
        } catch {
            // Best-effort; still clear the token and refresh below.
        }
        set({ undoToken: null })
        if (analysis) await get().analyzeForDay(analysis.day)
    },
}))
