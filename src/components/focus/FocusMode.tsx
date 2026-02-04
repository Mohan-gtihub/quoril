
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTaskStore } from '@/store/taskStore'
import { useFocusStore } from '@/store/focusStore'
import { useListStore } from '@/store/listStore'
import { Play, Pause, Zap, Clock, ArrowLeft, CheckCircle2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { CreateTaskModal } from '../planner/CreateTaskModal'
import { TaskCard } from '../planner/TaskCard'
import { CompletionCelebration } from '../ui/CompletionCelebration'
import { HoldButton } from '../ui/HoldButton'
import type { Task } from '@/types/database'

export function FocusMode() {
    const navigate = useNavigate()
    const { fetchTasksByColumn, moveTaskToColumn, reorderTasks, fetchTasks, tasks: allStoreTasks } = useTaskStore()
    const { selectedListId } = useListStore()

    const {
        isActive,
        isPaused,
        taskId: activeTaskId,
        pauseSession,
        resumeSession,
        endSession
    } = useFocusStore()

    const { remainingTime, isOvertime, progress } = useTimerDisplay()

    // Local Tasks State
    const [tasks, setTasks] = useState<Task[]>([])
    const [completedTasks, setCompletedTasks] = useState<Task[]>([])

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Celebration State
    const [celebrationTask, setCelebrationTask] = useState<{ title: string; timeSpent: number } | null>(null)

    // Summary stats
    const [totalEstMinutes, setTotalEstMinutes] = useState(0)
    const [totalActualSeconds, setTotalActualSeconds] = useState(0)

    // Load tasks
    const loadFocusTasks = useCallback(async () => {
        if (!selectedListId) return
        const todayTasks = await fetchTasksByColumn(selectedListId, 'today')
        const doneTasks = await fetchTasksByColumn(selectedListId, 'done')

        setTasks(todayTasks)
        setCompletedTasks(doneTasks)

        const allToday = [...todayTasks, ...doneTasks]
        setTotalEstMinutes(allToday.reduce((acc, t) => acc + (t.estimated_minutes || 0), 0))
        setTotalActualSeconds(allToday.reduce((acc, t) => acc + (t.actual_seconds || 0), 0))
    }, [selectedListId, fetchTasksByColumn])



    // Window beforeunload listener to prevent accidents
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isActive) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isActive])

    // Load tasks on mount
    useEffect(() => {
        if (selectedListId) {
            loadFocusTasks()
            fetchTasks(selectedListId)
        }
    }, [selectedListId, fetchTasksByColumn, activeTaskId, fetchTasks, loadFocusTasks])


    const activeTask = tasks.find(t => t.id === activeTaskId) || allStoreTasks.find(t => t.id === activeTaskId)

    const handleBack = () => {
        // HoldButton handles the friction/confirmation logic. 
        // If triggered, we just exit the view. The session can continue in background or user ends it manually.
        navigate('/planner')
    }

    const handleCompleteTask = async (taskId: string) => {
        try {
            const taskToMove = tasks.find(t => t.id === taskId)
            if (!taskToMove) return

            const isActiveTask = taskId === activeTaskId

            // Optimistic Update
            setTasks(prev => prev.filter(t => t.id !== taskId))
            setCompletedTasks(prev => [{ ...taskToMove, status: 'done' }, ...prev])

            if (isActiveTask) {
                await endSession()
                setCelebrationTask({
                    title: taskToMove.title,
                    timeSpent: taskToMove.actual_seconds || 0
                })
            }

            await moveTaskToColumn(taskId, 'done')

            if (!isActiveTask) {
                toast.success("Task Complete! 🎉")
            }

            await loadFocusTasks()
        } catch (error) {
            console.error(error)
            toast.error('Failed to complete task')
            await loadFocusTasks()
        }
    }

    const { setNodeRef: setDoneRef, isOver: isOverDone } = useDroppable({ id: 'focus-done' })

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const taskId = active.id as string

        if (over.id === 'focus-done') {
            await handleCompleteTask(taskId)
            return
        }

        const upcomingTasks = tasks.filter(t => t.id !== activeTaskId)
        const oldIndex = upcomingTasks.findIndex(t => t.id === active.id)
        const newIndex = upcomingTasks.findIndex(t => t.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
            const reordered = [...upcomingTasks]
            const [moved] = reordered.splice(oldIndex, 1)
            reordered.splice(newIndex, 0, moved)

            const updates = reordered.map((t, i) => ({ id: t.id, sort_order: i }))
            await reorderTasks(updates)
            await loadFocusTasks()
        }
    }

    return (
        <div className="h-full bg-[#1a1f2e] text-white flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-gray-800 flex items-center px-6 justify-between bg-[#232936] flex-shrink-0">
                <HoldButton
                    onTrigger={handleBack}
                    duration={1500}
                    fillClassName="bg-red-500/20"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Hold to Exit</span>
                </HoldButton>

                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">
                        Deep Focus
                    </span>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Main Focus Area (Left/Center) */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#1a1f2e] to-[#12151f]">
                    {activeTask ? (
                        <div className="w-full max-w-xl text-center">
                            <h2 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-4">Current Focus</h2>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                                {activeTask.title}
                            </h1>

                            {/* Ambient Warm-up Text */}


                            {/* Timer Graphic */}
                            <div className="relative w-80 h-80 mx-auto mb-12 group">
                                <svg className="w-full h-full transform -rotate-90">
                                    {/* Background Circle */}
                                    <circle
                                        cx="160" cy="160" r="140"
                                        stroke="#1f2937"
                                        strokeWidth="12"
                                        fill="none"
                                    />
                                    {/* Progress Circle */}
                                    <circle
                                        cx="160" cy="160" r="140"
                                        stroke={isOvertime ? '#ef4444' : '#3b82f6'}
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 140}`}
                                        strokeDashoffset={`${2 * Math.PI * 140 * (1 - Math.min(progress, 100) / 100)}`}
                                        className={`transition-all duration-1000 ease-linear ${isOvertime ? 'animate-pulse' : ''}`}
                                        strokeLinecap="round"
                                    />
                                </svg>

                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className={`font-mono font-bold tracking-tight mb-2 ${isOvertime ? 'text-red-500 text-7xl' : 'text-white text-6xl'
                                        }`}>
                                        {formatTimerTime(remainingTime)}
                                    </div>
                                    <p className={`font-bold uppercase tracking-widest ${isOvertime ? 'text-red-500 animate-pulse' : 'text-gray-500'
                                        }`}>
                                        {isOvertime ? 'Overtime' : 'Remaining'}
                                    </p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-6">
                                <button
                                    onClick={() => isPaused ? resumeSession() : pauseSession()}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isPaused
                                        ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white'
                                        : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'
                                        }`}
                                >
                                    {isPaused ? <Play className="w-8 h-8 fill-current" /> : <Pause className="w-8 h-8 fill-current" />}
                                </button>

                                <HoldButton
                                    onTrigger={() => handleCompleteTask(activeTask.id)}
                                    duration={1000}
                                    fillClassName="bg-white/20"
                                    className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95"
                                >
                                    <CheckCircle2 className="w-6 h-6" />
                                    <span>Hold to Complete</span>
                                </HoldButton>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center max-w-md">
                            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
                                <Zap className="w-12 h-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Ready to Blitz?</h2>
                            <p className="text-gray-400 mb-8">Select a task from the list on the right to start your focus session.</p>
                        </div>
                    )}
                </div>

                {/* Sidebar (Right) - Session List */}
                <aside className="w-96 bg-[#232936] border-l border-gray-800 flex flex-col z-10 shadow-xl">
                    <div className="p-6 border-b border-gray-800 flex-shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">Today</h3>
                            <div className="flex gap-2">
                                <button className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-gray-700/50">
                                    <Clock className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                            <span>Est: {Math.floor(totalEstMinutes / 60)}h {totalEstMinutes % 60}m</span>
                            <span title="Total Actual Time Spent Today">Spent: {Math.floor(totalActualSeconds / 3600)}h {Math.floor((totalActualSeconds % 3600) / 60)}m {totalActualSeconds % 60}s</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                            <span>Time Progress</span>
                            <span>{Math.round(((totalActualSeconds / 60) / (totalEstMinutes || 1)) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                style={{ width: `${Math.min(100, ((totalActualSeconds / 60) / (totalEstMinutes || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {/* Active Task Card (Spotlight Widget) */}
                        {activeTask && (
                            <div className="mb-6 ring-2 ring-blue-500/50 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.2)] transform scale-[1.02] transition-all">
                                <TaskCard
                                    task={activeTask}
                                    column="today"
                                    onComplete={() => handleCompleteTask(activeTask.id)}
                                    draggable={false}
                                />
                            </div>
                        )}

                        {/* Upcoming Tasks */}
                        <div className="space-y-3">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCorners}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={tasks.filter(t => t.id !== activeTaskId).map(t => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {tasks.filter(t => t.id !== activeTaskId).map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            column="today"
                                            onComplete={() => handleCompleteTask(task.id)}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* Add Task Button */}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="w-full py-3 flex items-center gap-2 text-gray-500 hover:text-white font-medium text-sm mt-2 hover:bg-white/5 rounded-lg transition-colors justify-center"
                        >
                            <Plus className="w-4 h-4" />
                            ADD TASK
                        </button>

                        {/* Done drop zone + Completed Section */}
                        <div
                            ref={setDoneRef}
                            className={`mt-6 pt-6 border-t border-gray-800 min-h-[80px] rounded-lg transition-colors ${isOverDone ? 'bg-green-500/10 border-green-500/50' : ''}`}
                        >
                            {completedTasks.length > 0 ? (
                                <>
                                    <div className="flex justify-between items-center mb-4 px-1">
                                        <span className="text-gray-500 font-medium text-sm">{completedTasks.length} Done</span>
                                        <span className="text-gray-500 text-xs font-mono">Total Time</span>
                                    </div>
                                    <div className="space-y-2 opacity-40 hover:opacity-100 transition-opacity">
                                        {completedTasks.map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                column="done"
                                                onComplete={() => handleCompleteTask(task.id)}
                                                draggable={false}
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500 text-xs text-center py-4">Drop task here to complete</p>
                            )}
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-4 border-t border-gray-800 grid grid-cols-2 gap-3 bg-[#1a1f2e]">
                        <button className="flex items-center justify-center gap-2 py-3 rounded-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors">
                            <Zap className="w-4 h-4" />
                            Focus Mode
                        </button>
                        <HoldButton
                            onTrigger={handleBack}
                            duration={1500}
                            fillClassName="bg-red-500/20"
                            className="flex items-center justify-center gap-2 py-3 rounded-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Hold to Close</span>
                        </HoldButton>
                    </div>
                </aside>
            </main>

            {showCreateModal && selectedListId && (
                <CreateTaskModal
                    isOpen={true}
                    onClose={() => setShowCreateModal(false)}
                    listId={selectedListId}
                />
            )}

            {celebrationTask && (
                <CompletionCelebration
                    taskTitle={celebrationTask.title}
                    timeSpent={celebrationTask.timeSpent}
                    onClose={() => setCelebrationTask(null)}
                />
            )}
        </div>
    )
}

function formatTimerTime(seconds: number): string {
    const absSeconds = Math.round(Math.abs(seconds))
    const hrs = Math.floor(absSeconds / 3600)
    const mins = Math.floor((absSeconds % 3600) / 60)
    const secs = absSeconds % 60

    const timeStr = hrs > 0
        ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

    return `${seconds < 0 ? '+' : ''}${timeStr}`
}
