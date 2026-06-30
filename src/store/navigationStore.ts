import { create } from 'zustand'

/**
 * Browser-style back/forward for the app's drill-down. The "location" is more
 * than the route: it also includes the active workspace, selected list, and open
 * task — none of which are URL-backed — so we keep our own history stack of
 * snapshots and step through it.
 */
export interface NavSnapshot {
    path: string
    workspaceId: string | null
    listId: string | null
    taskId: string | null
}

function keyOf(s: NavSnapshot): string {
    return `${s.path}|${s.workspaceId ?? ''}|${s.listId ?? ''}|${s.taskId ?? ''}`
}

interface NavState {
    entries: NavSnapshot[]
    index: number
    /** Record the current location; no-ops if it equals the current entry. */
    record: (s: NavSnapshot) => void
    /** Move the pointer back/forward and return the snapshot to apply (or null). */
    goBack: () => NavSnapshot | null
    goForward: () => NavSnapshot | null
}

export const useNavigationStore = create<NavState>((set, get) => ({
    entries: [],
    index: -1,

    record: (snap) => {
        const { entries, index } = get()
        const current = entries[index]
        // Applying a back/forward snapshot re-emits the same location — matching
        // the current entry means "no new navigation", so do nothing (this also
        // prevents the apply→record feedback loop without an explicit flag).
        if (current && keyOf(current) === keyOf(snap)) return
        // A new navigation truncates any forward history (standard browser behaviour).
        const next = entries.slice(0, index + 1)
        next.push(snap)
        set({ entries: next, index: next.length - 1 })
    },

    goBack: () => {
        const { entries, index } = get()
        if (index <= 0) return null
        const nextIndex = index - 1
        set({ index: nextIndex })
        return entries[nextIndex]
    },

    goForward: () => {
        const { entries, index } = get()
        if (index >= entries.length - 1) return null
        const nextIndex = index + 1
        set({ index: nextIndex })
        return entries[nextIndex]
    },
}))
