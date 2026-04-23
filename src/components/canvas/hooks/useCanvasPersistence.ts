import { useEffect, useRef } from 'react'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useCanvasStore } from '@/store/canvas/canvasStore'

const FLUSH_MS = 400

export function useCanvasPersistence(canvasId: string) {
    const timer = useRef<number | null>(null)
    const lastDirtyCount = useRef(0)

    const flush = async () => {
        const dirty = useBlocksStore.getState().getDirty()
        if (dirty.length === 0) return
        const ids = dirty.map((b) => b.id)
        try {
            await window.electronAPI.canvas.upsertBlocksBatch(dirty)
            useBlocksStore.getState().clearDirty(ids)
        } catch (e) {
            console.error('[canvas] flush blocks failed', e)
        }
    }

    // Poll dirty → schedule debounced flush
    useEffect(() => {
        const i = window.setInterval(() => {
            const dirty = useBlocksStore.getState().dirty
            if (dirty.size === 0) { lastDirtyCount.current = 0; return }
            if (dirty.size !== lastDirtyCount.current) {
                lastDirtyCount.current = dirty.size
                if (timer.current) window.clearTimeout(timer.current)
                timer.current = window.setTimeout(flush, FLUSH_MS)
            }
        }, 150)
        return () => window.clearInterval(i)
    }, [])

    // Persist viewport on change (debounced)
    useEffect(() => {
        const unsub = useCanvasStore.subscribe((state, prev) => {
            if (state.viewport === prev.viewport) return
            if (!canvasId) return
            window.clearTimeout((useCanvasPersistence as any)._vpT)
            ;(useCanvasPersistence as any)._vpT = window.setTimeout(() => {
                window.electronAPI.canvas.update(canvasId, { viewport: useCanvasStore.getState().viewport }).catch(() => {})
            }, 600)
        })
        return () => unsub()
    }, [canvasId])

    // Force flush on unmount / beforeunload
    useEffect(() => {
        const onBeforeUnload = () => { flush() }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload)
            flush()
        }
    }, [canvasId])
}
