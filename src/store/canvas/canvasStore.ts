import { create } from 'zustand'
import toast from 'react-hot-toast'
import type { Canvas, Viewport } from '../../types/canvas'
import { platform } from '@/services/platform'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'

type Mode = 'select' | 'pan' | 'zoneDraw' | 'focus'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function hasElectron() {
    return typeof window !== 'undefined' && Boolean((window as any).electronAPI?.db)
}

function parseMaybe<T>(v: any, fallback: T): T {
    if (v == null) return fallback
    if (typeof v === 'object') return v as T
    try { return JSON.parse(v) as T } catch { return fallback }
}

/** Map a Supabase canvases row (snake_case, JSONB) to the camelCase Canvas. */
function cloudToCanvas(r: any): Canvas {
    return {
        id: r.id,
        userId: r.user_id,
        workspaceId: r.workspace_id ?? null,
        title: r.title ?? 'Untitled',
        icon: r.icon ?? undefined,
        color: r.color ?? undefined,
        viewport: parseMaybe(r.viewport_json, { x: 0, y: 0, zoom: 1 }),
        homeViewport: parseMaybe(r.home_viewport_json, undefined as any),
        settings: parseMaybe(r.settings_json, { grid: true, snap: false, autoZoneHints: false }),
        schemaVersion: r.schema_version ?? 1,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at ?? null,
    }
}

export type CanvasMemberRole = 'owner' | 'editor' | 'viewer'

/** A person a canvas has been shared with (mirrors WorkspaceMember). */
export interface CanvasMember {
    id: string
    canvas_id: string
    email: string
    role: 'editor' | 'viewer'
    invited_by: string
    accepted_at: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
}

interface CanvasState {
    canvases: Canvas[]
    activeCanvasId: string | null
    viewport: Viewport
    selectedBlockIds: string[]
    mode: Mode
    loaded: boolean
    /** canvasId -> members it has been shared with */
    membersByCanvas: Record<string, CanvasMember[]>
    /** canvasId -> current user's effective access */
    rolesByCanvas: Record<string, CanvasMemberRole>

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

    /* Loading + sharing */
    loadCanvases: (userId: string) => Promise<Canvas[]>
    loadCanvasMembers: (canvasId: string) => Promise<void>
    loadMyCanvasRole: (canvasId: string, ownerId: string, userId: string, email?: string | null) => Promise<CanvasMemberRole>
    inviteToCanvas: (canvasId: string, email: string, role: 'editor' | 'viewer') => Promise<boolean>
    updateCanvasMemberRole: (canvasId: string, memberId: string, role: 'editor' | 'viewer') => Promise<void>
    revokeCanvasMember: (canvasId: string, memberId: string) => Promise<void>
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    canvases: [],
    activeCanvasId: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedBlockIds: [],
    mode: 'select',
    loaded: false,
    membersByCanvas: {},
    rolesByCanvas: {},

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

    /* ---- Loading (merges shared canvases from cloud, like loadWorkspaces) ---- */

    loadCanvases: async (userId) => {
        if (!userId) return []

        // Local SQLite holds owned canvases (and any previously-pulled shared ones).
        let local: Canvas[] = []
        try {
            local = (await platform.canvas.list(userId)) as Canvas[]
        } catch { /* offline / web */ }

        // RLS returns owned + shared canvases (no user_id filter).
        try {
            const { data, error } = await (supabase.from('canvases') as any)
                .select('*')
                .is('deleted_at', null)

            if (!error && data?.length) {
                const db = (window as any).electronAPI?.db
                // Persist cloud rows (incl. shared) locally so they survive offline
                // and the canvas/blocks FK resolves. upsertFromCloud takes raw rows.
                if (hasElectron() && db?.upsertFromCloud) {
                    try { await db.upsertFromCloud('canvases', data) } catch { /* best-effort */ }
                }

                // Pull scenes for every accessible canvas, not only rows whose
                // user_id matches the current user. Canvas snapshots retain the
                // owner's id, so collaborators and returning owners both need this.
                const accessibleIds = (data as any[]).map((row) => row.id)
                if (accessibleIds.length) {
                    const { data: blocks } = await (supabase.from('blocks') as any)
                        .select('*')
                        .in('canvas_id', accessibleIds)
                    if (hasElectron() && db?.upsertFromCloud && blocks?.length) {
                        try { await db.upsertFromCloud('blocks', blocks) } catch { /* best-effort */ }
                    }
                }

                // Merge: cloud wins (covers shared rows not present locally).
                const byId = new Map<string, Canvas>()
                for (const c of local) byId.set(c.id, c)
                for (const r of data as any[]) byId.set(r.id, cloudToCanvas(r))
                local = [...byId.values()]
            }
        } catch (e) {
            console.warn('[CanvasStore] cloud canvas merge failed, using local:', e)
        }

        local.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        set({ canvases: local })
        return local
    },

