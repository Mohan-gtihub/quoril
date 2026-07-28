import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, Users } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useCanvasStore } from '@/store/canvas/canvasStore'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'
import { Whiteboard } from './Whiteboard'
import { MetaCanvas } from './MetaCanvas'
import { ShareCanvasModal } from './ShareCanvasModal'
import { CanvasErrorBoundary } from './CanvasErrorBoundary'
import { platform } from '@/services/platform'
import { supabase } from '@/services/supabase'
import { analytics } from '@/services/analytics'
import type { Canvas } from '@/types/canvas'

const NEW_CANVAS_DEFAULTS = {
    viewport: { x: 0, y: 0, zoom: 1 },
    settings: { grid: true, snap: false, autoZoneHints: false },
    schemaVersion: 1,
}

async function ensureCanvas(userId: string): Promise<string> {
    // loadCanvases merges owned + canvases shared WITH the user (via cloud RLS).
    let list = await useCanvasStore.getState().loadCanvases(userId)
    if (list.length === 0) {
        const created = await platform.canvas.create({
            id: uuid(),
            userId,
            title: 'My canvas',
            createdAt: new Date().toISOString(),
            ...NEW_CANVAS_DEFAULTS,
        })
        list = [created as Canvas]
        useCanvasStore.getState().setCanvases(list)
    }
    return list[0].id
}

