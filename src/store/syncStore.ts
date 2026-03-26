import { create } from 'zustand'

interface SyncState {
    syncing: boolean
    pendingCount: number
    lastSync: number | null
    error: string | null

    setSyncing: (syncing: boolean) => void
    setPending: (count: number) => void
    setLastSync: (ts: number) => void
    setError: (msg: string | null) => void
}

export const useSyncStore = create<SyncState>()((set) => ({
    syncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null,

    setSyncing: (syncing) => set({ syncing }),
    setPending: (pendingCount) => set({ pendingCount }),
    setLastSync: (lastSync) => set({ lastSync, error: null }),
    setError: (error) => set({ error }),
}))
