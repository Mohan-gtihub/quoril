import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useCanvasStore } from '@/store/canvas/canvasStore'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useConnectionsStore } from '@/store/canvas/connectionsStore'
import { useZonesStore } from '@/store/canvas/zonesStore'
import { useOverlayStore } from '@/store/canvas/overlayStore'
import { useAuthStore } from '@/store/authStore'
import { CanvasSurface } from './CanvasSurface'
import { MetaCanvas } from './MetaCanvas'
import { OverlayHost } from './overlays/OverlayHost'
import { CanvasErrorBoundary } from './CanvasErrorBoundary'
import type { Canvas } from '@/types/canvas'

async function ensureCanvas(userId: string): Promise<string> {
    const api = window.electronAPI.canvas
    let list = (await api.list(userId)) as Canvas[]
    if (list.length === 0) {
        const now = new Date().toISOString()
        const created = await api.create({
            id: uuid(),
            userId,
            title: 'My Canvas',
            viewport: { x: 0, y: 0, zoom: 1 },
            settings: { grid: true, snap: false, autoZoneHints: false },
            schemaVersion: 1,
            createdAt: now,
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
    const setLoaded = useCanvasStore((s) => s.setLoaded)
    const overlayKind = useOverlayStore((s) => s.active)
    const overlayToggle = useOverlayStore((s) => s.toggle)
    const [showMeta, setShowMeta] = useState(false)

    useEffect(() => {
        if (!user) return
        let cancelled = false
        ;(async () => {
            const firstId = await ensureCanvas(user.id)
            if (cancelled) return
            const list = useCanvasStore.getState().canvases
            if (list.length === 1) setActive(firstId)
            else setShowMeta(true)
        })()
        return () => { cancelled = true }
    }, [user, setActive])

    useEffect(() => {
        if (!activeId || !user) return
        let cancelled = false
        ;(async () => {
            const api = window.electronAPI.canvas
            const [blocks, conns, zones] = await Promise.all([
                api.listBlocks(activeId),
                api.listConnections(activeId),
                api.listZones(activeId),
            ])
            if (cancelled) return
            useBlocksStore.getState().hydrateCanvas(activeId, blocks as any)
            useConnectionsStore.getState().hydrateCanvas(activeId, conns as any)
            useZonesStore.getState().hydrateCanvas(activeId, zones as any)
            setLoaded(true)
        })()
        return () => { cancelled = true }
    }, [activeId, user, setLoaded])

    // ⌘K opens MetaCanvas switcher
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey
            const t = e.target as HTMLElement | null
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return
            if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); setShowMeta((v) => !v); return }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [overlayKind, overlayToggle])

    if (!user) return null

    if (showMeta || !activeId) {
        return (
            <div className="w-full h-full">
                <MetaCanvas
                    canvases={canvases}
                    onPick={(id) => { setActive(id); setShowMeta(false) }}
                    onNew={async () => {
                        const now = new Date().toISOString()
                        const created = await window.electronAPI.canvas.create({
                            id: uuid(),
                            userId: user.id,
                            title: 'Untitled',
                            viewport: { x: 0, y: 0, zoom: 1 },
                            settings: { grid: true, snap: false, autoZoneHints: false },
                            schemaVersion: 1,
                            createdAt: now,
                        })
                        useCanvasStore.getState().upsertCanvas(created as any)
                        setActive((created as any).id)
                        setShowMeta(false)
                    }}
                />
            </div>
        )
    }

    return (
        <div className="w-full h-full relative">
            <CanvasErrorBoundary>
                <CanvasSurface canvasId={activeId} userId={user.id} />
            </CanvasErrorBoundary>
            <button
                type="button"
                onClick={() => setShowMeta(true)}
                className="absolute top-3 left-3 z-20 px-2 py-1 text-xs rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                title="All canvases (⌘K)"
            >
                ⌘K
            </button>
            <OverlayHost />
        </div>
    )
}
