import { useEffect, useRef } from 'react'
import { v4 as uuid } from 'uuid'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useConnectionsStore } from '@/store/canvas/connectionsStore'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import type { Block } from '@/types/canvas'

/**
 * Execution Loop (plan §7):
 *   IDEA → TASK → FOCUS → FEEDBACK
 *
 * Wires focus-session end to an auto-TextBlock near the TaskRef that
 * triggered it, connected with a reference edge.
 */
export function useExecutionLoop(canvasId: string, userId: string) {
    const lastTaskIdRef = useRef<string | null>(null)
    const lastStartRef = useRef<number>(0)
    const wasActiveRef = useRef(false)

    useEffect(() => {
        const unsub = useFocusStore.subscribe((state, prev) => {
            // Track session start
            if (state.isActive && !prev.isActive) {
                lastTaskIdRef.current = state.taskId
                lastStartRef.current = Date.now()
                wasActiveRef.current = true
                return
            }
            // Session ended
            if (!state.isActive && prev.isActive && wasActiveRef.current) {
                wasActiveRef.current = false
                const endedTaskId = lastTaskIdRef.current ?? prev.taskId
                const durMin = Math.max(1, Math.round((Date.now() - lastStartRef.current) / 60000))
                if (!endedTaskId) return

                const blocks = useBlocksStore.getState().getForCanvas(canvasId)
                const ref = blocks.find(
                    (b) => b.kind === 'task_ref' &&
                        (b.linkedTaskId === endedTaskId ||
                            (b.content.kind === 'task_ref' && b.content.data.taskId === endedTaskId))
                )
                if (!ref) return

                const now = new Date().toISOString()
                const feedback: Block = {
                    id: uuid(),
                    canvasId, userId,
                    kind: 'text',
                    x: ref.x + ref.w + 40,
                    y: ref.y,
                    w: 240, h: 100, z: 0,
                    content: {
                        kind: 'text',
                        data: { doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Worked ${durMin}m ·` }] }] } },
                    },
                    createdAt: now, updatedAt: now,
                }
                useBlocksStore.getState().upsert(feedback, true)

                const conn = {
                    id: uuid(),
                    canvasId, userId,
                    fromBlockId: ref.id,
                    toBlockId: feedback.id,
                    fromAnchor: 'auto' as const,
                    toAnchor: 'auto' as const,
                    kind: 'reference' as const,
                    createdAt: now,
                    updatedAt: now,
                }
                useConnectionsStore.getState().upsert(conn as any, true)
                window.electronAPI.canvas.upsertConnection(conn).catch(() => {})
            }
        })
        return () => unsub()
    }, [canvasId, userId])

    // Promote an Idea block to a Task
    const promoteIdea = async (ideaBlockId: string) => {
        const block = useBlocksStore.getState().byId[ideaBlockId]
        if (!block || block.kind !== 'idea') return
        const data = block.content.kind === 'idea' ? block.content.data : { text: '' }
        const text = (data as any).text?.trim() || 'Untitled task'
        const lists = useListStore.getState().lists
        const firstList = lists[0]
        if (!firstList) return
        const newTask = await useTaskStore.getState().createTask({
            title: text,
            list_id: firstList.id,
            user_id: userId,
        } as any, 'todo' as any)
        const taskId = (newTask as any)?.id
        if (!taskId) return
        useBlocksStore.getState().patch(ideaBlockId, {
            kind: 'task_ref',
            linkedTaskId: taskId,
            content: { kind: 'task_ref', data: { taskId } },
        }, true)
    }

    return { promoteIdea }
}
