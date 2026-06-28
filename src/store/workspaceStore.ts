import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/services/supabase'
import toast from 'react-hot-toast'
import { dataSyncService } from '@/services/dataSyncService'

/* ================= TYPES ================= */

export interface Workspace {
    id: string
    user_id: string
    name: string
    color: string
    icon: string
    sort_order: number
    created_at: string
    updated_at: string
    deleted_at: string | null
    synced: number
}

export interface WorkspaceMember {
    id: string
    workspace_id: string
    email: string
    role: 'editor' | 'viewer'
    invited_by: string
    accepted_at: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
}

interface WorkspaceState {
    workspaces: Workspace[]
    membersByWorkspace: Record<string, WorkspaceMember[]>
    /** workspaceId -> { lowercased email -> nickname } */
    nicknamesByWorkspace: Record<string, Record<string, string>>
    activeWorkspaceId: string | null
    loading: boolean
    error: string | null

    /* Actions */
    loadWorkspaces: () => Promise<void>
    createWorkspace: (data: { name: string; color?: string; icon?: string }) => Promise<Workspace | null>
    updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>
    deleteWorkspace: (id: string) => Promise<void>
    inviteToWorkspace: (workspaceId: string, email: string) => Promise<boolean>
    loadWorkspaceMembers: (workspaceId: string) => Promise<void>
    loadWorkspaceNicknames: (workspaceId: string) => Promise<void>
    setWorkspaceNickname: (workspaceId: string, email: string, nickname: string) => Promise<void>
    setActiveWorkspace: (id: string | null) => void
    subscribeRealtime: () => () => void
    reset: () => void
}

/* ================= HELPERS ================= */

function getUserId() {
    return useAuthStore.getState().user?.id ?? null
}

const hasElectron = () => !!(window as any).electronAPI?.db

const COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function pickColor(existing: Workspace[]): string {
    const used = new Set(existing.map(w => w.color))
    return COLORS.find(c => !used.has(c)) ?? COLORS[existing.length % COLORS.length]
}

/* ======= Low-level helpers ======= */

async function localSave(ws: Workspace) {
    if (hasElectron()) {
        await (window as any).electronAPI.db.saveWorkspace({ ...ws, synced: 0 })
        dataSyncService.trigger()
    }
}

async function supabaseSave(ws: Workspace) {
    const payload = {
        id: ws.id,
        user_id: ws.user_id,
        name: ws.name,
        color: ws.color,
        icon: ws.icon,
        sort_order: ws.sort_order,
        created_at: ws.created_at,
        updated_at: ws.updated_at,
        deleted_at: ws.deleted_at,
    }
    const { error } = await (supabase.from('workspaces') as any).upsert(payload, { onConflict: 'id' })
    if (error) console.error('[WorkspaceStore] Supabase upsert failed:', error.message)
    return !error
}

