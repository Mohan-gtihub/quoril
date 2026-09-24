import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'
import { useFocusStore } from '@/store/focusStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import type { TaskColumn } from '@/types/list'
import type { Task } from '@/types/database'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailsPanel } from './TaskDetailsPanel'
import { TaskCard } from './TaskCard'
import { PlannerHeader } from './PlannerHeader'
import { usePlannerStore } from '@/store/plannerStore'
import { isSameDay, startOfToday, format } from 'date-fns'
import toast from 'react-hot-toast'
import { confirm } from '@/components/ui/ConfirmDialog'
import { getPlannerTaskBuckets } from './plannerBuckets'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { NicknameNudge } from './NicknameNudge'

interface ColumnDef {
    id: TaskColumn
    title: string
    subtitle: string
    color: string
}

// -- Single, unified column shell --------------------------------------------
// One component renders every column so the four columns read as one system
// (they used to be two divergent shells side-by-side, which looked broken).
// "Today" is an accent variant: wider, lime dot + hairline, and a sticky
// Start-focus footer. Everything else is the quiet neutral tile.
function BoardColumn({
    column,
    tasks,
    onBlitz,
    setShowCreateModal,
    onTaskComplete,
    progress
}: {
    column: ColumnDef
    tasks: Task[]
    onBlitz: (task: Task) => void
    setShowCreateModal: (opts: { column: TaskColumn, position: 'top' | 'bottom' }) => void
    onTaskComplete: (id: string, col: TaskColumn) => void
    progress?: number
}) {
    // `isOver` drives the drop-target highlight — without it a drag gave no
    // feedback about where it would land, a big part of why it "felt broken".
    const { setNodeRef, isOver } = useDroppable({ id: column.id })
    const { hideEstDoneTimes } = useSettingsStore()

    const isToday = column.id === 'today'
    const isDone = column.id === 'done'
    const count = tasks.length
    const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0)
    const displayProgress = progress ?? Math.min(100, count * 10)
    const showProgress = column.id === 'this_week' || column.id === 'today'

    const formatTime = (minutes: number) => {
        if (minutes === 0) return '0m'
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    }

    return (
        <div
            ref={setNodeRef}
            className={[
                'group/col flex flex-col h-full flex-shrink-0 overflow-hidden',
                'rounded-[var(--radius-tile)] border bg-[var(--bg-card)]',
                'transition-[box-shadow,border-color,transform] duration-200',
                isToday
                    ? 'w-80 lg:w-96 min-w-[288px] border-[var(--accent-primary)]/25 shadow-[var(--shadow-soft)]'
                    : 'w-64 lg:w-72 min-w-[248px] border-[var(--border-default)]',
                // Drop-target affordance: a clear ring + faint accent wash.
                isOver ? 'ring-2 ring-[var(--accent-primary)]/50 border-transparent' : '',
            ].join(' ')}
        >
            {/* Today gets a slim accent hairline along the top edge. */}
            {isToday && <div className="h-[3px] w-full bg-[var(--accent-primary)] flex-shrink-0" />}

            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${column.color}`} />
                        <div className="min-w-0">
                            <h2 className="text-[15px] font-semibold leading-none tracking-tight truncate text-[var(--text-primary)]">{column.title}</h2>
                            <p className="text-[11px] font-medium truncate text-[var(--text-muted)] mt-1.5">{column.subtitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">
                            {isDone
                                ? `${count} done`
                                : (!hideEstDoneTimes && totalMinutes > 0 ? formatTime(totalMinutes) : count || '')}
                        </span>

                        {!isDone && (
                            <button
                                onClick={() => setShowCreateModal({ column: column.id, position: 'top' })}
                                className="w-7 h-7 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                title="Add task to top"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {showProgress && (
                    <div className="w-full h-1.5 rounded-full overflow-hidden mt-3.5 bg-[var(--track)]">
                        <motion.div
                            className={`h-full rounded-full ${isToday ? 'bg-[var(--accent-primary)]' : 'bg-[var(--text-tertiary)]'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${displayProgress}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                    </div>
                )}
            </div>

            {/* Task list — a `gap`-based flex column so spacing is uniform and
                never doubles/collapses. */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 custom-scrollbar flex flex-col">
                <SortableContext
                    id={column.id}
                    items={tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {isDone ? (
                        (() => {
                            const groupedByDay = tasks.reduce<Record<string, Task[]>>((acc, task) => {
                                // Stable created_at fallback (never updated_at, which drifts on edit).
                                const rawDate = task.completed_at || task.created_at || new Date().toISOString()
                                const dayKey = new Date(rawDate).toDateString()
                                    ; (acc[dayKey] ||= []).push(task)
                                return acc
                            }, {})

                            return Object.entries(groupedByDay)
                                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                                .map(([day, dayTasks]) => {
                                    const date = new Date(day)
                                    const dayIsToday = isSameDay(date, new Date())
                                    return (
                                        <div key={day}>
                                            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-tertiary)] mt-3 mb-2 px-1">
                                                <span>
                                                    {dayIsToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}
                                                    {', '}
                                                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="text-[var(--text-muted)] tabular-nums font-medium">
                                                    {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                                                </span>
                                            </div>
                                            {dayTasks.map(task => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    column={column.id}
                                                    onComplete={() => onTaskComplete(task.id, column.id)}
                                                />
                                            ))}
                                        </div>
                                    )
                                })
                        })()
                    ) : (
                        tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                column={column.id}
                                onComplete={() => onTaskComplete(task.id, column.id)}
                            />
                        ))
                    )}
                </SortableContext>

                {/* Empty state — becomes an active drop zone while dragging over. */}
                {count === 0 && (
                    <div
                        className={[
                            'flex-1 min-h-[160px] rounded-[var(--radius-card)] border border-dashed',
                            'flex flex-col items-center justify-center text-center px-4 transition-colors',
                            isOver
                                ? 'border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/[0.05]'
                                : 'border-[var(--border-default)]',
                        ].join(' ')}
                    >
                        <p className="text-sm font-semibold text-[var(--text-tertiary)]">
                            {isDone ? 'Nothing finished yet' : 'Nothing here'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            {isDone ? 'Completed tasks land here' : 'Drop a task or add one'}
                        </p>
                    </div>
                )}

                {/* Ghost add-row (non-Done, non-empty). */}
                {!isDone && count > 0 && (
                    <button
                        onClick={() => setShowCreateModal({ column: column.id, position: 'bottom' })}
                        className="w-full mt-1 py-2.5 rounded-[var(--radius-card)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add task
                    </button>
                )}
            </div>

            {/* Today footer — sticky Start-focus CTA (the accent lives here). */}
            {isToday && count > 0 && (
                <div className="p-3 border-t border-[var(--border-default)] flex-shrink-0">
                    <button
                        onClick={() => tasks[0] && onBlitz(tasks[0])}
                        className="w-full py-2.5 text-sm font-semibold rounded-full flex items-center justify-center gap-2 transition-all bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-105 active:scale-[0.98]"
                    >
                        Start focus
                    </button>
                </div>
            )}
        </div>
    )
}

