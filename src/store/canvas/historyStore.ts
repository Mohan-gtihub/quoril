import { create } from 'zustand'

export interface Command {
    id: string
    label: string
    ts: number
    do: () => void | Promise<void>
    undo: () => void | Promise<void>
    // optional coalesce key — same-key commands within coalesceWindowMs merge
    coalesceKey?: string
}

const CAP = 200
const COALESCE_MS = 500

interface HistoryState {
    past: Command[]
    future: Command[]

    push: (cmd: Command) => void
    undo: () => void
    redo: () => void
    clear: () => void
    canUndo: () => boolean
    canRedo: () => boolean
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
    past: [],
    future: [],

    push: (cmd) => {
        set((s) => {
            const last = s.past[s.past.length - 1]
            if (
                last &&
                cmd.coalesceKey &&
                last.coalesceKey === cmd.coalesceKey &&
                cmd.ts - last.ts < COALESCE_MS
            ) {
                // Coalesce: keep original undo (earlier state), adopt new do
                const merged: Command = { ...last, do: cmd.do, ts: cmd.ts }
                const past = s.past.slice(0, -1).concat(merged)
                return { past, future: [] }
            }
            const past = [...s.past, cmd].slice(-CAP)
            return { past, future: [] }
        })
    },

    undo: () => {
        const { past } = get()
        const cmd = past[past.length - 1]
        if (!cmd) return
        cmd.undo()
        set((s) => ({ past: s.past.slice(0, -1), future: [cmd, ...s.future] }))
    },

    redo: () => {
        const { future } = get()
        const cmd = future[0]
        if (!cmd) return
        cmd.do()
        set((s) => ({ past: [...s.past, cmd].slice(-CAP), future: s.future.slice(1) }))
    },

    clear: () => set({ past: [], future: [] }),
    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
}))
