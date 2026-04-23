import { create } from 'zustand'
import type { Connection } from '../../types/canvas'

const dirtySet = new Set<string>()

interface ConnectionsState {
    byId: Record<string, Connection>
    byCanvas: Record<string, string[]>
    dirty: Set<string>

    hydrateCanvas: (canvasId: string, cs: Connection[]) => void
    upsert: (c: Connection, markDirty?: boolean) => void
    remove: (id: string) => void
    getForCanvas: (canvasId: string) => Connection[]
    clearDirty: (ids?: string[]) => void
    getDirty: () => Connection[]
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
    byId: {},
    byCanvas: {},
    dirty: dirtySet,

    hydrateCanvas: (canvasId, cs) => set((s) => {
        const byId = { ...s.byId }
        const ids: string[] = []
        for (const c of cs) { byId[c.id] = c; ids.push(c.id) }
        return { byId, byCanvas: { ...s.byCanvas, [canvasId]: ids } }
    }),

    upsert: (c, markDirty = true) => {
        if (markDirty) dirtySet.add(c.id)
        set((s) => {
            const byId = { ...s.byId, [c.id]: c }
            const ids = s.byCanvas[c.canvasId] ?? []
            const byCanvas = ids.includes(c.id)
                ? s.byCanvas
                : { ...s.byCanvas, [c.canvasId]: [...ids, c.id] }
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

    getForCanvas: (canvasId) => {
        const s = get()
        const ids = s.byCanvas[canvasId] ?? []
        return ids.map((id) => s.byId[id]).filter((c): c is Connection => !!c && !c.deletedAt)
    },

    clearDirty: (ids) => {
        if (!ids) { dirtySet.clear(); return }
        for (const id of ids) dirtySet.delete(id)
    },

    getDirty: () => {
        const s = get()
        return Array.from(dirtySet).map((id) => s.byId[id]).filter(Boolean) as Connection[]
    },
}))