export function Planner() {
    const navigate = useNavigate()
    const { selectedListId, lists } = useListStore()
    const { loadWorkspaceMembers, loadWorkspaceNicknames } = useWorkspaceStore()
    const { tasks, fetchTasks, moveTaskToColumn, reorderTasks, selectedTaskId, toggleComplete } = useTaskStore()
    const { startSession, isActive, taskId: activeFocusId, setShowFocusPanel, endSession } = useFocusStore()
    const { selectedDate } = usePlannerStore()

    const columns_def: ColumnDef[] = useMemo(() => {
        const isSelectedToday = isSameDay(selectedDate, startOfToday())
        const dayName = format(selectedDate, 'EEEE')
        return [
            { id: 'backlog', title: 'Backlog', subtitle: 'Idea Storage', color: 'bg-[var(--text-muted)]' },
            { id: 'this_week', title: 'This Week', subtitle: 'Short-term Plan', color: 'bg-[var(--text-muted)]' },
            { id: 'today', title: isSelectedToday ? 'Today' : dayName, subtitle: 'Execution Center', color: 'bg-[var(--accent-primary)]' },
            { id: 'done', title: 'Done', subtitle: 'History & Motivation', color: 'bg-[var(--text-muted)]' },
        ]
    }, [selectedDate])

    const selectedList = lists.find(l => l.id === selectedListId)
    const createListId = selectedListId && selectedListId !== 'all'
        ? selectedListId
        : (lists.find(l => l.id !== 'all')?.id || '')

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    // Derived state: Group tasks by column and calculate progress
    const { columns: tasksByColumn, progressMap } = useMemo(() => {
        return getPlannerTaskBuckets(tasks, selectedListId, lists, selectedDate)
    }, [tasks, selectedListId, lists, selectedDate])

    const [showCreateModal, setShowCreateModal] = useState<{ column: TaskColumn, position: 'top' | 'bottom' } | null>(null)
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const [activeColumn, setActiveColumn] = useState<TaskColumn>('today')

    // Initial fetch on mount or list change
    useEffect(() => {
        if (!selectedListId) {
            // Nothing selected (fresh install, or the selected list was deleted):
            // fall back to the cross-workspace "all" view rather than leaving the
            // planner with no selection, which used to strand it on a permanent
            // "Loading workspace..." screen.
            useListStore.setState({ selectedListId: 'all' })
            return
        }
        fetchTasks(selectedListId === 'all' ? undefined : selectedListId)
    }, [selectedListId, navigate, fetchTasks])

    // Load members + nicknames for every workspace the visible lists belong to,
    // so assignee badges (and the nickname nudge) can render across cards.
    const workspaceIdsKey = useMemo(
        () => [...new Set(lists.map(l => (l as any).workspace_id).filter(Boolean))].sort().join(','),
        [lists]
    )
    useEffect(() => {
        if (!workspaceIdsKey) return
        for (const id of workspaceIdsKey.split(',')) {
            loadWorkspaceMembers(id)
            loadWorkspaceNicknames(id)
        }
    }, [workspaceIdsKey, loadWorkspaceMembers, loadWorkspaceNicknames])

    // Workspace context for the nickname nudge: the selected list's workspace,
    // else the first workspace any visible list belongs to.
    const plannerWorkspaceId = useMemo(() => {
        const fromSelected = (selectedList as any)?.workspace_id
        if (fromSelected) return fromSelected as string
        return workspaceIdsKey ? workspaceIdsKey.split(',')[0] : null
    }, [selectedList, workspaceIdsKey])

    // No need for loadTasks anymore!

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        // tasksByColumn is derived, so we can search it
        let found: Task | null = null
        let foundColumn: TaskColumn = 'today'
        for (const [col, list] of Object.entries(tasksByColumn)) {
            const match = list.find(t => t.id === active.id)
            if (match) {
                found = match
                foundColumn = col as TaskColumn
                break
            }
        }
        setActiveTask(found)
        setActiveColumn(foundColumn)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveTask(null)

        if (!over || !selectedListId) return

        const taskId = active.id as string
        let targetColumn = over.id as TaskColumn

        // Check if we dropped over a task instead of a column
        const isColumn = columns_def.some(c => c.id === targetColumn)
        if (!isColumn) {
            // Find which column the target task belongs to
            for (const [col, tasks] of Object.entries(tasksByColumn)) {
                if (tasks.some(t => t.id === over.id)) {
                    targetColumn = col as TaskColumn
                    break
                }
            }
        }

        if (!columns_def.some(c => c.id === targetColumn)) return

        // Find source column
        let sourceColumn: TaskColumn | null = null
        for (const [column, tasks] of Object.entries(tasksByColumn)) {
            if (tasks.some(t => t.id === taskId)) {
                sourceColumn = column as TaskColumn
                break
            }
        }

        if (!sourceColumn) return

        if (sourceColumn === targetColumn) {
            // Reordering within the same column
            const columnTasks = [...(tasksByColumn[sourceColumn] || [])]
            const oldIndex = columnTasks.findIndex(t => t.id === taskId)
            // If dropped over the column container (not a card), append to end.
            const overIndex = columnTasks.findIndex(t => t.id === over.id)
            const newIndex = overIndex === -1 ? columnTasks.length - 1 : overIndex

            if (oldIndex === -1 || oldIndex === newIndex) return

            const reorderedList = [...columnTasks]
            const [movedItem] = reorderedList.splice(oldIndex, 1)
            reorderedList.splice(newIndex, 0, movedItem)

            const updates = reorderedList.map((t, i) => ({ id: t.id, sort_order: i }))
            await reorderTasks(updates)
            return
        }

        try {
            // Determine the insertion index in the target column based on the
            // card we dropped over (so a cross-column drop lands at the drop
            // point, not always at the bottom).
            const targetTasks = tasksByColumn[targetColumn] || []
            const overIndex = targetTasks.findIndex(t => t.id === over.id)
            const insertIndex = overIndex === -1 ? targetTasks.length : overIndex

            await moveTaskToColumn(taskId, targetColumn, insertIndex)
            if (targetColumn === 'done' && taskId === activeFocusId) {
                // Trigger celebration logic without closing panel
                // (notes, score, energy, shouldClosePanel, markCompleted)
                await endSession(undefined, undefined, undefined, false, true)
            }
            const targetTitle = columns_def.find(c => c.id === targetColumn)?.title || targetColumn
            toast.success(`Moved to ${targetTitle}`)
        } catch {
            toast.error('Failed to move task')
        }
    }

    const handleTaskComplete = async (taskId: string, currentColumn: TaskColumn) => {
        try {
            await toggleComplete(taskId)

            // If task was active and is now completed, end session
            if (currentColumn !== 'done' && taskId === activeFocusId) {
                // Trigger celebration logic without closing panel
                await endSession(undefined, undefined, undefined, false, true)
            }

            toast.success(currentColumn === 'done' ? 'Task reopened' : 'Task completed')
        } catch {
            toast.error('Failed to update task')
        }
    }

    const handleBlitz = async (task: Task) => {
        if (isActive && activeFocusId === task.id) {
            setShowFocusPanel(true)
            return
        }

        if (isActive && activeFocusId !== task.id) {
            const ok = await confirm({ message: 'You have an active session running. Switch focus to this task?', variant: 'warning', confirmLabel: 'Switch Task' })
            if (!ok) return
        }

        startSession(task.id)
        toast.success("Focus Mode Started")
    }

    // Only "all" needs no backing list. A selected id that no longer resolves to a
    // list (deleted, or still being fetched) renders the cross-workspace view via
    // the effect above instead of stranding the page on a loading message that
    // nothing ever clears.
    if (!selectedList && selectedListId !== 'all' && selectedListId) {
        return <div className="p-8 text-[var(--text-muted)]">Loading workspace...</div>
    }

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <PlannerHeader />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {/* Board columns — one shell for all four, so they read as a set. */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 md:px-10 pb-6">
                    <div className="flex h-full gap-4 items-stretch">
                        {columns_def.map((col) => (
                            <BoardColumn
                                key={col.id}
                                column={col}
                                tasks={tasksByColumn[col.id]}
                                onBlitz={handleBlitz}
                                setShowCreateModal={setShowCreateModal}
                                onTaskComplete={handleTaskComplete}
                                progress={progressMap[col.id]}
                            />
                        ))}
                    </div>
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeTask ? (
                        <div className={`${activeColumn === 'today' ? 'w-80 lg:w-96' : 'w-64 lg:w-72'} rotate-[1.5deg] cursor-grabbing shadow-[var(--shadow-lift)] rounded-[var(--radius-tile)]`}>
                            <TaskCard
                                task={activeTask}
                                column={activeColumn}
                                onComplete={() => { }}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* createListId is '' when no real list exists yet (fresh install in
                the "all" view); opening the modal then would fail on save. */}
            {showCreateModal && selectedListId && createListId && (
                <CreateTaskModal
                    isOpen={true}
                    onClose={() => setShowCreateModal(null)}
                    listId={createListId}
                    column={showCreateModal.column}
                    position={showCreateModal.position}
                />
            )}

            {selectedTaskId && <TaskDetailsPanel />}

            {plannerWorkspaceId && <NicknameNudge workspaceId={plannerWorkspaceId} />}
        </div>
    )
}
