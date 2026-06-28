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
import { TodayColumn } from './TodayColumn'
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

// -- Sub-Component for Droppable Column --
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
    const { setNodeRef } = useDroppable({ id: column.id })
    const { hideEstDoneTimes } = useSettingsStore()

    const isToday = column.id === 'today'
    const count = tasks.length
    const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0)
    // Use passed progress or fallback
    const displayProgress = progress ?? Math.min(100, count * 10)

    const formatTime = (minutes: number) => {
        if (minutes === 0) return '0m'
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    }

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col h-full rounded-[var(--radius-tile)] transition-colors duration-200 flex-shrink-0 border border-[var(--border-default)] bg-[var(--bg-card)] ${isToday ? 'w-80 lg:w-96 min-w-[280px]' : 'w-64 lg:w-72 min-w-[240px]'
                }`}
        >
            {/* Column Header */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${column.color}`}></div>
                        <div className="min-w-0">
                            <h2 className="text-[15px] font-semibold leading-none tracking-tight truncate text-[var(--text-primary)]">{column.title}</h2>
                            <p className="text-[11px] font-medium truncate text-[var(--text-muted)] mt-1.5">{column.subtitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {column.id === 'done' ? (
                            !hideEstDoneTimes && (
                                <span className="text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">
                                    {count} done
                                </span>
                            )
                        ) : (
                            !hideEstDoneTimes && totalMinutes > 0 && (
                                <span className="text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">
                                    {formatTime(totalMinutes)}
                                </span>
                            )
                        )}

                        {column.id !== 'done' && (
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

                {/* Progress Bar for specific columns */}
                {(column.id === 'this_week' || column.id === 'today') && (
                    <div className="w-full h-1.5 rounded-full overflow-hidden mt-4 bg-[var(--bg-hover)]">
                        <motion.div
                            className={`h-full rounded-full ${isToday ? 'bg-[var(--accent-primary)]' : 'bg-[var(--text-muted)]'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${displayProgress}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                    </div>
                )}

                {/* Blitz Button for Today */}
                {isToday && tasks.length > 0 && (
                    <button
                        onClick={() => {
                            const topTask = tasks[0];
                            if (topTask) {
                                onBlitz(topTask)
                            }
                        }}
                        className="w-full mt-4 py-2.5 text-sm font-semibold rounded-full flex items-center justify-center gap-2 transition-all bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-105 active:scale-95"
                    >
                        Start focus
                    </button>
                )}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar flex flex-col">
                <SortableContext
                    id={column.id}
                    items={tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {column.id === 'done' ? (
                        // DONE COLUMN: O(n) Grouping Algorithm
                        (() => {
                            const groupedByDay = tasks
                                .reduce<Record<string, Task[]>>((acc, task) => {
                                    // Fall back to the stable created_at (never updated_at, which
                                    // drifts on every edit) if completed_at is missing.
                                    const rawDate = task.completed_at || task.created_at || new Date().toISOString()
                                    const dateObj = new Date(rawDate)
                                    const dayKey = dateObj.toDateString()
                                    if (!acc[dayKey]) acc[dayKey] = []
                                    acc[dayKey].push(task)
                                    return acc
                                }, {})

                            return Object.entries(groupedByDay)
                                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                                .map(([day, dayTasks]) => {
                                    const date = new Date(day)
                                    const isToday = isSameDay(date, new Date())

                                    return (
                                        <div key={day}>
                                            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-tertiary)] mt-5 mb-2 px-1">
                                                <span>
                                                    {isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })},
                                                    {' '}
                                                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="text-[var(--text-muted)] tabular-nums font-medium">
                                                    {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                                                </span>
                                            </div>

                                            {dayTasks.map(task => (
                                                <div key={task.id}>
                                                    <TaskCard
                                                        task={task}
                                                        column={column.id}
                                                        onComplete={() => onTaskComplete(task.id, column.id)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })
                        })()
                    ) : (
                        // OTHER COLUMNS: Standard Grid
                        tasks.map((task) => (
                            <div key={task.id}>
                                <TaskCard
                                    task={task}
                                    column={column.id}
                                    onComplete={() => onTaskComplete(task.id, column.id)}
                                />
                            </div>
                        ))
                    )}
                </SortableContext>

                {/* Empty State / Add Button */}
                {column.id !== 'done' && (
                    <div className="mt-2">
                        <button
                            onClick={() => setShowCreateModal({ column: column.id, position: 'bottom' })}
                            className="w-full py-2.5 rounded-[var(--radius-tile)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add task
                        </button>
                    </div>
                )}
            </div>
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
            // If no list is selected, default to 'all' or redirect?
            // Existing logic redirected to /dashboard (which is this page).
            // Let's safe guard.
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

    if (!selectedList && selectedListId !== 'all') {
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
                {/* Board Columns container */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 md:px-10 pb-6">
                    <div className="flex h-full gap-4">
                        {columns_def.map((col) => {
                            if (col.id === 'today') {
                                return (
                                    <div key={col.id} className="min-w-[280px] w-80 lg:w-96 flex-shrink-0">
                                        <TodayColumn
                                            title={col.title}
                                            tasks={tasksByColumn[col.id]}
                                            columnId={col.id}
                                            onTaskComplete={(id) => handleTaskComplete(id, col.id)}
                                            onStartNow={handleBlitz}
                                            onAddTask={() => setShowCreateModal({ column: 'today', position: 'top' })}
                                        />
                                    </div>
                                )
                            }
                            return (
                                <BoardColumn
                                    key={col.id}
                                    column={col}
                                    tasks={tasksByColumn[col.id]}
                                    onBlitz={handleBlitz}
                                    setShowCreateModal={setShowCreateModal}
                                    onTaskComplete={handleTaskComplete}
                                    progress={progressMap[col.id]}
                                />
                            )
                        })}
                    </div>
                </div>

                <DragOverlay>
                    {activeTask ? (
                        <div className={`${activeColumn === 'today' ? 'w-80 lg:w-96' : 'w-72'} opacity-90 cursor-grabbing`}>
                            <TaskCard
                                task={activeTask}
                                column={activeColumn}
                                onComplete={() => { }}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {showCreateModal && selectedListId && (
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
