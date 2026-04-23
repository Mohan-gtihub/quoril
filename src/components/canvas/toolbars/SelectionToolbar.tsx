import { useCanvasStore } from '@/store/canvas/canvasStore'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useReactFlow } from '@xyflow/react'
import { Copy, Trash2, Type, Target, Star } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import type { Block, BlockKind } from '@/types/canvas'

export function SelectionToolbar({
    canvasId,
    userId,
    onPromoteIdea,
}: {
    canvasId: string
    userId: string
    onPromoteIdea?: (id: string) => void
}) {
    const selected = useCanvasStore((s) => s.selectedBlockIds)
    const byId = useBlocksStore((s) => s.byId)
    const rf = useReactFlow()
    if (selected.length === 0) return null

    const blocks = selected.map((id) => byId[id]).filter(Boolean) as Block[]
    if (blocks.length === 0) return null

    const minX = Math.min(...blocks.map((b) => b.x))
    const minY = Math.min(...blocks.map((b) => b.y))
    const screen = rf.flowToScreenPosition({ x: minX, y: minY })

    const duplicate = () => {
        const ids: string[] = []
        for (const b of blocks) {
            const c: Block = { ...b, id: uuid(), x: b.x + 20, y: b.y + 20, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            useBlocksStore.getState().upsert(c, true)
            ids.push(c.id)
        }
        useCanvasStore.getState().setSelected(ids)
    }
    const remove = () => {
        for (const id of selected) useBlocksStore.getState().remove(id)
        useCanvasStore.getState().clearSelection()
        window.electronAPI.canvas.softDeleteBlocksBatch(selected).catch(() => {})
    }
    const convertTo = (kind: BlockKind) => {
        const b = blocks[0]
        const content =
            kind === 'text' ? { kind: 'text' as const, data: { doc: null } } :
            kind === 'idea' ? { kind: 'idea' as const, data: { text: '' } } :
            b.content
        useBlocksStore.getState().patch(b.id, { kind, content }, true)
    }

    return (
        <div
            className="absolute z-20 flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] shadow-lg"
            style={{ left: screen.x, top: Math.max(4, screen.y - 40) }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {blocks.length === 1 && blocks[0].kind === 'idea' && (
                <>
                    <button className="p-1 hover:bg-[var(--bg-hover)] rounded" title="Convert to Text" onClick={() => convertTo('text')}>
                        <Type size={14} />
                    </button>
                    {onPromoteIdea && (
                        <button
                            className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--accent-primary)]"
                            title="Promote to Task"
                            onClick={() => onPromoteIdea(blocks[0].id)}
                        >
                            <Target size={14} />
                        </button>
                    )}
                </>
            )}
            <button
                className="p-1 hover:bg-[var(--bg-hover)] rounded"
                title="Toggle landmark (⌘L)"
                onClick={() => {
                    for (const b of blocks) {
                        useBlocksStore.getState().patch(b.id, { isLandmark: !b.isLandmark }, true)
                    }
                }}
            >
                <Star size={14} className={blocks.every((b) => b.isLandmark) ? 'fill-yellow-400 text-yellow-400' : ''} />
            </button>
            <button className="p-1 hover:bg-[var(--bg-hover)] rounded" title="Duplicate (⌘D)" onClick={duplicate}>
                <Copy size={14} />
            </button>
            <button className="p-1 hover:bg-[var(--bg-hover)] rounded text-red-500" title="Delete" onClick={remove}>
                <Trash2 size={14} />
            </button>
            <span className="text-[10px] text-[var(--text-muted)] px-1">{blocks.length}</span>
            <input type="hidden" data-canvas={canvasId} data-user={userId} />
        </div>
    )
}
