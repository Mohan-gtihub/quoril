import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'
import { useFocusStore } from '@/store/focusStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Activity, Coffee, Plus } from 'lucide-react'
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
            className={`flex flex-col h-full rounded-xl transition-all duration-300 flex-shrink-0 ${isToday ? 'w-80 lg:w-96 min-w-[280px] ring-1 ring-white/10' : 'w-64 lg:w-72 min-w-[240px]'
                } glass-regular`}
            style={{
                borderColor: 'var(--border-default)',
            }}
        >
            {/* Column Header */}
            <div className="p-4 border-b rounded-t-xl glass-thin" style={{ borderColor: 'var(--border-default)' }}>
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${column.color}`}></div>
                            <div className="min-w-0">
                                <h2 className="font-bold text-sm leading-none truncate" style={{ color: 'var(--text-primary)' }}>{column.title}</h2>
                                <p className="text-[10px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>{column.subtitle}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {column.id === 'done' ? (
                                !hideEstDoneTimes && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold" style={{ color: 'var(--accent-green-400)', backgroundColor: 'var(--accent-green-100)' }}>
                                        {count} Completed
                                    </span>
                                )
                            ) : (
                                !hideEstDoneTimes && totalMinutes > 0 && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--accent-gray-800)' }}>
                                        {formatTime(totalMinutes)}
                                    </span>
                                )
                            )}

                            {column.id !== 'done' && (
                                <button
                                    onClick={() => setShowCreateModal({ column: column.id, position: 'top' })}
                                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                                    style={{ color: 'var(--text-tertiary)' }}
                                    title="Add task to top"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar for specific columns */}
                    {(column.id === 'this_week' || column.id === 'today') && (
                        <div className="w-full h-1 rounded-full overflow-hidden mt-2" style={{ backgroundColor: 'var(--accent-gray-700)' }}>
                            <div
                                className={`h-full ${column.id === 'today' ? 'bg-blue-500' : 'bg-purple-500'}`}
                                style={{ width: `${displayProgress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Blitz Button for Today */}
                {isToday && tasks.length > 0 && (
                    <button
                        onClick={() => {
                            const topTask = tasks[0];
                            if (topTask) {
                                onBlitz(topTask)
                            }
                        }}
                        className="w-full mt-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold rounded-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        <Activity className="w-3 h-3" />
                        IGNITE FLOW 🔥
                    </button>
                )}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar flex flex-col">
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
                                    // Fallback to updated_at or now if completed_at is missing (legacy data fix)
                                    const rawDate = task.completed_at || task.updated_at || new Date().toISOString()
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
                                            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-white/30 mt-6 mb-2 tracking-wider px-1">
                                                <span>
                                                    {isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })},
                                                    {' '}
                                                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="bg-white/5 px-1.5 py-0.5 rounded text-white/20">
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

                {/* Done Column Extras */}
                {column.id === 'done' && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Recent Activity</p>
                        <div className="space-y-2 opacity-60">
                            <div className="flex items-center gap-2 text-xs p-2 rounded" style={{ color: 'var(--text-tertiary)', backgroundColor: 'rgba(31, 41, 55, 0.5)' }}>
                                <Coffee className="w-3 h-3 text-orange-400" />
                                <span>Break - 10 min</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State / Add Button */}
                {column.id !== 'done' && (
                    <div className="mt-2 text-center">
                        <button
                            onClick={() => setShowCreateModal({ column: column.id, position: 'bottom' })}
                            className="w-full py-2 border-2 border-dashed rounded-lg text-xs transition-all flex items-center justify-center gap-2"
                            style={{
                                borderColor: 'var(--border-default)',
                                color: 'var(--text-muted)'
                            }}
                        >
                            <Plus className="w-3 h-3" />
                            Add Task
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
    const { tasks, fetchTasks, moveTaskToColumn, reorderTasks, selectedTaskId, toggleComplete } = useTaskStore()
    const { startSession, isActive, taskId: activeFocusId, setShowFocusPanel, endSession } = useFocusStore()
    const { selectedDate } = usePlannerStore()

    const columns_def: ColumnDef[] = useMemo(() => {
        const isSelectedToday = isSameDay(selectedDate, startOfToday())
        const dayName = format(selectedDate, 'EEEE')
        return [
            { id: 'backlog', title: 'Backlog', subtitle: 'Idea Storage', color: 'bg-gray-500' },
            { id: 'this_week', title: 'This Week', subtitle: 'Short-term Plan', color: 'bg-purple-500' },
            { id: 'today', title: isSelectedToday ? 'Today' : dayName, subtitle: 'Execution Center', color: 'bg-blue-500' },
            { id: 'done', title: 'Done', subtitle: 'History & Motivation', color: 'bg-green-500' },
        ]
    }, [selectedDate])

    const selectedList = lists.find(l => l.id === selectedListId)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    // Derived state: Group tasks by column and calculate progress
    const { columns: tasksByColumn, progressMap } = useMemo(() => {
        const cols: Record<TaskColumn, Task[]> = {
            backlog: [],
            this_week: [],
            today: [],
            done: [],
        }

        const sortedTasks = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

        sortedTasks.forEach(task => {
            if (task.deleted_at) return

            const { getColumnStatuses } = useTaskStore.getState()

            if (selectedListId === 'all') {
                const isActiveList = lists.some(l => l.id === task.list_id)
                if (!isActiveList) return
            } else if (selectedListId && task.list_id !== selectedListId) {
                return
            }

            // FILTERS BY DATE
            const taskDate = task.due_date ? new Date(task.due_date) : null
            const completedDate = task.completed_at ? new Date(task.completed_at) : null

            // RECURRING LOGIC: Show in Today column for future dates as 'active' (Todo state)
            if (task.is_recurring && !isSameDay(selectedDate, startOfToday()) && selectedDate > startOfToday()) {
                cols.today.push({ ...task, status: 'active' as any, completed_at: null })
                return
            }

            if (getColumnStatuses('backlog').includes(task.status)) {
                cols.backlog.push(task)
            } else if (getColumnStatuses('this_week').includes(task.status)) {
                cols.this_week.push(task)
            } else if (getColumnStatuses('today').includes(task.status)) {
                // TODAY LOGIC: 
                // 1. If viewing actual today, show EVERYTHING currently active/paused.
                // 2. If viewing a future/past day (fallback), show what's scheduled.
                if (isSameDay(selectedDate, startOfToday())) {
                    cols.today.push(task)
                } else if (taskDate && isSameDay(taskDate, selectedDate)) {
                    cols.today.push(task)
                }
            } else if (getColumnStatuses('done').includes(task.status)) {
                // Done tasks: Show if completed on the selected date
                if (completedDate) {
                    // MIDNIGHT BUFFER: If a task was completed before 4am, 
                    // and we are looking at the previous day, count it as 'done' for that day.
                    const isTodaySelected = isSameDay(selectedDate, startOfToday())

                    if (isTodaySelected) {
                        // If viewing Today, show everything done recently (last 24h) 
                        // or anything done today to ensure no disappearance.
                        cols.done.push(task)
                    } else if (isSameDay(completedDate, selectedDate)) {
                        cols.done.push(task)
                    } else {
                        // Check if it was done in the "early morning" (buffer) of the day AFTER selectedDate
                        const dayAfter = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
                        if (isSameDay(completedDate, dayAfter) && completedDate.getHours() < 4) {
                            cols.done.push(task)
                        }
                    }
                }
            }
        })

        const getProgress = (targetCols: Task[], doneCol: Task[]) => {
            const targetEst = targetCols.reduce((s, t) => s + (t.estimated_minutes || 0), 0)
            const doneEst = doneCol.reduce((s, t) => s + (t.estimated_minutes || 0), 0)
            const total = targetEst + doneEst
            return total > 0 ? Math.min(100, (doneEst / total) * 100) : 0
        }

        const map: Partial<Record<TaskColumn, number>> = {
            today: getProgress(cols.today, cols.done),
            this_week: getProgress(cols.this_week, tasks.filter(t => {
                if (!t.completed_at) return false
                const d = new Date(t.completed_at)
                const now = new Date()
                const diff = now.getTime() - d.getTime()
                return diff < 7 * 24 * 60 * 60 * 1000 // Last 7 days
            }))
        }

        return { columns: cols, progressMap: map }
    }, [tasks, selectedListId, selectedDate])

    const [showCreateModal, setShowCreateModal] = useState<{ column: TaskColumn, position: 'top' | 'bottom' } | null>(null)
    const [activeTask, setActiveTask] = useState<Task | null>(null)

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

    // No need for loadTasks anymore!

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        // tasksByColumn is derived, so we can search it
        const task = Object.values(tasksByColumn)
            .flat()
            .find(t => t.id === active.id)
        setActiveTask(task || null)
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

        if (!sourceColumn || sourceColumn === targetColumn) {
            // Reordering within the same column
            if (!sourceColumn) return
            if (sourceColumn === targetColumn) {
                const columnTasks = [...(tasksByColumn[sourceColumn] || [])]
                const oldIndex = columnTasks.findIndex(t => t.id === taskId)
                const newIndex = columnTasks.findIndex(t => t.id === over.id)

                if (oldIndex === newIndex) return

                const reorderedList = [...columnTasks]
                const [movedItem] = reorderedList.splice(oldIndex, 1)
                reorderedList.splice(newIndex, 0, movedItem)

                const updates = reorderedList.map((t, i) => ({ id: t.id, sort_order: i }))
                await reorderTasks(updates)
                return
            }
        }

        try {
            await moveTaskToColumn(taskId, targetColumn)
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

            toast.success(currentColumn === 'done' ? 'Task reopened' : 'Task completed! 🎉')
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
        toast.success("Focus Mode Started! 🚀")
    }

    if (!selectedList && selectedListId !== 'all') {
        return <div className="p-8 text-gray-400">Loading workspace...</div>
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
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 lg:p-6">
                    <div className="flex h-full gap-4 lg:gap-6">
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
                        <div className="w-72 opacity-90 cursor-grabbing">
                            <TaskCard
                                task={activeTask}
                                column={activeTask.status === 'done' ? 'done' : 'today'} // fallback
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
                    listId={selectedListId}
                />
            )}

            {selectedTaskId && <TaskDetailsPanel />}
        </div>
    )
}
