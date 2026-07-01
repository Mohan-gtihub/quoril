import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useNavigationStore, type NavSnapshot } from '@/store/navigationStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'

/**
 * Records the current drill-down location (route + active workspace/list/task)
 * into the navigation history whenever any of them change. Mount once, inside
 * the Router. Returns null — it's an effect-only component.
 */
export function useNavHistoryTracker() {
    const location = useLocation()
    const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
    const listId = useListStore((s) => s.selectedListId)
    const taskId = useTaskStore((s) => s.selectedTaskId)
    const record = useNavigationStore((s) => s.record)

    useEffect(() => {
        record({ path: location.pathname, workspaceId, listId, taskId })
    }, [location.pathname, workspaceId, listId, taskId, record])
}

/** Effect-only component: mount once inside the Router to track navigation. */
export function NavHistoryTracker(): null {
    useNavHistoryTracker()
    return null
}

function applySnapshot(snap: NavSnapshot | null, navigate: (p: string) => void) {
    if (!snap) return
    // Apply all selections in one synchronous batch so the tracker records a
    // single combined snapshot (which then matches the history entry → no-op).
    useWorkspaceStore.getState().setActiveWorkspace(snap.workspaceId)
    useListStore.getState().setSelectedList(snap.listId)
    useTaskStore.getState().setSelectedTask(snap.taskId)
    navigate(snap.path)
}

/** Back/forward controls + their enabled state for the nav buttons. */
export function useNavHistory() {
    const navigate = useNavigate()
    const goBack = useNavigationStore((s) => s.goBack)
    const goForward = useNavigationStore((s) => s.goForward)
    const canBack = useNavigationStore((s) => s.index > 0)
    const canForward = useNavigationStore((s) => s.index < s.entries.length - 1)

    return {
        canBack,
        canForward,
        back: () => applySnapshot(goBack(), navigate),
        forward: () => applySnapshot(goForward(), navigate),
    }
}
