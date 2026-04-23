import { useConnectionsStore } from '@/store/canvas/connectionsStore'
import type { Connection, ConnectionKind } from '@/types/canvas'
import { EDGE_COLORS } from './CanvasEdges'
import { X } from 'lucide-react'
import { useState } from 'react'
import { ConditionEditor } from '../pipeline/ConditionEditor'

const KINDS: { value: ConnectionKind; label: string; desc: string }[] = [
    { value: 'reference', label: 'Reference', desc: 'Related' },
    { value: 'flow', label: 'Flow', desc: 'Sequence' },
    { value: 'dependency', label: 'Dependency', desc: 'Must complete first' },
]

const COLOR_SWATCHES = ['#6366f1', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899', '#64748b']

export function EdgeInspector({ edgeId, onClose }: { edgeId: string; onClose: () => void }) {
    const conn = useConnectionsStore((s) => s.byId[edgeId])
    const upsert = useConnectionsStore((s) => s.upsert)
    const [editingCondition, setEditingCondition] = useState(false)
    if (!conn) return null

    const patch = (next: Partial<Connection>) => {
        const merged = { ...conn, ...next, updatedAt: new Date().toISOString() }
        upsert(merged, true)
        window.electronAPI.canvas.upsertConnection(merged).catch(() => {})
    }

    const setKind = (kind: ConnectionKind) => patch({ kind })
    const setLabel = (label: string) => patch({ label: label || undefined })
    const setColor = (color: string) => patch({ style: { ...(conn.style ?? {}), color } })
    const toggleDashed = () => patch({ style: { ...(conn.style ?? {}), dashed: !(conn.style?.dashed) } })
    const setWidth = (w: number) => patch({ style: { ...(conn.style ?? {}), width: w } })
    const reverse = () => patch({ fromBlockId: conn.toBlockId, toBlockId: conn.fromBlockId })

    const c = conn.style?.color ?? EDGE_COLORS[conn.kind]

    return (
        <div
            className="absolute top-4 right-4 w-72 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-xl z-30 p-3 space-y-3"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Connection</div>
                <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded"><X className="w-3.5 h-3.5" /></button>
            </div>

            <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Type</div>
                <div className="grid grid-cols-3 gap-1">
                    {KINDS.map((k) => (
                        <button key={k.value} onClick={() => setKind(k.value)}
                            className={`text-[10px] px-2 py-1.5 rounded border ${conn.kind === k.value ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'border-[var(--border-default)] hover:bg-[var(--bg-hover)]'}`}>
                            <div className="font-medium text-[var(--text-primary)]">{k.label}</div>
                            <div className="text-[9px] text-[var(--text-muted)]">{k.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Label</div>
                <input
                    type="text"
                    defaultValue={conn.label ?? ''}
                    placeholder="optional…"
                    onBlur={(e) => setLabel(e.currentTarget.value)}
                    className="w-full text-xs px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] outline-none text-[var(--text-primary)]"
                />
            </div>

            <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Color</div>
                <div className="flex gap-1 flex-wrap">
                    {COLOR_SWATCHES.map((s) => (
                        <button key={s} onClick={() => setColor(s)} className="w-5 h-5 rounded border border-black/20" style={{ background: s, outline: c === s ? '2px solid var(--text-primary)' : 'none' }} />
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <label className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <input type="checkbox" checked={!!conn.style?.dashed} onChange={toggleDashed} />
                    Dashed
                </label>
                <label className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 ml-auto">
                    Width
                    <input type="range" min={1} max={6} step={0.5} value={conn.style?.width ?? (conn.kind === 'dependency' ? 3 : 1.5)} onChange={(e) => setWidth(Number(e.currentTarget.value))} />
                </label>
            </div>

            <div className="flex gap-2">
                <button onClick={reverse} className="flex-1 text-xs px-2 py-1.5 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]">Reverse</button>
                <button
                    onClick={() => setEditingCondition(true)}
                    className={`flex-1 text-xs px-2 py-1.5 rounded ${conn.condition ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'}`}
                    disabled={conn.kind !== 'dependency'}
                    title={conn.kind !== 'dependency' ? 'Only dependency edges support conditions' : ''}
                >
                    {conn.condition ? 'Edit condition' : 'Add condition'}
                </button>
            </div>

            {conn.condition && (
                <div className="text-[10px] text-[var(--text-muted)] p-2 bg-[var(--bg-elevated)] rounded">
                    <b className="text-[var(--text-primary)]">{conn.condition.trigger}</b> → {conn.condition.action}
                    {conn.condition.params?.minMinutes !== undefined && ` (≥ ${conn.condition.params.minMinutes}min)`}
                    {conn.condition.params?.thresholdPct !== undefined && ` (≥ ${conn.condition.params.thresholdPct}%)`}
                    <button onClick={() => patch({ condition: undefined })} className="ml-2 text-[var(--text-muted)] hover:text-red-500">remove</button>
                </div>
            )}

            {editingCondition && (
                <ConditionEditor
                    connection={conn}
                    onSave={(cond) => { patch({ condition: cond }); setEditingCondition(false) }}
                    onCancel={() => setEditingCondition(false)}
                />
            )}
        </div>
    )
}
