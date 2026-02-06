import { create } from 'zustand'
import { startOfToday } from 'date-fns'

interface PlannerState {
    selectedDate: Date
    setSelectedDate: (date: Date) => void
    goToToday: () => void
    goToNextDay: () => void
    goToPrevDay: () => void
}

export const usePlannerStore = create<PlannerState>((set) => ({
    selectedDate: startOfToday(),
    setSelectedDate: (date: Date) => set({ selectedDate: date }),
    goToToday: () => set({ selectedDate: startOfToday() }),
    goToNextDay: () => set((state) => {
        const next = new Date(state.selectedDate)
        next.setDate(next.getDate() + 1)
        return { selectedDate: next }
    }),
    goToPrevDay: () => set((state) => {
        const prev = new Date(state.selectedDate)
        prev.setDate(prev.getDate() - 1)
        return { selectedDate: prev }
    }),
}))