export function CanvasApp() {
    const user = useAuthStore((s) => s.user)
    const activeId = useCanvasStore((s) => s.activeCanvasId)
    const canvases = useCanvasStore((s) => s.canvases)
    const rolesByCanvas = useCanvasStore((s) => s.rolesByCanvas)
    const setActive = useCanvasStore((s) => s.setActiveCanvas)
    const fullName = useProfileStore((s) => s.fullName)
    const avatarUrl = useProfileStore((s) => s.avatarUrl)
    const [showMeta, setShowMeta] = useState(false)
    const [shareOpen, setShareOpen] = useState(false)
    const navigate = useNavigate()

    // Board-level title rename
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState('')
    const titleRef = useRef<HTMLInputElement>(null)

    const active = canvases.find((c) => c.id === activeId) || null

    useEffect(() => {
        if (!user) return
        let cancelled = false
        ;(async () => {
            const firstId = await ensureCanvas(user.id)
            if (cancelled) return
            // Keep an already-open whiteboard (the store persists across route
            // changes) — don't bounce to the switcher when returning to /canvas.
            if (useCanvasStore.getState().activeCanvasId) return
            const list = useCanvasStore.getState().canvases
            if (list.length === 1) setActive(firstId)
            else setShowMeta(true)
        })()
        return () => { cancelled = true }
    }, [user, setActive])

    // Realtime: keep both owned and shared whiteboards in sync. RLS limits the
    // unfiltered canvases subscription to rows this user may actually access.
    useEffect(() => {
        if (!user) return
        const refresh = () => { void useCanvasStore.getState().loadCanvases(user.id) }
        const canvasChannel = supabase
            .channel(`canvases:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'canvases' },
                refresh,
            )
            .subscribe()

        // Sharing and role changes do not touch the canvases row, so listen for
        // the signed-in email's membership rows as a separate source of truth.
        const membershipChannel = user.email
            ? supabase
                .channel(`canvas-memberships:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'canvas_members',
                        filter: `email=eq.${user.email.trim().toLowerCase()}`,
                    },
                    refresh,
                )
                .subscribe()
            : null

        return () => {
            void supabase.removeChannel(canvasChannel)
            if (membershipChannel) void supabase.removeChannel(membershipChannel)
        }
    }, [user])

    useEffect(() => {
        if (!user || !active) return
        void useCanvasStore.getState().loadMyCanvasRole(
            active.id,
            active.userId,
            user.id,
            user.email,
        )
    }, [active, user])

    // ⌘K toggles the whiteboard switcher
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey
            const t = e.target as HTMLElement | null
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return
            if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); setShowMeta((v) => !v) }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    useEffect(() => {
        if (editingTitle) titleRef.current?.select()
    }, [editingTitle])

    // Keyed on the active id so switching boards emits once per board opened,
    // not once per render. Id only — never the canvas title or its content.
    useEffect(() => {
        if (!activeId) return
        analytics.track('canvas.opened', { canvasId: activeId })
    }, [activeId])

    /* ---------------- CRUD ---------------- */

    const createCanvas = async (): Promise<string | null> => {
        if (!user) return null
        const id = uuid()
        const created = await platform.canvas.create({
            id, userId: user.id, title: 'Untitled',
            createdAt: new Date().toISOString(), ...NEW_CANVAS_DEFAULTS,
        })
        useCanvasStore.getState().upsertCanvas(created as Canvas)
        const newId = (created as Canvas)?.id ?? id
        analytics.track('canvas.created', { canvasId: newId })
        return newId
    }

    const renameCanvas = async (id: string, title: string) => {
        const clean = title.trim()
        if (!clean) return
        const updated = await platform.canvas.update(id, { title: clean })
        const store = useCanvasStore.getState()
        if (updated) store.upsertCanvas(updated as Canvas)
        else {
            const existing = store.canvases.find((c) => c.id === id)
            if (existing) store.upsertCanvas({ ...existing, title: clean })
        }
    }

    const deleteCanvas = async (id: string) => {
        await platform.canvas.softDelete(id)
        useCanvasStore.getState().removeCanvas(id) // also clears active if it was active
    }

    const commitTitle = () => {
        if (active && titleDraft.trim() && titleDraft.trim() !== active.title) {
            void renameCanvas(active.id, titleDraft)
        }
        setEditingTitle(false)
    }

    if (!user) return null

    /* ---------------- Switcher (root of the whiteboard section) ---------------- */

    if (showMeta || !activeId) {
        return (
            <div className="w-full h-full relative">
                <button
                    type="button"
                    onClick={() => (activeId ? setShowMeta(false) : navigate(-1))}
                    className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                    title={activeId ? 'Back to canvas' : 'Back'}
                >
                    <ArrowLeft size={14} />
                    Back
                </button>
                <MetaCanvas
                    canvases={canvases}
                    currentUserId={user.id}
                    rolesByCanvas={rolesByCanvas}
                    onPick={(id) => { setActive(id); setShowMeta(false) }}
                    onNew={createCanvas}
                    onRename={renameCanvas}
                    onDelete={deleteCanvas}
                />
            </div>
        )
    }

    /* ---------------- Board ---------------- */

    const activeRole = active
        ? (active.userId === user.id ? 'owner' : (rolesByCanvas[active.id] ?? 'viewer'))
        : 'viewer'
    const canEdit = activeRole === 'owner' || activeRole === 'editor'
    const userName = fullName.trim()
        || String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim()
        || user.email?.split('@')[0]
        || 'Teammate'

    // Rendered inside the drawing surface's top-right slot so the centered shape
    // toolbar reserves space for Quoril's canvas controls.
    const renderTopRight = () => (
        <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setShowMeta(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                    title="All canvases (⌘K)"
                >
                    <ArrowLeft size={14} />
                    Canvases
                </button>

                {active && (() => {
                    const isOwner = active.userId === user.id
                    if (!isOwner) {
                        // Shared with us: show title + a "Shared" badge, no rename/share.
                        return (
                            <span className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] max-w-[240px]">
                                <span className="truncate">{active.title}</span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                                    <Users size={10} /> {activeRole === 'editor' ? 'Can edit' : 'View only'}
                                </span>
                            </span>
                        )
                    }
                    return editingTitle ? (
                        <input
                            ref={titleRef}
                            value={titleDraft}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            onBlur={commitTitle}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitTitle()
                                if (e.key === 'Escape') setEditingTitle(false)
                            }}
                            maxLength={120}
                            className="text-xs px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--accent-primary)] text-[var(--text-primary)] outline-none"
                        />
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => { setTitleDraft(active.title); setEditingTitle(true) }}
                                className="px-2 py-1 text-xs rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] max-w-[200px] truncate"
                                title="Rename canvas"
                            >
                                {active.title}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShareOpen(true)}
                                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                                title="Share canvas"
                            >
                                <Share2 size={14} /> Share
                            </button>
                        </>
                    )
                })()}
        </div>
    )

    return (
        <div className="w-full h-full relative">
            <CanvasErrorBoundary>
                <Whiteboard
                    canvasId={activeId}
                    canvasTitle={active?.title ?? 'Untitled'}
                    canvasOwnerId={active?.userId ?? user.id}
                    userId={user.id}
                    userName={userName}
                    userAvatarUrl={avatarUrl}
                    canEdit={canEdit}
                    renderTopRight={renderTopRight}
                />
            </CanvasErrorBoundary>

            {shareOpen && active && (
                <ShareCanvasModal
                    canvasId={active.id}
                    canvasTitle={active.title}
                    onClose={() => setShareOpen(false)}
                />
            )}
        </div>
    )
}
