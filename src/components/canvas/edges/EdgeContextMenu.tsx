import { useEffect, useState } from 'react'
import { useConnectionsStore } from '@/store/canvas/connectionsStore'
import type { ConnectionKind } from '@/types/canvas'
import { ConditionEditor } from '../pipeline/ConditionEditor'

type Pos = { x: number; y: number; edgeId: string } | null

export function useEdgeContextMenu() {
    const [pos, setPos] = useState<Pos>(null)
    const open = (x: number, y: number, edgeId: string) => setPos({ x, y, edgeId })
    const close = () => setPos(null)
    return { pos, open, close }
}

export function EdgeContextMenu({ pos, onClose, onOpenInspector }: { pos: { x: number; y: number; edgeId: string } | null; onClose: () => void; onOpenInspector: (id: string) => void }) {
    const conn = useConnectionsStore((s) => pos ? s.byId[pos.edgeId] : undefined)
    const upsert = useConnectionsStore((s) => s.upsert)
    const remove = useConnectionsStore((s) => s.remove)
    const [editingCondition, setEditingCondition] = useState(false)

    useEffect(() => {
        if (!pos) return
        const h = () => onClose()
        window.addEventListener('mousedown', h)
        window.addEventListener('scroll', h, true)
        return () => { window.removeEventListener('mousedown', h); window.removeEventListener('scroll', h, true) }
    }, [pos, onClose])

    if (!pos || !conn) return null

    const patch = (next: Partial<typeof conn>) => {
        const merged = { ...conn, ...next, updatedAt: new Date().toISOString() }
        upsert(merged, true)
        window.electronAPI.canvas.upsertConnection(merged).catch(() => {})
    }

    const setKind = (k: ConnectionKind) => { patch({ kind: k }); onClose() }

    const itemCls = 'w-full text-left text-xs px-3 py-1.5 hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'

    return (
        <>
            <div
                className="fixed bg-[var(--bg-card)] border border-[var(--border-default)] rounded-md shadow-xl py-1 z-[99] min-w-[180px]"
                style={{ left: pos.x, top: pos.y }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Change type</div>
                <button className={itemCls} onClick={() => setKind('reference')}>Reference</button>
                <button className={itemCls} onClick={() => setKind('flow')}>Flow</button>
                <button className={itemCls} onClick={() => setKind('dependency')}>Dependency</button>
                <div className="h-px bg-[var(--border-default)] my-1" />
                <button className={itemCls} onClick={() => { onOpenInspector(conn.id); onClose() }}>Inspector…</button>
                <button
                    className={`${itemCls} ${conn.kind !== 'dependency' ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => setEditingCondition(true)}
                    title={conn.kind !== 'dependency' ? 'Only dependency edges' : ''}
                >
                    {conn.condition ? 'Edit condition…' : 'Add condition…'}
                </button>
                <button className={itemCls} onClick={() => { patch({ fromBlockId: conn.toBlockId, toBlockId: conn.fromBlockId }); onClose() }}>Reverse direction</button>
                <div className="h-px bg-[var(--border-default)] my-1" />
                <button className={`${itemCls} text-red-500`} onClick={() => {
                    remove(conn.id)
                    window.electronAPI.canvas.softDeleteConnection(conn.id).catch(() => {})
                    onClose()
                }}>Delete</button>
            </div>

            {editingCondition && (
                <ConditionEditor
                    connection={conn}
                    onSave={(cond) => { patch({ condition: cond }); setEditingCondition(false); onClose() }}
                    onCancel={() => { setEditingCondition(false); onClose() }}
                />
            )}
        </>
    )
}
