import { create } from 'zustand'
import type { Zone } from '../../types/canvas'

export interface EphemeralZone {
    id: string
    bounds: { x: number; y: number; w: number; h: number }
    count: number
}

const dirtySet = new Set<string>()

interface ZonesState {
    byId: Record<string, Zone>
    byCanvas: Record<string, string[]>
    autoHints: EphemeralZone[]
    dirty: Set<string>

    hydrateCanvas: (canvasId: string, zs: Zone[]) => void
    upsert: (z: Zone, markDirty?: boolean) => void
    remove: (id: string) => void
    setAutoHints: (hs: EphemeralZone[]) => void
    getForCanvas: (canvasId: string) => Zone[]
    clearDirty: (ids?: string[]) => void
    getDirty: () => Zone[]
}

export const useZonesStore = create<ZonesState>((set, get) => ({
    byId: {},
    byCanvas: {},
    autoHints: [],
    dirty: dirtySet,

    hydrateCanvas: (canvasId, zs) => set((s) => {
        const byId = { ...s.byId }
        const ids: string[] = []
        for (const z of zs) { byId[z.id] = z; ids.push(z.id) }
        return { byId, byCanvas: { ...s.byCanvas, [canvasId]: ids } }
    }),

    upsert: (z, markDirty = true) => {
        if (markDirty) dirtySet.add(z.id)
        set((s) => {
            const byId = { ...s.byId, [z.id]: z }
            const ids = s.byCanvas[z.canvasId] ?? []
            const byCanvas = ids.includes(z.id)
                ? s.byCanvas
                : { ...s.byCanvas, [z.canvasId]: [...ids, z.id] }
            return { byId, byCanvas }
        })
    },

    remove: (id) => {
        dirtySet.delete(id)
        set((s) => {
            const cur = s.byId[id]
            if (!cur) return s
            const byId = { ...s.byId }; delete byId[id]
            const ids = (s.byCanvas[cur.canvasId] ?? []).filter((x) => x !== id)
            return { byId, byCanvas: { ...s.byCanvas, [cur.canvasId]: ids } }
        })
    },

    setAutoHints: (hs) => set({ autoHints: hs }),

    getForCanvas: (canvasId) => {
        const s = get()
        const ids = s.byCanvas[canvasId] ?? []
        return ids.map((id) => s.byId[id]).filter((z): z is Zone => !!z && !z.deletedAt)
    },

    clearDirty: (ids) => {
        if (!ids) { dirtySet.clear(); return }
        for (const id of ids) dirtySet.delete(id)
    },

    getDirty: () => {
        const s = get()
        return Array.from(dirtySet).map((id) => s.byId[id]).filter(Boolean) as Zone[]
    },
}))
