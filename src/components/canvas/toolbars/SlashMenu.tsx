import { forwardRef, useImperativeHandle, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { v4 as uuid } from 'uuid'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useCanvasStore } from '@/store/canvas/canvasStore'
import type { Block, BlockKind } from '@/types/canvas'
import { FileText, Lightbulb, Image as ImageIcon, Link as LinkIcon, ListChecks, Video, Target } from 'lucide-react'

type Handle = { open: (at: { x: number; y: number }, blockId?: string) => void }

const KINDS: { kind: BlockKind; label: string; icon: React.ReactNode; w: number; h: number }[] = [
    { kind: 'idea', label: 'Idea', icon: <Lightbulb size={14} />, w: 200, h: 120 },
    { kind: 'text', label: 'Text', icon: <FileText size={14} />, w: 280, h: 160 },
    { kind: 'checklist', label: 'Checklist', icon: <ListChecks size={14} />, w: 260, h: 160 },
    { kind: 'link', label: 'Link', icon: <LinkIcon size={14} />, w: 320, h: 100 },
    { kind: 'image', label: 'Image', icon: <ImageIcon size={14} />, w: 300, h: 200 },
    { kind: 'video', label: 'Video', icon: <Video size={14} />, w: 320, h: 200 },
    { kind: 'task_ref', label: 'Task', icon: <Target size={14} />, w: 280, h: 140 },
]

function blankContent(kind: BlockKind): any {
    switch (kind) {
        case 'idea': return { kind: 'idea', data: { text: '' } }
        case 'text': return { kind: 'text', data: { doc: null } }
        case 'checklist': return { kind: 'checklist', data: { items: [] } }
        case 'link': return { kind: 'link', data: { url: '' } }
        case 'image': return { kind: 'image', data: { src: '' } }
        case 'video': return { kind: 'video', data: { provider: 'youtube', videoId: '' } }
        case 'task_ref': return { kind: 'task_ref', data: { taskId: '' } }
    }
}

export const SlashMenu = forwardRef<Handle, { canvasId: string; userId: string }>(function SlashMenu(
    { canvasId, userId },
    ref
) {
    const rf = useReactFlow()
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState({ x: 0, y: 0 })
    const [replaceId, setReplaceId] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
        open: (at, blockId) => {
            const sel = useCanvasStore.getState().selectedBlockIds
            const targetId = blockId ?? sel[0] ?? null
            if (targetId) {
                const b = useBlocksStore.getState().byId[targetId]
                if (b) {
                    const scr = rf.flowToScreenPosition({ x: b.x, y: b.y })
                    setPos({ x: scr.x, y: scr.y + 24 })
                    setReplaceId(targetId)
                    setOpen(true)
                    return
                }
            }
            setPos(at.x === 0 && at.y === 0 ? { x: window.innerWidth / 2 - 120, y: window.innerHeight / 2 - 120 } : at)
            setReplaceId(null)
            setOpen(true)
        },
    }))

    if (!open) return null

    const pick = (kind: BlockKind, w: number, h: number) => {
        if (replaceId) {
            useBlocksStore.getState().patch(replaceId, { kind, content: blankContent(kind) }, true)
        } else {
            const world = rf.screenToFlowPosition({ x: pos.x, y: pos.y })
            const now = new Date().toISOString()
            const b: Block = {
                id: uuid(),
                canvasId, userId,
                kind, x: world.x, y: world.y, w, h, z: 0,
                content: blankContent(kind),
                createdAt: now, updatedAt: now,
            }
            useBlocksStore.getState().upsert(b, true)
            useCanvasStore.getState().setSelected([b.id])
        }
        setOpen(false)
    }

    return (
        <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div
                className="fixed z-40 w-56 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-md shadow-xl p-1"
                style={{ left: pos.x, top: pos.y }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {replaceId ? 'Convert block to…' : 'Insert block'}
                </div>
                {KINDS.map((k) => (
                    <button
                        key={k.kind}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-[var(--bg-hover)] rounded"
                        onClick={() => pick(k.kind, k.w, k.h)}
                    >
                        {k.icon}
                        <span>{k.label}</span>
                    </button>
                ))}
            </div>
        </>
    )
})
