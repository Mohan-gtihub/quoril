import { useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import { v4 as uuid } from 'uuid'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useCanvasStore } from '@/store/canvas/canvasStore'
import { useHistoryStore } from '@/store/canvas/historyStore'
import type { Block } from '@/types/canvas'

function isEditable(el: EventTarget | null): boolean {
    const t = el as HTMLElement | null
    if (!t) return false
    if (t.isContentEditable) return true
    return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
}

export function useKeyboardShortcuts(canvasId: string, userId: string, openSlash?: () => void) {
    const rf = useReactFlow()

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (isEditable(e.target)) return
            const meta = e.metaKey || e.ctrlKey

            // Undo/redo
            if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault(); useHistoryStore.getState().undo(); return
            }
            if ((meta && e.key.toLowerCase() === 'z' && e.shiftKey) || (meta && e.key.toLowerCase() === 'y')) {
                e.preventDefault(); useHistoryStore.getState().redo(); return
            }

            // Duplicate
            if (meta && e.key.toLowerCase() === 'd') {
                e.preventDefault()
                const sel = useCanvasStore.getState().selectedBlockIds
                if (sel.length === 0) return
                const byId = useBlocksStore.getState().byId
                const newIds: string[] = []
                for (const id of sel) {
                    const src = byId[id]; if (!src) continue
                    const copy: Block = {
                        ...src,
                        id: uuid(),
                        x: src.x + 20,
                        y: src.y + 20,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    }
                    useBlocksStore.getState().upsert(copy, true)
                    newIds.push(copy.id)
                }
                useCanvasStore.getState().setSelected(newIds)
                return
            }

            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const sel = useCanvasStore.getState().selectedBlockIds
                if (sel.length === 0) return
                e.preventDefault()
                for (const id of sel) useBlocksStore.getState().remove(id)
                useCanvasStore.getState().clearSelection()
                window.electronAPI.canvas.softDeleteBlocksBatch(sel).catch(() => {})
                return
            }

            // Fit / 100%
            if (meta && e.key === '0') {
                e.preventDefault(); rf.fitView({ duration: 250 }); return
            }
            if (meta && e.key === '1') {
                e.preventDefault()
                const vp = rf.getViewport()
                rf.setViewport({ x: vp.x, y: vp.y, zoom: 1 }, { duration: 250 })
                return
            }

            // Slash menu
            if (e.key === '/' && openSlash) {
                e.preventDefault(); openSlash(); return
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [canvasId, userId, rf, openSlash])
}