async function supabaseDelete(id: string) {
    const { error } = await (supabase.from('workspaces') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
    if (error) console.error('[WorkspaceStore] Supabase delete failed:', error.message)
}

/* ================= STORE ================= */

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set, get) => ({

            /* ---- State ---- */
            workspaces: [],
            membersByWorkspace: {},
            nicknamesByWorkspace: {},
            activeWorkspaceId: null,
            loading: false,
            error: null,


            /* ---- Load ---- */

            loadWorkspaces: async () => {
                const userId = getUserId()
                if (!userId) return

                set({ loading: true, error: null })
                try {
                    let rows: Workspace[] = []

                    if (hasElectron()) {
                        // Primary: local SQLite (always fast)
                        rows = (await (window as any).electronAPI.db.getWorkspaces(userId)) as Workspace[]
                    }

                    // Always also fetch from Supabase to merge any cloud-only changes
                    try {
                        const { data, error: sbErr } = await (supabase.from('workspaces') as any)
                            .select('*')
                            .is('deleted_at', null)
                            .order('sort_order', { ascending: true })

                        if (!sbErr && data?.length) {
                            if (hasElectron()) {
                                // Merge cloud → local (cloud wins for newer updated_at)
                                for (const remote of data as Workspace[]) {
                                    const local = rows.find(r => r.id === remote.id)
                                    const remoteNewer = !local ||
                                        new Date(remote.updated_at) > new Date(local.updated_at)
                                    if (remoteNewer) {
                                        await (window as any).electronAPI.db.saveWorkspace({ ...remote, synced: 1 })
                                    }
                                }
                                const byId = new Map<string, Workspace>()
                                for (const row of rows) byId.set(row.id, row)
                                for (const remote of data as Workspace[]) byId.set(remote.id, { ...remote, synced: 1 })
                                rows = [...byId.values()].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                            } else {
                                rows = data as Workspace[]
                            }
                        }
                    } catch (sbErr) {
                        // Supabase unreachable — use local only
                        console.warn('[WorkspaceStore] Supabase fetch failed, using local:', sbErr)
                    }

                    set({ workspaces: rows, loading: false })
                } catch (err: any) {
                    console.error('[WorkspaceStore] loadWorkspaces failed', err)
                    set({ loading: false, error: err?.message ?? 'Failed to load workspaces' })
                }
            },


            /* ---- Create ---- */

            createWorkspace: async ({ name, color, icon }) => {
                const userId = getUserId()
                if (!userId) {
                    toast.error('You must be logged in to create a workspace')
                    return null
                }

                const trimmed = name.trim()
                if (!trimmed) {
                    toast.error('Workspace name cannot be empty')
                    return null
                }

                const exists = get().workspaces.some(
                    w => w.name.toLowerCase() === trimmed.toLowerCase()
                )
                if (exists) {
                    toast.error(`A workspace named "${trimmed}" already exists`)
                    return null
                }

                const ws: Workspace = {
                    id: crypto.randomUUID(),
                    user_id: userId,
                    name: trimmed,
                    color: color ?? pickColor(get().workspaces),
                    icon: icon ?? 'briefcase',
                    sort_order: get().workspaces.length,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    deleted_at: null,
                    synced: 0,
                }

                // Optimistic update
                set(state => ({ workspaces: [...state.workspaces, ws] }))

                try {
                    // Save locally first
                    await localSave(ws)
                    // Sync to Supabase in parallel (non-blocking)
                    supabaseSave(ws).catch(console.error)
                    return ws
                } catch (err: any) {
                    set(state => ({ workspaces: state.workspaces.filter(w => w.id !== ws.id) }))
                    toast.error('Failed to create workspace')
                    return null
                }
            },


            /* ---- Members ---- */

            loadWorkspaceMembers: async (workspaceId) => {
                const userId = getUserId()
                if (!userId || !workspaceId) return

                const { data, error } = await (supabase.from('workspace_members') as any)
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: true })

                if (error) {
                    console.error('[WorkspaceStore] loadWorkspaceMembers failed:', error.message)
                    return
                }

                set(state => ({
                    membersByWorkspace: {
                        ...state.membersByWorkspace,
                        [workspaceId]: data || []
                    }
                }))
            },

            loadWorkspaceNicknames: async (workspaceId) => {
                if (!workspaceId) return

                const { data, error } = await (supabase.from('workspace_nicknames') as any)
                    .select('email, nickname')
                    .eq('workspace_id', workspaceId)

                if (error) {
                    console.error('[WorkspaceStore] loadWorkspaceNicknames failed:', error.message)
                    return
                }

                const map: Record<string, string> = {}
                for (const row of (data || [])) {
                    if (row.nickname) map[String(row.email).toLowerCase()] = row.nickname
                }

                set(state => ({
                    nicknamesByWorkspace: { ...state.nicknamesByWorkspace, [workspaceId]: map }
                }))
            },

            setWorkspaceNickname: async (workspaceId, email, nickname) => {
                const key = email.trim().toLowerCase()
                const trimmed = nickname.trim()
                if (!workspaceId || !key) return

                const prev = get().nicknamesByWorkspace[workspaceId] || {}
                const next = { ...prev }
                if (trimmed) next[key] = trimmed
                else delete next[key]

                // Optimistic
                set(state => ({
                    nicknamesByWorkspace: { ...state.nicknamesByWorkspace, [workspaceId]: next }
                }))

                if (trimmed) {
                    const { error } = await (supabase.from('workspace_nicknames') as any)
                        .upsert(
                            { workspace_id: workspaceId, email: key, nickname: trimmed, updated_at: new Date().toISOString() },
                            { onConflict: 'workspace_id,email' }
                        )
                    if (error) {
                        set(state => ({ nicknamesByWorkspace: { ...state.nicknamesByWorkspace, [workspaceId]: prev } }))
                        toast.error('Failed to save nickname')
                    }
                } else {
                    const { error } = await (supabase.from('workspace_nicknames') as any)
                        .delete()
                        .eq('workspace_id', workspaceId)
                        .eq('email', key)
                    if (error) {
                        set(state => ({ nicknamesByWorkspace: { ...state.nicknamesByWorkspace, [workspaceId]: prev } }))
                        toast.error('Failed to clear nickname')
                    }
                }
            },

            inviteToWorkspace: async (workspaceId, email) => {
                const userId = getUserId()
                const workspace = get().workspaces.find(w => w.id === workspaceId)
                const normalizedEmail = email.trim().toLowerCase()

                if (!userId || !workspace) {
                    toast.error('Workspace unavailable')
                    return false
                }

                if (workspace.user_id !== userId) {
                    toast.error('Only the workspace owner can invite teammates')
                    return false
                }

                if (!EMAIL_RE.test(normalizedEmail)) {
                    toast.error('Enter a valid email address')
                    return false
                }

                const currentEmail = useAuthStore.getState().user?.email?.toLowerCase()
                if (currentEmail && normalizedEmail === currentEmail) {
                    toast.error("You already own this workspace")
                    return false
                }

                const now = new Date().toISOString()
                const member: WorkspaceMember = {
                    id: crypto.randomUUID(),
                    workspace_id: workspaceId,
                    email: normalizedEmail,
                    role: 'editor',
                    invited_by: userId,
                    accepted_at: now,
                    created_at: now,
                    updated_at: now,
                    deleted_at: null,
                }

                const previousMembers = get().membersByWorkspace[workspaceId] || []
                if (previousMembers.some(m => !m.deleted_at && m.email.toLowerCase() === normalizedEmail)) {
                    toast.error('That teammate already has access')
                    return false
                }

                set(state => ({
                    membersByWorkspace: {
                        ...state.membersByWorkspace,
                        [workspaceId]: [...previousMembers, member]
                    }
                }))

                const { error } = await (supabase.from('workspace_members') as any)
                    .upsert(member, { onConflict: 'workspace_id,email' })

                if (error) {
                    set(state => ({
                        membersByWorkspace: {
                            ...state.membersByWorkspace,
                            [workspaceId]: previousMembers
                        }
                    }))
                    toast.error(error.message || 'Failed to invite teammate')
                    return false
                }

                toast.success('Workspace access granted')
                return true
            },


            /* ---- Update ---- */

            updateWorkspace: async (id, data) => {
                const prev = get().workspaces

                if (data.name !== undefined && !data.name.trim()) {
                    toast.error('Workspace name cannot be empty')
                    return
                }

                if (data.name) {
                    const collision = get().workspaces.find(
                        w => w.id !== id && w.name.toLowerCase() === data.name!.trim().toLowerCase()
                    )
                    if (collision) {
                        toast.error(`A workspace named "${data.name.trim()}" already exists`)
                        return
                    }
                    data.name = data.name.trim()
                }

                const updated = {
                    ...get().workspaces.find(w => w.id === id)!,
                    ...data,
                    updated_at: new Date().toISOString(),
                    synced: 0,
                }

                set(state => ({
                    workspaces: state.workspaces.map(w => w.id === id ? updated : w)
                }))

                try {
                    await localSave(updated)
                    supabaseSave(updated).catch(console.error)
                } catch (err: any) {
                    set({ workspaces: prev })
                    toast.error('Failed to update workspace')
                }
            },


            /* ---- Delete ---- */

            deleteWorkspace: async (id) => {
                const prev = get().workspaces
                const ws = prev.find(w => w.id === id)
                if (!ws) return

                if (prev.filter(w => !w.deleted_at).length <= 1) {
                    toast.error("You can't delete your only workspace")
                    return
                }

                set(state => ({
                    workspaces: state.workspaces.filter(w => w.id !== id),
                    activeWorkspaceId:
                        state.activeWorkspaceId === id
                            ? (state.workspaces.find(w => w.id !== id && !w.deleted_at)?.id ?? null)
                            : state.activeWorkspaceId
                }))

                try {
                    if (hasElectron()) {
                        await (window as any).electronAPI.db.deleteWorkspace(id)
                        dataSyncService.trigger()
                    }
                    supabaseDelete(id).catch(console.error)
                    toast.success('Workspace deleted')
                } catch (err: any) {
                    set({ workspaces: prev })
                    toast.error('Failed to delete workspace')
                }
            },


            /* ---- Realtime ---- */

            subscribeRealtime: () => {
                const userId = getUserId()
                if (!userId) return () => { }

                const channel = supabase
                    .channel(`workspaces:${userId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'workspaces',
                            filter: `user_id=eq.${userId}`,
                        },
                        async (payload) => {
                            const { eventType, new: newRow, old: oldRow } = payload as any
                            if (eventType === 'DELETE' || (newRow as any)?.deleted_at) {
                                const delId = (newRow as any)?.id ?? (oldRow as any)?.id
                                set(state => ({
                                    workspaces: state.workspaces.filter(w => w.id !== delId)
                                }))
                            } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
                                const incoming = newRow as Workspace
                                set(state => {
                                    const exists = state.workspaces.find(w => w.id === incoming.id)
                                    if (exists) {
                                        return {
                                            workspaces: state.workspaces.map(w =>
                                                w.id === incoming.id ? { ...incoming, synced: 1 } : w
                                            )
                                        }
                                    }
                                    return { workspaces: [...state.workspaces, { ...incoming, synced: 1 }] }
                                })
                                // Also persist to local SQLite if electron
                                if (hasElectron()) {
                                    (window as any).electronAPI.db.saveWorkspace({ ...incoming, synced: 1 })
                                        .catch(console.error)
                                }
                            }
                        }
                    )
                    .subscribe()

                return () => { supabase.removeChannel(channel) }
            },


            /* ---- Misc ---- */

            setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

            reset: () => set({ workspaces: [], membersByWorkspace: {}, nicknamesByWorkspace: {}, activeWorkspaceId: null }),

        }),

        {
            name: 'workspace-store',
            partialize: (s) => ({
                activeWorkspaceId: s.activeWorkspaceId,
                // Don't persist the full list — always reload from DB on startup
            })
        }
    )
)
