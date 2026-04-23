import { useMemo, useRef, useState } from 'react'
import { useViewport, useReactFlow } from '@xyflow/react'
import { useZonesStore } from '@/store/canvas/zonesStore'
import type { Zone, ZonePattern } from '@/types/canvas'
import { Trash2, X } from 'lucide-react'

const PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6']
const PATTERNS: ZonePattern[] = ['none', 'dots', 'grid', 'noise']

function patternStyle(color: string, pattern: ZonePattern): React.CSSProperties {
    const alpha = 'cc'
    switch (pattern) {
        case 'dots':
            return {
                backgroundImage: `radial-gradient(${color}${alpha} 1.5px, transparent 1.5px)`,
                backgroundSize: '18px 18px',
                backgroundColor: `${color}18`,
            }
        case 'grid':
            return {
                backgroundImage: `linear-gradient(${color}${alpha} 1px, transparent 1px), linear-gradient(90deg, ${color}${alpha} 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
                backgroundColor: `${color}14`,
            }
        case 'noise':
            return {
                backgroundColor: `${color}22`,
                backgroundImage: `radial-gradient(${color}55 0.5px, transparent 0.5px)`,
                backgroundSize: '4px 4px',
            }
        default:
            return { backgroundColor: `${color}20` }
    }
}

export function ZoneLayer({ canvasId }: { canvasId: string }) {
    const zones = useZonesStore((s) => s.getForCanvas(canvasId))
    const autoHints = useZonesStore((s) => s.autoHints)
    const { x, y, zoom } = useViewport()
    const rf = useReactFlow()
    const [editing, setEditing] = useState<string | null>(null)
    const resizingRef = useRef<{ id: string; corner: string; start: { mx: number; my: number; bounds: any } } | null>(null)

    const onMouseDown = (e: React.MouseEvent, zone: Zone, corner: string) => {
        e.stopPropagation()
        e.preventDefault()
        resizingRef.current = {
            id: zone.id, corner,
            start: { mx: e.clientX, my: e.clientY, bounds: { ...zone.bounds } },
        }

        const move = (ev: MouseEvent) => {
            const st = resizingRef.current
            if (!st) return
            const dx = (ev.clientX - st.start.mx) / zoom
            const dy = (ev.clientY - st.start.my) / zoom
            let { x: zx, y: zy, w, h } = st.start.bounds
            if (st.corner === 'move') { zx += dx; zy += dy }
            if (st.corner.includes('e')) { w += dx }
            if (st.corner.includes('w')) { zx += dx; w -= dx }
            if (st.corner.includes('s')) { h += dy }
            if (st.corner.includes('n')) { zy += dy; h -= dy }
            w = Math.max(80, w); h = Math.max(60, h)
            const cur = useZonesStore.getState().byId[st.id]
            if (!cur) return
            useZonesStore.getState().upsert({ ...cur, bounds: { x: zx, y: zy, w, h } }, true)
        }
        const up = () => {
            const st = resizingRef.current
            resizingRef.current = null
            window.removeEventListener('mousemove', move)
            window.removeEventListener('mouseup', up)
            if (st) {
                const cur = useZonesStore.getState().byId[st.id]
                if (cur) window.electronAPI.canvas.upsertZone(cur).catch(() => {})
            }
        }
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
    }

    const content = useMemo(() => {
        return zones.map((z) => {
            const color = z.color ?? PALETTE[0]
            const style: React.CSSProperties = {
                position: 'absolute',
                left: z.bounds.x,
                top: z.bounds.y,
                width: z.bounds.w,
                height: z.bounds.h,
                border: `1px dashed ${color}`,
                borderRadius: 8,
                ...patternStyle(color, z.pattern ?? 'none'),
                pointerEvents: 'auto',
            }
            return (
                <div key={z.id} style={style}>
                    <div
                        className="absolute top-1 left-2 text-[10px] uppercase tracking-wider font-semibold cursor-move select-none"
                        style={{ color }}
                        onMouseDown={(e) => onMouseDown(e, z, 'move')}
                        onDoubleClick={(e) => { e.stopPropagation(); setEditing(z.id) }}
                    >
                        {z.name || 'Zone'}
                    </div>
                    {/* resize handles */}
                    {(['nw', 'ne', 'sw', 'se'] as const).map((c) => (
                        <div
                            key={c}
                            onMouseDown={(e) => onMouseDown(e, z, c)}
                            style={{
                                position: 'absolute',
                                width: 10, height: 10,
                                background: color,
                                borderRadius: 2,
                                cursor: `${c}-resize`,
                                top: c.includes('n') ? -5 : undefined,
                                bottom: c.includes('s') ? -5 : undefined,
                                left: c.includes('w') ? -5 : undefined,
                                right: c.includes('e') ? -5 : undefined,
                            }}
                        />
                    ))}
                </div>
            )
        })
    }, [zones, zoom])

    const autoContent = autoHints.map((h) => (
        <div
            key={h.id}
            style={{
                position: 'absolute',
                left: h.bounds.x, top: h.bounds.y, width: h.bounds.w, height: h.bounds.h,
                border: '1px dotted rgba(255,255,255,0.25)',
                borderRadius: 8,
                pointerEvents: 'none',
            }}
        />
    ))

    const editingZone = editing ? zones.find((z) => z.id === editing) : null
    const editScreen = editingZone ? rf.flowToScreenPosition({ x: editingZone.bounds.x + editingZone.bounds.w, y: editingZone.bounds.y }) : null

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `translate(${x}px, ${y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            >
                {autoContent}
                {content}
            </div>
            {editingZone && editScreen && (
                <ZoneInspector
                    zone={editingZone}
                    screen={editScreen}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    )
}

function ZoneInspector({ zone, screen, onClose }: { zone: Zone; screen: { x: number; y: number }; onClose: () => void }) {
    const upsert = useZonesStore((s) => s.upsert)
    const remove = useZonesStore((s) => s.remove)
    const patch = (patchObj: Partial<Zone>) => {
        const next = { ...zone, ...patchObj, updatedAt: new Date().toISOString() } as Zone
        upsert(next, true)
        window.electronAPI.canvas.upsertZone(next).catch(() => {})
    }
    return (
        <div
            className="absolute z-30 w-56 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-md shadow-xl p-2 space-y-2"
            style={{ left: screen.x + 8, top: screen.y }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-1">
                <input
                    defaultValue={zone.name}
                    placeholder="Zone name"
                    onBlur={(e) => patch({ name: e.currentTarget.value })}
                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                />
                <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded"><X size={12} /></button>
            </div>
            <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Color</div>
                <div className="flex flex-wrap gap-1">
                    {PALETTE.map((c) => (
                        <button
                            key={c}
                            onClick={() => patch({ color: c })}
                            className="w-4 h-4 rounded-full border border-black/20"
                            style={{ background: c, outline: zone.color === c ? '2px solid white' : undefined }}
                        />
                    ))}
                </div>
            </div>
            <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Pattern</div>
                <div className="flex gap-1">
                    {PATTERNS.map((p) => (
                        <button
                            key={p}
                            onClick={() => patch({ pattern: p })}
                            className={`flex-1 text-[10px] px-1 py-0.5 rounded border ${zone.pattern === p ? 'border-[var(--accent-primary)]' : 'border-[var(--border-default)]'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            <button
                onClick={() => {
                    remove(zone.id)
                    window.electronAPI.canvas.softDeleteZone(zone.id).catch(() => {})
                    onClose()
                }}
                className="w-full flex items-center justify-center gap-1 text-xs text-red-500 hover:bg-red-500/10 rounded px-2 py-1"
            >
                <Trash2 size={12} /> Delete zone
            </button>
        </div>
    )
}