    /* ---- Sharing (mirrors workspaceStore member logic) ---- */

    loadCanvasMembers: async (canvasId) => {
        if (!canvasId) return
        const { data, error } = await (supabase.from('canvas_members') as any)
            .select('*')
            .eq('canvas_id', canvasId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('[CanvasStore] loadCanvasMembers failed:', error.message)
            return
        }

        set((state) => ({
            membersByCanvas: { ...state.membersByCanvas, [canvasId]: data || [] },
        }))
    },

    loadMyCanvasRole: async (canvasId, ownerId, userId, email) => {
        if (ownerId === userId) {
            set((state) => ({ rolesByCanvas: { ...state.rolesByCanvas, [canvasId]: 'owner' } }))
            return 'owner'
        }
        if (!email) {
            set((state) => ({ rolesByCanvas: { ...state.rolesByCanvas, [canvasId]: 'viewer' } }))
            return 'viewer'
        }

        const { data, error } = await (supabase.from('canvas_members') as any)
            .select('role')
            .eq('canvas_id', canvasId)
            .eq('email', email.trim().toLowerCase())
            .is('deleted_at', null)
            .maybeSingle()
        const role: CanvasMemberRole = !error && data?.role === 'editor' ? 'editor' : 'viewer'
        set((state) => ({ rolesByCanvas: { ...state.rolesByCanvas, [canvasId]: role } }))
        return role
    },

    inviteToCanvas: async (canvasId, email, role) => {
        const userId = useAuthStore.getState().user?.id
        const canvas = get().canvases.find((c) => c.id === canvasId)
        const normalizedEmail = email.trim().toLowerCase()

        if (!userId || !canvas) {
            toast.error('Canvas unavailable')
            return false
        }
        if (canvas.userId !== userId) {
            toast.error('Only the canvas owner can share it')
            return false
        }
        if (!EMAIL_RE.test(normalizedEmail)) {
            toast.error('Enter a valid email address')
            return false
        }
        const currentEmail = useAuthStore.getState().user?.email?.toLowerCase()
        if (currentEmail && normalizedEmail === currentEmail) {
            toast.error('You already own this canvas')
            return false
        }

        const previousMembers = get().membersByCanvas[canvasId] || []
        if (previousMembers.some((m) => !m.deleted_at && m.email.toLowerCase() === normalizedEmail)) {
            toast.error('That person already has access')
            return false
        }

        const now = new Date().toISOString()
        const member: CanvasMember = {
            id: crypto.randomUUID(),
            canvas_id: canvasId,
            email: normalizedEmail,
            role,
            invited_by: userId,
            accepted_at: now,
            created_at: now,
            updated_at: now,
            deleted_at: null,
        }

        // Optimistic
        set((state) => ({
            membersByCanvas: { ...state.membersByCanvas, [canvasId]: [...previousMembers, member] },
        }))

        const { error } = await (supabase.from('canvas_members') as any)
            .upsert(member, { onConflict: 'canvas_id,email' })

        if (error) {
            set((state) => ({
                membersByCanvas: { ...state.membersByCanvas, [canvasId]: previousMembers },
            }))
            toast.error(error.message || 'Failed to share canvas')
            return false
        }

        toast.success('Canvas access granted')
        return true
    },

    updateCanvasMemberRole: async (canvasId, memberId, role) => {
        const previousMembers = get().membersByCanvas[canvasId] || []
        set((state) => ({
            membersByCanvas: {
                ...state.membersByCanvas,
                [canvasId]: previousMembers.map((member) => member.id === memberId ? { ...member, role } : member),
            },
        }))

        const { error } = await (supabase.from('canvas_members') as any)
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', memberId)
        if (error) {
            set((state) => ({ membersByCanvas: { ...state.membersByCanvas, [canvasId]: previousMembers } }))
            toast.error(error.message || 'Failed to update access')
            return
        }
        toast.success(role === 'editor' ? 'Editor access granted' : 'Changed to view only')
    },

    revokeCanvasMember: async (canvasId, memberId) => {
        const previousMembers = get().membersByCanvas[canvasId] || []
        // Optimistic removal
        set((state) => ({
            membersByCanvas: {
                ...state.membersByCanvas,
                [canvasId]: previousMembers.filter((m) => m.id !== memberId),
            },
        }))

        const { error } = await (supabase.from('canvas_members') as any)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', memberId)

        if (error) {
            set((state) => ({
                membersByCanvas: { ...state.membersByCanvas, [canvasId]: previousMembers },
            }))
            toast.error(error.message || 'Failed to revoke access')
        }
    },
}))
