import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    useReactFlow,
    ReactFlowProvider,
    type Node,
    type Edge,
    type NodeChange,
    type OnMove,
    type Viewport as RFViewport,
    type Connection as RFConnection,
    MarkerType,
    getNodesBounds,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'
import { v4 as uuid } from 'uuid'

import { useCanvasStore } from '@/store/canvas/canvasStore'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useConnectionsStore } from '@/store/canvas/connectionsStore'
import { useZonesStore } from '@/store/canvas/zonesStore'
import { Block as BlockNode } from './Block'
import { useCanvasPersistence } from './hooks/useCanvasPersistence'
import { useSmartPaste, parseYouTubeId } from './hooks/useSmartPaste'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useExecutionLoop } from './hooks/useExecutionLoop'
import { SelectionToolbar } from './toolbars/SelectionToolbar'
import { SlashMenu } from './toolbars/SlashMenu'
import { CanvasToolbar } from './toolbars/CanvasToolbar'
import { ZoneLayer } from './layers/ZoneLayer'
import { ReferenceEdge, FlowEdge, DependencyEdge, EDGE_COLORS } from './edges/CanvasEdges'
import { EdgeInspector } from './edges/EdgeInspector'
import { EdgeContextMenu, useEdgeContextMenu } from './edges/EdgeContextMenu'
import { PipelineEngine } from './pipeline/PipelineEngine'
import type { Block, Connection, Zone } from '@/types/canvas'

const nodeTypes = { block: BlockNode }
const edgeTypes = { reference: ReferenceEdge, flow: FlowEdge, dependency: DependencyEdge }

