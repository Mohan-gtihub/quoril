import { useMemo, useState } from 'react'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { TaskCard } from '../planner/TaskCard'
import { CreateTaskModal } from '../planner/CreateTaskModal'
import { cn } from '@/utils/helpers'

import {
    Play,
    Pause,
    CheckCircle2,
    ExternalLink,
    SkipForward,
    Timer,
    Coffee,
    Plus,
    XCircle,
    Settings,
    Home
} from 'lucide-react'

import {
    DndContext,
    DragEndEvent,
    closestCorners,
    useSensor,
    useSensors,
    PointerSensor,
    useDroppable,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'

import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable'

/* ---------------------------------------------
   UTILS
--------------------------------------------- */

function formatTime(sec: number) {
    const s = Math.abs(Math.floor(sec))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const r = s % 60

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
}

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export function FocusTimerPanel() {
    const focus = useFocusStore()
    const { tasks, moveTaskToColumn, reorderTasks } = useTaskStore()
    const { selectedListId, lists } = useListStore()

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showCelebration, setShowCelebration] = useState(false)

    const celebrationGif = useMemo(() => {
        const gifs = [
            'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif',
            'https://media.giphy.com/media/3o7abKhOpu0NwePO3u/giphy.gif',
            'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif',
            'https://media.giphy.com/media/l0HlHJGHe3yAMhdQY/giphy.gif'
        ]
        return gifs[Math.floor(Math.random() * gifs.length)]
    }, [showCelebration])

    const {
        isPaused,
        taskId,
        duration,
        remainingTime,
        isOvertime,
        progress,
        isBreak,
        breakRemaining,
        breakRemainingAtStart
    } = useTimerDisplay()

    const {
        pauseSession,
        resumeSession,
        endSession,
        skipToNext,
        setShowFocusPanel,
    } = focus

    /* ---------- DROP ZONE ---------- */
    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: 'active-task-target',
    })

    /* ---------- TASKS ---------- */
    const activeTask = tasks.find(t => t.id === taskId)
    const nextTasks = useMemo(() => {
        return tasks
            .filter((t: any) => {
                if (t.id === taskId) return false
                if (t.status === 'done') return false
                if (t.deleted_at) return false

                if (selectedListId === 'all') {
                    const isActiveList = lists.some(l => l.id === t.list_id)
                    if (!isActiveList) return false
                } else if (t.list_id !== selectedListId) {
                    return false
                }

                return useTaskStore.getState().getColumnStatuses('today').includes(t.status)
            })
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    }, [tasks, taskId, selectedListId, lists])

    /* ---------- DND ---------- */
    const [activeId, setActiveId] = useState<string | null>(null)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    const handleDragStart = (e: any) => setActiveId(e.active.id)

    const handleDragEnd = async (e: DragEndEvent) => {
        setActiveId(null)
        const { active, over } = e
        if (!over) return

        if (over.id === 'active-task-target') {
            const taskIdToStart = active.id as string
            if (taskIdToStart !== taskId) {
                focus.startSession(taskIdToStart)
            }
            return
        }

        if (active.id === over.id) return

        const oldIndex = nextTasks.findIndex(t => t.id === active.id)
        const newIndex = nextTasks.findIndex(t => t.id === over.id)
        if (oldIndex < 0 || newIndex < 0) return

        const reordered = arrayMove(nextTasks, oldIndex, newIndex)
        const updates = reordered.map((t: any, i: number) => ({
            id: t.id,
            sort_order: i + 1,
        }))
        await reorderTasks(updates)
    }

    /* ---------- ACTIONS ---------- */
    /* ---------- ACTIONS ---------- */
    const handleDone = async () => {
        if (focus.isBreak) {
            await focus.stopBreak()
            return
        }
        if (taskId) {
            await moveTaskToColumn(taskId, 'done')
            setShowCelebration(true)
            // DO NOT endSession() yet, waiting for user action in celebration view
        } else {
            await endSession()
        }
    }

    const handleSkip = async () => {
        const next = nextTasks[0]?.id
        if (window.confirm(next ? 'Skip to next task?' : 'End session?')) {
            await skipToNext(next)
        }
    }

    const [isNativeDragOver, setIsNativeDragOver] = useState(false)

    const handleNativeDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsNativeDragOver(false)
        const droppedTaskId = e.dataTransfer.getData('taskId')
        if (droppedTaskId) {
            focus.startSession(droppedTaskId)
            setShowFocusPanel(true)
        }
    }


    // Calculate stats
    const totalEstimatedTime = nextTasks.reduce((acc, t) => acc + (t.estimated_minutes || 0), 0)
    const completedTasks = tasks.filter(t => t.status === 'done' && !t.deleted_at).length

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault()
                setIsNativeDragOver(true)
            }}
            onDragLeave={() => setIsNativeDragOver(false)}
            onDrop={handleNativeDrop}
            className={cn(
                "h-full flex flex-col w-full transition-colors bg-[#0d0f14]",
                isNativeDragOver && "ring-2 ring-inset ring-blue-500/40"
            )}
        >
            {/* MINIMALIST HEADER */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <button className="text-sm text-white/60 hover:text-white/90 transition-colors font-medium">
                        All
                    </button>
                    <span className="text-white/30">›</span>
                    <span className="text-sm text-white font-semibold">Today</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setShowFocusPanel(false)
                            setTimeout(() => window.location.hash = '#/settings', 100)
                        }}
                        className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/30 hover:scale-110 transition-all duration-200 flex items-center justify-center group border border-transparent hover:border-white/20"
                    >
                        <Settings className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                    </button>
                    <button
                        onClick={() => {
                            setShowFocusPanel(false)
                            setTimeout(() => window.location.hash = '#/dashboard', 100)
                        }}
                        className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/30 hover:scale-110 transition-all duration-200 flex items-center justify-center group border border-transparent hover:border-white/20"
                    >
                        <Home className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                    </button>
                    <button
                        onClick={() => {
                            useSettingsStore.getState().updateSettings({ superFocusMode: true })
                            setShowFocusPanel(false)
                        }}
                        className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/30 hover:scale-110 transition-all duration-200 flex items-center justify-center group border border-transparent hover:border-white/20"
                    >
                        <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                    </button>
                </div>
            </div>

            {/* STATS BAR */}
            <div className="px-5 py-3 border-b border-white/5">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Est: {Math.floor(totalEstimatedTime / 60)}hr {totalEstimatedTime % 60}min</span>
                    <span className="text-white/50">{completedTasks}/{nextTasks.length + completedTasks} Done</span>
                </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="p-5 space-y-3">
                        {/* ACTIVE TASK - COMPACT TIMER CARD */}
                        {activeTask && !showCelebration ? (
                            <div
                                ref={setDropRef}
                                className={cn(
                                    "relative rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-4 transition-all",
                                    isOver && "ring-2 ring-blue-500/40 scale-[1.02]"
                                )}
                            >
                                {/* Status Badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                                        {isBreak ? 'BREAK' : isPaused ? 'PAUSED' : isOvertime ? 'OVERTIME' : 'DOING'}
                                    </span>
                                    <button
                                        onClick={() => endSession()}
                                        className="text-white/40 hover:text-white/80 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Task Title */}
                                <h3 className="text-base font-semibold text-white mb-3 line-clamp-2">
                                    {activeTask.title}
                                </h3>

                                {/* Timer Display - Compact */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="font-mono text-2xl font-bold text-white tracking-tight">
                                        {isBreak && isPaused && breakRemaining === 0
                                            ? "00:00:00"
                                            : formatTime(isBreak ? breakRemaining : (isOvertime ? -remainingTime : remainingTime))}
                                    </div>
                                    {duration > 0 && !isBreak && (
                                        <div className="text-xs text-white/50 font-mono">
                                            / {formatTime(duration)}
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                {duration > 0 && (
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-1000",
                                                isBreak ? "bg-amber-500" : isOvertime ? "bg-red-500" : "bg-emerald-500"
                                            )}
                                            style={{
                                                width: `${Math.min(100, isBreak && breakRemainingAtStart > 0
                                                    ? ((breakRemainingAtStart - breakRemaining) / breakRemainingAtStart) * 100
                                                    : progress)}%`,
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Action Buttons - Minimal */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={isPaused ? resumeSession : pauseSession}
                                        className={cn(
                                            "flex-1 h-9 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-medium",
                                            isPaused
                                                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                                : "bg-white/10 text-white/80 hover:bg-white/15"
                                        )}
                                    >
                                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={handleDone}
                                        className="flex-1 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleSkip}
                                        className="h-9 px-4 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 transition-all flex items-center justify-center"
                                    >
                                        <SkipForward className="w-4 h-4" />
                                    </button>
                                </div>

                                {isOver && (
                                    <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center backdrop-blur-sm rounded-2xl border-2 border-dashed border-blue-500/40">
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Drop to switch...</span>
                                    </div>
                                )}
                            </div>
                        ) : showCelebration && activeTask ? (
                            // CELEBRATION CARD
                            <div className="relative rounded-2xl bg-[#0a0c10] border-2 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] p-5 text-center transition-all animate-in fade-in zoom-in-95 duration-300">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-center gap-2">
                                    Well done! <span className="text-lg">💥</span>
                                </h3>

                                <div className="rounded-xl overflow-hidden mb-4 border border-white/10 shadow-lg aspect-video">
                                    <img src={celebrationGif} alt="Celebration" className="w-full h-full object-cover" />
                                </div>

                                <div className="mb-6">
                                    <p className="text-sm font-medium text-white/50 line-through mb-1">{activeTask.title}</p>
                                    <p className="text-emerald-400 font-bold text-base">You finished the task!</p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={async () => {
                                            setShowCelebration(false)
                                            await endSession() // Clear current
                                            const next = nextTasks[0]?.id
                                            if (next) {
                                                focus.startSession(next)
                                            }
                                        }}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-black font-bold text-sm hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <SkipForward className="w-4 h-4 fill-black/20" />
                                        Next Task
                                    </button>

                                    <button
                                        onClick={async () => {
                                            setShowCelebration(false)
                                            await endSession() // Clear task session
                                            focus.startBreak()
                                        }}
                                        className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <Coffee className="w-4 h-4" />
                                        Take a Break
                                    </button>
                                </div>

                                <div className="mt-5 pt-4 border-t border-white/5 flex justify-between text-[11px] text-white/30 font-medium">
                                    <span>Est: {activeTask.estimated_minutes ? `${activeTask.estimated_minutes}m` : 'None'}</span>
                                    <span>Taken: {Math.floor(duration / 60)}min</span>
                                </div>
                            </div>
                        ) : null}

                        {/* EMPTY STATE */}
                        {!activeTask && (
                            <div
                                ref={setDropRef}
                                className={cn(
                                    "rounded-2xl border-2 border-dashed border-white/10 p-12 flex flex-col items-center justify-center text-center transition-all",
                                    isOver && "border-blue-500/40 bg-blue-500/5 scale-[1.02]"
                                )}
                            >
                                <Timer className="w-10 h-10 text-white/20 mb-3" />
                                <p className="text-sm font-medium text-white/40">
                                    {isOver ? "Drop to start" : "No active task"}
                                </p>
                                <p className="text-xs text-white/30 mt-1">
                                    {isOver ? "" : "Drag a task here to begin"}
                                </p>
                            </div>
                        )}

                        {/* TASK LIST */}
                        <SortableContext items={nextTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3 pt-2">
                                {nextTasks.map(t => (
                                    <div key={t.id}>
                                        <TaskCard
                                            task={t}
                                            column="today"
                                            draggable
                                            disableTimer
                                            onComplete={() => { }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </SortableContext>

                        {/* ADD TASK BUTTON */}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="w-full h-10 rounded-xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 text-white/50 hover:text-white/80 group mt-3"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Add Task</span>
                        </button>

                        {/* COMPLETED SECTION */}
                        {completedTasks > 0 && (
                            <div className="pt-6 mt-6 border-t border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                                        {completedTasks} Done
                                    </span>
                                    <span className="text-xs text-white/30">
                                        {Math.floor(tasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.estimated_minutes || 0), 0) / 60)}h {tasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.estimated_minutes || 0), 0) % 60}min
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: {
                                active: {
                                    opacity: '0.4',
                                },
                            },
                        }),
                    }}>
                        {activeId ? (
                            <div className="scale-105 shadow-2xl z-[100] cursor-grabbing w-full opacity-80">
                                <TaskCard
                                    task={tasks.find(t => t.id === activeId)!}
                                    column="today"
                                    draggable={false}
                                    disableTimer
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* BOTTOM ACTION BAR */}
            <div className="border-t border-white/5 p-4 flex items-center justify-between bg-[#0a0c10]">
                <button
                    onClick={() => focus.isBreak ? focus.stopBreak() : focus.startBreak()}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium",
                        focus.isBreak
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                            : "bg-white/[0.08] text-white/60 hover:bg-white/25 hover:text-white border border-transparent hover:border-white/20"
                    )}
                >
                    <Coffee className="w-4 h-4" />
                    <span>{focus.isBreak ? 'End Break' : 'Break'}</span>
                </button>

                <button
                    onClick={() => setShowFocusPanel(false)}
                    className="px-4 py-2 rounded-lg bg-white/[0.08] text-white/60 hover:bg-white/25 hover:text-white transition-all duration-200 text-sm font-medium border border-transparent hover:border-white/20"
                >
                    Close Session
                </button>
            </div>

            {showCreateModal && (
                <CreateTaskModal
                    isOpen={true}
                    onClose={() => setShowCreateModal(false)}
                    listId={selectedListId && selectedListId !== 'all' ? selectedListId : (lists[0]?.id || '')}
                />
            )}
        </div>
    )
}