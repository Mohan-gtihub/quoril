import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useCanvasStore } from '@/store/canvas/canvasStore'
import { useAuthStore } from '@/store/authStore'
import { Whiteboard } from './Whiteboard'
import { MetaCanvas } from './MetaCanvas'
import { CanvasErrorBoundary } from './CanvasErrorBoundary'
import { platform } from '@/services/platform'
import { supabase } from '@/services/supabase'
import type { Canvas } from '@/types/canvas'

const NEW_CANVAS_DEFAULTS = {
    viewport: { x: 0, y: 0, zoom: 1 },
    settings: { grid: true, snap: false, autoZoneHints: false },
    schemaVersion: 1,
}

async function ensureCanvas(userId: string): Promise<string> {
    const api = platform.canvas
    let list = (await api.list(userId)) as Canvas[]
    if (list.length === 0) {
        const created = await api.create({
            id: uuid(),
            userId,
            title: 'My Whiteboard',
            createdAt: new Date().toISOString(),
            ...NEW_CANVAS_DEFAULTS,
        })
        list = [created as Canvas]
    }
    useCanvasStore.getState().setCanvases(list)
    return list[0].id
}

export function CanvasApp() {
    const user = useAuthStore((s) => s.user)
    const activeId = useCanvasStore((s) => s.activeCanvasId)
    const canvases = useCanvasStore((s) => s.canvases)
    const setActive = useCanvasStore((s) => s.setActiveCanvas)
    const [showMeta, setShowMeta] = useState(false)
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

    // Realtime: keep the whiteboard list in sync when canvases are created,
    // renamed, or deleted on another device.
    useEffect(() => {
        if (!user) return
        const channel = supabase
            .channel(`canvases:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'canvases', filter: `user_id=eq.${user.id}` },
                async () => {
                    const db = (window as any).electronAPI?.db
                    if (db?.upsertFromCloud) {
                        const { data } = await supabase.from('canvases').select('*').eq('user_id', user.id)
                        if (data?.length) { try { await db.upsertFromCloud('canvases', data) } catch { /* best-effort */ } }
                    }
                    const list = (await platform.canvas.list(user.id)) as Canvas[]
                    useCanvasStore.getState().setCanvases(list)
                },
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [user])

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

    /* ---------------- CRUD ---------------- */

    const createCanvas = async (): Promise<string | null> => {
        if (!user) return null
        const id = uuid()
        const created = await platform.canvas.create({
            id, userId: user.id, title: 'Untitled',
            createdAt: new Date().toISOString(), ...NEW_CANVAS_DEFAULTS,
        })
        useCanvasStore.getState().upsertCanvas(created as Canvas)
        return (created as Canvas)?.id ?? id
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
                    title={activeId ? 'Back to whiteboard' : 'Back'}
                >
                    <ArrowLeft size={14} />
                    Back
                </button>
                <MetaCanvas
                    canvases={canvases}
                    onPick={(id) => { setActive(id); setShowMeta(false) }}
                    onNew={createCanvas}
                    onRename={renameCanvas}
                    onDelete={deleteCanvas}
                />
            </div>
        )
    }

    /* ---------------- Board ---------------- */

    return (
        <div className="w-full h-full relative">
            <CanvasErrorBoundary>
                <Whiteboard canvasId={activeId} userId={user.id} />
            </CanvasErrorBoundary>
            {/* Controls top-right to avoid colliding with Excalidraw's top-left menu */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setShowMeta(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                    title="All whiteboards (⌘K)"
                >
                    <ArrowLeft size={14} />
                    Whiteboards
                </button>

                {active && (editingTitle ? (
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
                    <button
                        type="button"
                        onClick={() => { setTitleDraft(active.title); setEditingTitle(true) }}
                        className="px-2 py-1 text-xs rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] max-w-[200px] truncate"
                        title="Rename whiteboard"
                    >
                        {active.title}
                    </button>
                ))}
            </div>
        </div>
    )
}
