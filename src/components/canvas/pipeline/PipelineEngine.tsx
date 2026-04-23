import { useEffect } from 'react'
import { useConnectionsStore } from '@/store/canvas/connectionsStore'
import { useBlocksStore } from '@/store/canvas/blocksStore'
import { useTaskStore } from '@/store/taskStore'
import { useFocusStore } from '@/store/focusStore'
import type { Block, Connection, EdgeCondition } from '@/types/canvas'
import toast from 'react-hot-toast'

/**
 * Listens to taskStore + focusStore + blocksStore. When an upstream block's
 * status changes, walks outbound dependency edges and fires their conditions.
 *
 * Idempotent via condition.lastFiredAt.
 */
export function PipelineEngine({ canvasId, userId }: { canvasId: string; userId: string }) {
    useEffect(() => {
        const evaluate = () => {
            const conns = useConnectionsStore.getState().getForCanvas(canvasId)
            const blocksById = useBlocksStore.getState().byId
            const tasks = useTaskStore.getState().tasks
            const tasksById = new Map(tasks.map((t: any) => [t.id, t]))

            // Build outgoing dep map
            const outgoing = new Map<string, Connection[]>()
            const incoming = new Map<string, Connection[]>()
            for (const c of conns) {
                if (c.kind !== 'dependency' || !c.condition) continue
                const a = outgoing.get(c.fromBlockId) ?? []; a.push(c); outgoing.set(c.fromBlockId, a)
                const b = incoming.get(c.toBlockId) ?? []; b.push(c); incoming.set(c.toBlockId, b)
            }

            const firedNow: Connection[] = []

            // Lock targets of any unmet dependency condition so users see waiting state.
            for (const [targetId, incs] of incoming) {
                const anyUnmet = incs.some((c) => c.condition && !c.condition.lastFiredAt)
                const tgt = blocksById[targetId]
                if (!tgt) continue
                const currentlyLocked = (tgt.style as any)?.locked === true
                if (anyUnmet && !currentlyLocked) {
                    useBlocksStore.getState().patch(targetId, { style: { ...(tgt.style ?? {}), ...({ locked: true } as any) } }, true)
                }
            }

            for (const conn of conns) {
                if (conn.kind !== 'dependency') continue
                const cond = conn.condition
                if (!cond || cond.lastFiredAt) continue

                const src = blocksById[conn.fromBlockId]
                if (!src) continue
                const tgt = blocksById[conn.toBlockId]
                if (!tgt) continue

                if (evaluateCondition(cond, src, tgt, tasksById, incoming.get(conn.toBlockId) ?? [], blocksById)) {
                    firedNow.push(conn)
                }
            }

            if (firedNow.length === 0) return

            const ts = new Date().toISOString()
            for (const conn of firedNow) {
                const cond = conn.condition!
                const tgt = blocksById[conn.toBlockId]
                applyAction(cond.action, tgt)

                const merged: Connection = { ...conn, condition: { ...cond, lastFiredAt: ts }, updatedAt: ts }
                useConnectionsStore.getState().upsert(merged, true)
                window.electronAPI.canvas.upsertConnection(merged).catch(() => {})
            }
        }

        // Initial pass
        evaluate()

        // Subscribe to stores. Zustand v4: store.subscribe(selector, listener, {equalityFn})
        // We don't want a heavy dep on subscribeWithSelector middleware, so just
        // subscribe broadly and debounce.
        let t: ReturnType<typeof setTimeout> | null = null
        const schedule = () => { if (t) clearTimeout(t); t = setTimeout(evaluate, 120) }

        const unsubTasks = useTaskStore.subscribe(schedule)
        const unsubFocus = useFocusStore.subscribe(schedule)
        const unsubBlocks = useBlocksStore.subscribe(schedule)
        const unsubConns = useConnectionsStore.subscribe(schedule)

        return () => {
            if (t) clearTimeout(t)
            unsubTasks(); unsubFocus(); unsubBlocks(); unsubConns()
        }
    }, [canvasId, userId])

    return null
}

function evaluateCondition(
    cond: EdgeCondition,
    src: Block,
    _tgt: Block,
    tasksById: Map<string, any>,
    incomingDeps: Connection[],
    blocksById: Record<string, Block>,
): boolean {
    const srcTaskId = src.linkedTaskId || (src.content.kind === 'task_ref' ? src.content.data.taskId : undefined)
    const srcTask = srcTaskId ? tasksById.get(srcTaskId) : undefined

    switch (cond.trigger) {
        case 'task_completed':
            return !!srcTask && (srcTask.status === 'completed' || srcTask.completed === true || !!srcTask.completedAt)
        case 'task_started':
            return !!srcTask && (srcTask.status === 'in_progress' || (srcTask.spent_s ?? 0) > 0)
        case 'focus_session_ended': {
            if (!srcTask) return false
            const mins = Math.floor(((srcTask.spent_s ?? 0) as number) / 60)
            const focus = useFocusStore.getState() as any
            const sessionActive = focus?.currentSession?.taskId === srcTaskId
            return mins >= (cond.params?.minMinutes ?? 1) && !sessionActive
        }
        case 'checklist_complete': {
            if (src.content.kind !== 'checklist') return false
            const items = src.content.data.items
            return items.length > 0 && items.every((i) => i.done)
        }
        case 'checklist_threshold': {
            if (src.content.kind !== 'checklist') return false
            const items = src.content.data.items
            if (items.length === 0) return false
            const pct = (items.filter((i) => i.done).length / items.length) * 100
            return pct >= (cond.params?.thresholdPct ?? 100)
        }
        case 'all_upstream_met': {
            // All inbound deps into target must have a met condition OR the upstream block
            // must satisfy task_completed by default.
            for (const inc of incomingDeps) {
                const incSrc = blocksById[inc.fromBlockId]
                if (!incSrc) return false
                const incTaskId = incSrc.linkedTaskId || (incSrc.content.kind === 'task_ref' ? incSrc.content.data.taskId : undefined)
                const incTask = incTaskId ? tasksById.get(incTaskId) : undefined
                const done = !!incTask && (incTask.status === 'completed' || incTask.completed === true || !!incTask.completedAt)
                if (!done) return false
            }
            return true
        }
        case 'manual':
            return false
    }
}

function applyAction(action: EdgeCondition['action'], target: Block) {
    const patch = useBlocksStore.getState().patch
    switch (action) {
        case 'unlock': {
            patch(target.id, { style: { ...(target.style ?? {}), ...({ locked: false } as any) } }, true)
            toast.success('Unlocked')
            break
        }
        case 'mark_ready': {
            patch(target.id, { style: { ...(target.style ?? {}), ...({ pulsing: true } as any) } }, true)
            toast('Ready')
            setTimeout(() => {
                const cur = useBlocksStore.getState().byId[target.id]
                if (cur) patch(target.id, { style: { ...(cur.style ?? {}), ...({ pulsing: false } as any) } }, true)
            }, 4000)
            break
        }
        case 'auto_start_focus': {
            const taskId = target.linkedTaskId || (target.content.kind === 'task_ref' ? target.content.data.taskId : undefined)
            if (!taskId) { toast('No task linked to start'); return }
            try {
                const focus = useFocusStore.getState() as any
                if (typeof focus.startSession === 'function') focus.startSession(taskId)
                toast.success('Focus session started')
            } catch {
                toast.error('Could not start session')
            }
            break
        }
        case 'promote_idea_to_task': {
            toast('Promote idea → task (use drag-to-zone)')
            break
        }
    }
}