function Inner({ canvasId, userId }: { canvasId: string; userId: string }) {
    const blocks = useBlocksStore((s) => s.getForCanvas(canvasId))
    const connections = useConnectionsStore((s) => s.getForCanvas(canvasId))
    const upsertBlock = useBlocksStore((s) => s.upsert)
    const removeBlock = useBlocksStore((s) => s.remove)
    const upsertConn = useConnectionsStore((s) => s.upsert)
    const removeConn = useConnectionsStore((s) => s.remove)
    const upsertZone = useZonesStore((s) => s.upsert)
    const setViewport = useCanvasStore((s) => s.setViewport)
    const viewport = useCanvasStore((s) => s.viewport)
    const setSelected = useCanvasStore((s) => s.setSelected)
    // Only subscribed to for focus-mode dimming; node selection itself is owned by react-flow.
    const selectedIds = useCanvasStore((s) => s.selectedBlockIds)
    const mode = useCanvasStore((s) => s.mode)
    const setMode = useCanvasStore((s) => s.setMode)
    const rf = useReactFlow()
    const wrapRef = useRef<HTMLDivElement>(null)
    const slashRef = useRef<{ open: (at: { x: number; y: number }, blockId?: string) => void }>(null)

    useCanvasPersistence(canvasId)
    useSmartPaste(canvasId, userId)
    useKeyboardShortcuts(canvasId, userId, () => slashRef.current?.open({ x: 0, y: 0 }))
    const { promoteIdea } = useExecutionLoop(canvasId, userId)

    // LOD: three-tier based on zoom
    const lodTier: 'full' | 'card' | 'map' = viewport.zoom >= 0.4 ? 'full' : viewport.zoom >= 0.15 ? 'card' : 'map'

    const nodes = useMemo<Node[]>(() => {
        // Recency fade: within 48h gets a soft highlight
        const now = Date.now()
        const draggable = mode !== 'zoneDraw'
        return blocks.map((b) => {
            const touched = b.lastTouchedAt ? new Date(b.lastTouchedAt).getTime() : 0
            const age = Math.max(0, now - touched)
            const recent = age < 48 * 3600 * 1000
            const recentAlpha = recent ? 1 - age / (48 * 3600 * 1000) : 0
            return {
                id: b.id,
                type: 'block',
                position: { x: b.x, y: b.y },
                data: { blockId: b.id, lodTier, recentAlpha, isLandmark: !!b.isLandmark },
                // Selection is driven by react-flow internally via onNodesChange →
                // our store. We intentionally do NOT set `selected` here so that
                // clicking a block doesn't rebuild the entire nodes array.
                width: b.w,
                height: b.h,
                style: { width: b.w, height: b.h },
                draggable,
                selectable: draggable,
            }
        })
    }, [blocks, lodTier, mode])

    const focusTouching = useMemo(() => {
        if (mode !== 'focus' || selectedIds.length === 0) return null
        const s = new Set(selectedIds)
        for (const c of connections) {
            if (s.has(c.fromBlockId) || s.has(c.toBlockId)) { s.add(c.fromBlockId); s.add(c.toBlockId) }
        }
        return s
    }, [mode, selectedIds, connections])

    const edges = useMemo<Edge[]>(() => {
        return connections.map((c) => {
            const color = c.style?.color ?? EDGE_COLORS[c.kind]
            const dim = focusTouching && !(focusTouching.has(c.fromBlockId) && focusTouching.has(c.toBlockId))
            const pending = c.kind === 'dependency' && c.condition && !c.condition.lastFiredAt
            return {
                id: c.id,
                source: c.fromBlockId,
                target: c.toBlockId,
                type: c.kind,
                style: { opacity: dim ? 0.12 : 1 },
                markerEnd: { type: MarkerType.ArrowClosed, color },
                data: {
                    kind: c.kind,
                    label: c.label,
                    condition: c.condition,
                    userStyle: c.style,
                    pending,
                },
            }
        })
    }, [connections, focusTouching])

    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
    const edgeMenu = useEdgeContextMenu()

    // During live drag/resize we DO NOT write to the store. react-flow owns the
    // intermediate visual state (it tracks position/size internally between
    // onNodesChange calls). We only commit to our store when the gesture ends.
    // This removes the per-frame byId clone + RBush rebuild + nodes-memo rebuild
    // + react-flow full diff loop that made resize/drag feel stuck.
    const liveGeomRef = useRef<Map<string, { x?: number; y?: number; w?: number; h?: number }>>(new Map())
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        const store = useBlocksStore.getState()
        const live = liveGeomRef.current
        for (const c of changes) {
            if (c.type === 'position' && c.position) {
                const { x, y } = c.position
                if (!Number.isFinite(x) || !Number.isFinite(y)) continue
                if ((c as any).dragging) {
                    // Stash latest; commit on dragging=false
                    const prev = live.get(c.id) ?? {}
                    live.set(c.id, { ...prev, x, y })
                } else {
                    const pending = live.get(c.id)
                    const fx = pending?.x ?? x
                    const fy = pending?.y ?? y
                    live.delete(c.id)
                    const cur = store.byId[c.id]
                    if (cur) upsertBlock({ ...cur, x: fx, y: fy }, true)
                }
            } else if (c.type === 'dimensions' && c.dimensions) {
                const w = c.dimensions.width
                const h = c.dimensions.height
                if (!Number.isFinite(w) || !Number.isFinite(h)) continue
                if ((c as any).resizing) {
                    const prev = live.get(c.id) ?? {}
                    live.set(c.id, { ...prev, w, h })
                } else {
                    const pending = live.get(c.id)
                    const fw = pending?.w ?? w
                    const fh = pending?.h ?? h
                    live.delete(c.id)
                    const cur = store.byId[c.id]
                    if (cur) upsertBlock({ ...cur, w: fw, h: fh }, true)
                }
            } else if (c.type === 'remove') {
                removeBlock(c.id)
            } else if (c.type === 'select') {
                const cur = useCanvasStore.getState().selectedBlockIds
                if (c.selected && !cur.includes(c.id)) setSelected([...cur, c.id])
                else if (!c.selected && cur.includes(c.id)) setSelected(cur.filter((x) => x !== c.id))
            }
        }
    }, [upsertBlock, removeBlock, setSelected])

    const onEdgesChange = useCallback((changes: any[]) => {
        for (const ch of changes) {
            if (ch.type === 'remove') {
                removeConn(ch.id)
                window.electronAPI.canvas.softDeleteConnection(ch.id).catch(() => {})
            }
        }
    }, [removeConn])

    const onConnect = useCallback((params: RFConnection) => {
        if (!params.source || !params.target) return
        const now = new Date().toISOString()
        const c: Connection = {
            id: uuid(),
            canvasId, userId,
            fromBlockId: params.source,
            toBlockId: params.target,
            fromAnchor: 'auto', toAnchor: 'auto',
            kind: 'reference',
            createdAt: now, updatedAt: now,
        }
        upsertConn(c, true)
        window.electronAPI.canvas.upsertConnection(c).catch(() => {})
    }, [canvasId, userId, upsertConn])

    const onMoveEnd: OnMove = useCallback((_, vp: RFViewport) => {
        setViewport({ x: vp.x, y: vp.y, zoom: vp.zoom })
    }, [setViewport])

    const onPaneDoubleClick = useCallback((e: React.MouseEvent) => {
        if (mode === 'zoneDraw') return
        const world = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        const now = new Date().toISOString()
        const b: Block = {
            id: uuid(),
            canvasId, userId,
            kind: 'idea',
            x: world.x - 100, y: world.y - 60,
            w: 200, h: 120, z: 0,
            content: { kind: 'idea', data: { text: '', color: '#fef3c7' } },
            createdAt: now, updatedAt: now,
        }
        upsertBlock(b, true)
        setSelected([b.id])
    }, [mode, rf, canvasId, userId, upsertBlock, setSelected])

    // Drag-drop files / URLs
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const files = Array.from(e.dataTransfer?.files ?? [])
        const text = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || ''
        const origin = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        const now = new Date().toISOString()
        let dx = 0
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                const offset = dx
                reader.onload = () => {
                    const src = String(reader.result || '')
                    useBlocksStore.getState().upsert({
                        id: uuid(), canvasId, userId, kind: 'image',
                        x: origin.x - 150 + offset, y: origin.y - 100,
                        w: 300, h: 200, z: 0,
                        content: { kind: 'image', data: { src, alt: file.name } },
                        createdAt: now, updatedAt: now,
                    }, true)
                }
                reader.readAsDataURL(file)
                dx += 16
            }
        }
        if (files.length === 0 && text) {
            const url = text.split(/\s+/).find((t) => /^https?:\/\//i.test(t))
            if (url) {
                const ytId = parseYouTubeId(url)
                if (ytId) {
                    useBlocksStore.getState().upsert({
                        id: uuid(), canvasId, userId, kind: 'video',
                        x: origin.x - 160, y: origin.y - 100,
                        w: 320, h: 200, z: 0,
                        content: { kind: 'video', data: { provider: 'youtube', videoId: ytId } },
                        createdAt: now, updatedAt: now,
                    }, true)
                } else {
                    useBlocksStore.getState().upsert({
                        id: uuid(), canvasId, userId, kind: 'link',
                        x: origin.x - 160, y: origin.y - 60,
                        w: 320, h: 120, z: 0,
                        content: { kind: 'link', data: { url } },
                        createdAt: now, updatedAt: now,
                    }, true)
                }
            }
        }
    }, [rf, canvasId, userId])

    const onDragOver = useCallback((e: React.DragEvent) => {
        if (e.dataTransfer?.types?.includes('Files') || e.dataTransfer?.types?.includes('text/uri-list')) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
        }
    }, [])

    // Zone draw: drag rectangle on canvas
    const [drawing, setDrawing] = useState<{ startX: number; startY: number; x: number; y: number; w: number; h: number } | null>(null)
    const onPaneMouseDown = useCallback((e: React.MouseEvent) => {
        if (mode !== 'zoneDraw') return
        if (e.button !== 0) return
        const w = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        setDrawing({ startX: w.x, startY: w.y, x: w.x, y: w.y, w: 0, h: 0 })
        e.stopPropagation()
    }, [mode, rf])

    useEffect(() => {
        if (!drawing) return
        const move = (ev: MouseEvent) => {
            const w = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY })
            setDrawing((d) => {
                if (!d) return d
                const x = Math.min(d.startX, w.x)
                const y = Math.min(d.startY, w.y)
                return { ...d, x, y, w: Math.abs(w.x - d.startX), h: Math.abs(w.y - d.startY) }
            })
        }
        const up = () => {
            setDrawing((d) => {
                if (d && d.w > 30 && d.h > 30) {
                    const now = new Date().toISOString()
                    const z: Zone = {
                        id: uuid(), canvasId, userId,
                        name: 'Zone',
                        color: '#6366f1',
                        pattern: 'none',
                        bounds: { x: d.x, y: d.y, w: d.w, h: d.h },
                        createdAt: now, updatedAt: now,
                    }
                    upsertZone(z, true)
                    window.electronAPI.canvas.upsertZone(z).catch(() => {})
                }
                return null
            })
            setMode('select')
            window.removeEventListener('mousemove', move)
            window.removeEventListener('mouseup', up)
        }
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
        return () => {
            window.removeEventListener('mousemove', move)
            window.removeEventListener('mouseup', up)
        }
    }, [drawing, rf, canvasId, userId, upsertZone, setMode])

    // sync viewport from store → RF
    useEffect(() => {
        rf.setViewport({ x: viewport.x, y: viewport.y, zoom: viewport.zoom })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasId])

    // Focus mode fade: update node style opacity
    const nodesForRender = useMemo(() => {
        if (!focusTouching) return nodes
        return nodes.map((n) => ({
            ...n,
            style: { ...n.style, opacity: focusTouching.has(n.id) ? 1 : 0.12 },
        }))
    }, [nodes, focusTouching])

    // ⌘L landmark toggle
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey
            const t = e.target as HTMLElement | null
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return
            if (meta && e.key.toLowerCase() === 'l') {
                e.preventDefault()
                const sel = useCanvasStore.getState().selectedBlockIds
                for (const id of sel) {
                    const b = useBlocksStore.getState().byId[id]
                    if (b) useBlocksStore.getState().patch(id, { isLandmark: !b.isLandmark }, true)
                }
                return
            }
            if (meta && e.key.toLowerCase() === 'h') {
                e.preventDefault()
                const vp = rf.getViewport()
                window.electronAPI.canvas.update(canvasId, { homeViewport: { x: vp.x, y: vp.y, zoom: vp.zoom } }).catch(() => {})
                return
            }
            if (meta && e.key === '.') {
                e.preventDefault()
                setMode(mode === 'focus' ? 'select' : 'focus')
                return
            }
            if (!meta && (e.key === 'z' || e.key === 'Z')) {
                if (!t || (!t.isContentEditable && !/^(INPUT|TEXTAREA)$/.test(t.tagName))) {
                    e.preventDefault()
                    setMode(mode === 'zoneDraw' ? 'select' : 'zoneDraw')
                    return
                }
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [canvasId, mode, rf, setMode])

    // Export
    const onExport = useCallback(async (format: 'json' | 'png') => {
        if (format === 'json') {
            const payload = {
                schemaVersion: 1,
                canvasId,
                blocks: useBlocksStore.getState().getForCanvas(canvasId),
                connections: useConnectionsStore.getState().getForCanvas(canvasId),
                zones: useZonesStore.getState().getForCanvas(canvasId),
                exportedAt: new Date().toISOString(),
            }
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
            const href = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = href; a.download = `canvas-${canvasId}.json`; a.click()
            URL.revokeObjectURL(href)
            return
        }
        const el = wrapRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null
        if (!el) return
        const bounds = getNodesBounds(nodes)
        try {
            const dataUrl = await toPng(el, {
                backgroundColor: '#0a0a0a',
                pixelRatio: 2,
                width: Math.max(800, bounds.width + 200),
                height: Math.max(600, bounds.height + 200),
            })
            const a = document.createElement('a')
            a.href = dataUrl; a.download = `canvas-${canvasId}.png`; a.click()
        } catch (e) {
            console.error('[canvas] png export failed', e)
        }
    }, [canvasId, nodes])

    return (
        <div
            ref={wrapRef}
            className="w-full h-full relative"
            onDoubleClick={onPaneDoubleClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onMouseDown={onPaneMouseDown}
        >
            <ReactFlow
                nodes={nodesForRender}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={(_, e) => setSelectedEdgeId(e.id)}
                onEdgeContextMenu={(ev, e) => { ev.preventDefault(); edgeMenu.open(ev.clientX, ev.clientY, e.id) }}
                onPaneClick={() => { setSelectedEdgeId(null); edgeMenu.close() }}
                onMoveEnd={onMoveEnd}
                defaultViewport={viewport}
                minZoom={0.05}
                maxZoom={4}
                zoomOnDoubleClick={false}
                multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
                deleteKeyCode={null}
                panOnDrag={mode !== 'zoneDraw'}
                selectionOnDrag={mode === 'select'}
                fitView={false}
                onlyRenderVisibleElements
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
                <Controls showInteractive={false} />
            </ReactFlow>

            <ZoneLayer canvasId={canvasId} />

            {drawing && (
                <DrawPreview d={drawing} />
            )}

            <CanvasToolbar canvasId={canvasId} onExport={onExport} />
            <SelectionToolbar canvasId={canvasId} userId={userId} onPromoteIdea={promoteIdea} />
            <SlashMenu ref={slashRef} canvasId={canvasId} userId={userId} />

            {selectedEdgeId && <EdgeInspector edgeId={selectedEdgeId} onClose={() => setSelectedEdgeId(null)} />}
            <EdgeContextMenu pos={edgeMenu.pos} onClose={edgeMenu.close} onOpenInspector={(id) => setSelectedEdgeId(id)} />

            <PipelineEngine canvasId={canvasId} userId={userId} />
        </div>
    )
}

function DrawPreview({ d }: { d: { x: number; y: number; w: number; h: number } }) {
    const rf = useReactFlow()
    const screenTL = rf.flowToScreenPosition({ x: d.x, y: d.y })
    const screenBR = rf.flowToScreenPosition({ x: d.x + d.w, y: d.y + d.h })
    return (
        <div
            className="absolute pointer-events-none border-2 border-dashed border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 rounded-lg z-10"
            style={{ left: screenTL.x, top: screenTL.y, width: screenBR.x - screenTL.x, height: screenBR.y - screenTL.y }}
        />
    )
}

export function CanvasSurface({ canvasId, userId }: { canvasId: string; userId: string }) {
    return (
        <ReactFlowProvider>
            <Inner canvasId={canvasId} userId={userId} />
        </ReactFlowProvider>
    )
}
