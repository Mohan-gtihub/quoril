import { create } from 'zustand'
import RBush from 'rbush'
import type { Block } from '../../types/canvas'

interface RBushItem { minX: number; minY: number; maxX: number; maxY: number; id: string }

class BlockRTree extends RBush<RBushItem> {}

// Mutable, module-level dirty set. Not part of zustand state: mutations do
// not trigger subscribers. Only the persistence poller reads it, and it reads
// via `useBlocksStore.getState().dirty` (same reference every call).
const dirtySet = new Set<string>()

interface BlocksState {
    byId: Record<string, Block>
    byCanvas: Record<string, string[]>
    dirty: Set<string>
    tree: BlockRTree

    hydrateCanvas: (canvasId: string, blocks: Block[]) => void
    upsert: (b: Block, markDirty?: boolean) => void
    upsertMany: (bs: Block[], markDirty?: boolean) => void
    patch: (id: string, patch: Partial<Block>, markDirty?: boolean) => void
    remove: (id: string) => void
    getForCanvas: (canvasId: string) => Block[]
    clearDirty: (ids?: string[]) => void
    getDirty: () => Block[]
}

function rect(b: Block): RBushItem {
    return { minX: b.x, minY: b.y, maxX: b.x + b.w, maxY: b.y + b.h, id: b.id }
}

export const useBlocksStore = create<BlocksState>((set, get) => ({
    byId: {},
    byCanvas: {},
    dirty: dirtySet,
    tree: new BlockRTree(),

    hydrateCanvas: (canvasId, blocks) => {
        set((s) => {
            const byId = { ...s.byId }
            const ids: string[] = []
            for (const b of blocks) {
                byId[b.id] = b
                ids.push(b.id)
            }
            const tree = new BlockRTree()
            const allCanvasBlocks = Object.values(byId).filter((b) => !b.deletedAt)
            tree.load(allCanvasBlocks.map(rect))
            return {
                byId,
                byCanvas: { ...s.byCanvas, [canvasId]: ids },
                tree,
            }
        })
    },

    upsert: (b, markDirty = true) => {
        if (markDirty) dirtySet.add(b.id)
        set((s) => {
            const existing = s.byId[b.id]
            const byId = { ...s.byId, [b.id]: b }
            const ids = s.byCanvas[b.canvasId] ?? []
            const byCanvas = ids.includes(b.id)
                ? s.byCanvas
                : { ...s.byCanvas, [b.canvasId]: [...ids, b.id] }
            if (existing) s.tree.remove({ ...rect(existing) }, (a, bb) => a.id === bb.id)
            if (!b.deletedAt) s.tree.insert(rect(b))
            return { byId, byCanvas }
        })
    },

    upsertMany: (bs, markDirty = true) => {
        for (const b of bs) get().upsert(b, markDirty)
    },

    patch: (id, patch, markDirty = true) => {
        const cur = get().byId[id]
        if (!cur) return
        get().upsert({ ...cur, ...patch, updatedAt: new Date().toISOString() }, markDirty)
    },

    remove: (id) => {
        dirtySet.delete(id)
        set((s) => {
            const cur = s.byId[id]
            if (!cur) return s
            const byId = { ...s.byId }
            delete byId[id]
            const ids = (s.byCanvas[cur.canvasId] ?? []).filter((x) => x !== id)
            s.tree.remove({ ...rect(cur) }, (a, b) => a.id === b.id)
            return { byId, byCanvas: { ...s.byCanvas, [cur.canvasId]: ids } }
        })
    },

    getForCanvas: (canvasId) => {
        const s = get()
        const ids = s.byCanvas[canvasId] ?? []
        return ids.map((id) => s.byId[id]).filter((b): b is Block => !!b && !b.deletedAt)
    },

    clearDirty: (ids) => {
        if (!ids) { dirtySet.clear(); return }
        for (const id of ids) dirtySet.delete(id)
    },

    getDirty: () => {
        const s = get()
        return Array.from(dirtySet).map((id) => s.byId[id]).filter(Boolean) as Block[]
    },
}))
