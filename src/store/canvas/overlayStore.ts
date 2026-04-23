import { create } from 'zustand'

export type OverlayKind = 'settings' | 'reports' | 'planner' | 'screentime' | 'focus' | null

interface OverlayState {
    active: OverlayKind
    open: (k: Exclude<OverlayKind, null>) => void
    close: () => void
    toggle: (k: Exclude<OverlayKind, null>) => void
}

export const useOverlayStore = create<OverlayState>((set, get) => ({
    active: null,
    open: (k) => set({ active: k }),
    close: () => set({ active: null }),
    toggle: (k) => set({ active: get().active === k ? null : k }),
}))
