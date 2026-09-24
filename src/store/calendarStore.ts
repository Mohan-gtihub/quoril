import { create } from 'zustand'
import { startOfToday } from 'date-fns'
import { platform } from '@/services/platform'
import { useAuthStore } from '@/store/authStore'
import {
    mapCalendarEvent,
    type CalendarEvent,
    type CalendarEventRow,
} from '@/types/calendar'

/* ─── Helpers ────────────────────────────────────────────── */

function startOfDay(day: Date): Date {
    const d = new Date(day)
    d.setHours(0, 0, 0, 0)
    return d
}

function endOfDay(day: Date): Date {
    const d = new Date(day)
    d.setHours(23, 59, 59, 999)
    return d
}

function currentUserId(): string | null {
    return useAuthStore.getState().user?.id ?? null
}

/* ─── Store ──────────────────────────────────────────────── */

interface CalendarState {
    events: CalendarEvent[]
    loading: boolean
    selectedDate: Date
    editingId: string | null

    load: (day: Date) => Promise<void>
    setSelectedDate: (day: Date) => Promise<void>
    goToToday: () => Promise<void>
    prevDay: () => Promise<void>
    nextDay: () => Promise<void>

    create: (partial: Partial<CalendarEventRow>) => Promise<void>
    saveEdit: (id: string, patch: Partial<CalendarEventRow>) => Promise<void>
    remove: (id: string) => Promise<void>

    openEditor: (id: string | null) => void
    closeEditor: () => void
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
    events: [],
    loading: false,
    selectedDate: startOfToday(),
    editingId: null,

    load: async (day: Date) => {
        const userId = currentUserId()
        if (!userId) {
            set({ events: [], loading: false })
            return
        }
        set({ loading: true })
        try {
            // Widen the window slightly past the day boundary so events that
            // start late / end just after midnight still surface on the grid.
            const from = startOfDay(day)
            const to = new Date(endOfDay(day).getTime() + 60 * 60 * 1000)
            const rows = await platform.calendar.list(
                userId,
                from.toISOString(),
                to.toISOString(),
            )
            const events = (rows ?? []).map((r) => mapCalendarEvent(r as CalendarEventRow))
            set({ events, loading: false })
        } catch (err) {
            console.error('[Calendar] load failed:', err)
            set({ events: [], loading: false })
        }
    },

    setSelectedDate: async (day: Date) => {
        const d = startOfDay(day)
        set({ selectedDate: d })
        await get().load(d)
    },

    goToToday: async () => {
        await get().setSelectedDate(startOfToday())
    },

    prevDay: async () => {
        const prev = new Date(get().selectedDate)
        prev.setDate(prev.getDate() - 1)
        await get().setSelectedDate(prev)
    },

    nextDay: async () => {
        const next = new Date(get().selectedDate)
        next.setDate(next.getDate() + 1)
        await get().setSelectedDate(next)
    },

    create: async (partial: Partial<CalendarEventRow>) => {
        const userId = currentUserId()
        if (!userId) return
        const now = new Date().toISOString()
        const row: CalendarEventRow = {
            id: crypto.randomUUID(),
            user_id: userId,
            title: partial.title ?? 'Untitled',
            start_at: partial.start_at ?? now,
            end_at: partial.end_at ?? now,
            notes: partial.notes ?? null,
            url: partial.url ?? null,
            alarm_lead_minutes: partial.alarm_lead_minutes ?? null,
            is_recurring: partial.is_recurring ?? 0,
            source: 'quoril',
            task_id: partial.task_id ?? null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
        }
        try {
            await platform.calendar.save(row)
        } catch (err) {
            console.error('[Calendar] create failed:', err)
        }
        await get().load(get().selectedDate)
    },

    saveEdit: async (id: string, patch: Partial<CalendarEventRow>) => {
        try {
            await platform.calendar.update(id, {
                ...patch,
                updated_at: new Date().toISOString(),
            })
        } catch (err) {
            console.error('[Calendar] saveEdit failed:', err)
        }
        await get().load(get().selectedDate)
    },

    remove: async (id: string) => {
        try {
            await platform.calendar.remove(id)
        } catch (err) {
            console.error('[Calendar] remove failed:', err)
        }
        await get().load(get().selectedDate)
    },

    openEditor: (id: string | null) => set({ editingId: id ?? '__new__' }),
    closeEditor: () => set({ editingId: null }),
}))
