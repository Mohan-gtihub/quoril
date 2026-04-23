import { create } from 'zustand'
import type { Canvas, Viewport } from '../../types/canvas'

type Mode = 'select' | 'pan' | 'zoneDraw' | 'focus'

interface CanvasState {
    canvases: Canvas[]
    activeCanvasId: string | null
    viewport: Viewport
    selectedBlockIds: string[]
    mode: Mode
    loaded: boolean

    setCanvases: (cs: Canvas[]) => void
    upsertCanvas: (c: Canvas) => void
    removeCanvas: (id: string) => void
    setActiveCanvas: (id: string | null) => void
    setViewport: (v: Viewport) => void
    setSelected: (ids: string[]) => void
    toggleSelected: (id: string, additive?: boolean) => void
    clearSelection: () => void
    setMode: (m: Mode) => void
    setLoaded: (v: boolean) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
    canvases: [],
    activeCanvasId: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedBlockIds: [],
    mode: 'select',
    loaded: false,

    setCanvases: (cs) => set({ canvases: cs }),
    upsertCanvas: (c) => set((s) => {
        const others = s.canvases.filter((x) => x.id !== c.id)
        return { canvases: [c, ...others] }
    }),
    removeCanvas: (id) => set((s) => ({
        canvases: s.canvases.filter((c) => c.id !== id),
        activeCanvasId: s.activeCanvasId === id ? null : s.activeCanvasId,
    })),
    setActiveCanvas: (id) => set((s) => ({
        activeCanvasId: id,
        viewport: id
            ? (s.canvases.find((c) => c.id === id)?.viewport ?? { x: 0, y: 0, zoom: 1 })
            : s.viewport,
        selectedBlockIds: [],
    })),
    setViewport: (v) => set({ viewport: v }),
    setSelected: (ids) => set({ selectedBlockIds: ids }),
    toggleSelected: (id, additive = false) => set((s) => {
        if (!additive) return { selectedBlockIds: [id] }
        const has = s.selectedBlockIds.includes(id)
        return {
            selectedBlockIds: has
                ? s.selectedBlockIds.filter((x) => x !== id)
                : [...s.selectedBlockIds, id],
        }
    }),
    clearSelection: () => set({ selectedBlockIds: [] }),
    setMode: (m) => set({ mode: m }),
    setLoaded: (v) => set({ loaded: v }),
}))
