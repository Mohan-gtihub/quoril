import { useMemo, useState, useEffect } from 'react'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { TaskCard } from '../planner/TaskCard'
import { CreateTaskModal } from '../planner/CreateTaskModal'
import { cn } from '@/utils/helpers'
import { confirm } from '@/components/ui/ConfirmDialog'

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
    Home,
    Check
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
   TIME EDITOR COMPONENT
--------------------------------------------- */

interface TimeEditorProps {
    initialSeconds: number
    onSave: (seconds: number) => void
}

function TimeEditor({ initialSeconds, onSave }: TimeEditorProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [timeValue, setTimeValue] = useState('')

    useEffect(() => {
        // Convert seconds to format H:MM:SS or MM:SS
        const s = Math.abs(Math.floor(initialSeconds))
        const h = Math.floor(s / 3600)
        const m = Math.floor((s % 3600) / 60)
        const r = s % 60

        if (h > 0) {
            setTimeValue(`${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`)
        } else {
            setTimeValue(`${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`)
        }
    }, [initialSeconds])

    const handleSave = () => {
        const parts = timeValue.split(':').map(p => parseInt(p) || 0)
        let totalSeconds = 0

        if (parts.length === 3) {
            totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
        } else if (parts.length === 2) {
            totalSeconds = parts[0] * 60 + parts[1]
        } else {
            totalSeconds = parts[0] || 0
        }

        if (totalSeconds >= 0) {
            onSave(totalSeconds)
            setIsEditing(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            setIsEditing(false)
        }
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    autoFocus
                    placeholder="MM:SS"
                    className="font-mono text-2xl font-bold text-[var(--text-primary)] tracking-tight bg-[var(--bg-tertiary)] border border-[var(--accent-primary)]/50 rounded-lg px-3 py-1 w-36 outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                />
                <div className="flex flex-col gap-1 text-[9px] text-[var(--text-muted)]">
                    <span>↵ Save</span>
                    <span>Esc Cancel</span>
                </div>
            </div>
        )
    }

    return (
        <button
            onClick={() => setIsEditing(true)}
            className="font-mono text-2xl font-bold text-[var(--text-primary)] tracking-tight hover:text-[var(--accent-primary)] transition-colors cursor-pointer group relative text-left"
        >
            {formatTime(initialSeconds)}
            <span className="absolute -bottom-5 left-0 text-[9px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Click to edit
            </span>
        </button>
    )
}

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

const isToday = (dateStr: string | null | undefined) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const now = new Date()
    return d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
}

export function FocusTimerPanel() {
    const focus = useFocusStore()
    const { tasks, subtasks, createSubtask, fetchSubtasks, reorderTasks, toggleSubtask } = useTaskStore()
    const { selectedListId, lists } = useListStore()
    const settings = useSettingsStore()

    const [showCreateModal, setShowCreateModal] = useState(false)
    // Local celebration state replaced by global focus store state

    const celebrationGif = useMemo(() => {
        const gifs = [
            'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif',
            'https://media.giphy.com/media/3o7abKhOpu0NwePO3u/giphy.gif',
            'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif',
            'https://media.giphy.com/media/l0HlHJGHe3yAMhdQY/giphy.gif'
        ]
        return gifs[Math.floor(Math.random() * gifs.length)]
    }, [focus.showCelebration])

    const {
        isPaused,
        taskId,
        duration,
        remainingTime,
        isOvertime,
        progress,
        isBreak,
        breakRemaining,
        breakRemainingAtStart,
    } = useTimerDisplay()

    const {
        pauseSession,
        resumeSession,
        endSession,
        skipToNext,
        setShowFocusPanel,
        dismissCelebration // New action
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
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }, [tasks, taskId, selectedListId, lists])

    // REMOVED: Conflicting useEffect that caused race conditions. 
    // Now endSession handles persistence and celebration trigger atomically.

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
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
    const currentSubtasks = taskId ? (subtasks[taskId] || []) : []

    useEffect(() => {
        if (taskId) fetchSubtasks(taskId)
    }, [taskId, fetchSubtasks])

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSubtaskTitle.trim() || !taskId) return
        await createSubtask(taskId, newSubtaskTitle.trim())
        setNewSubtaskTitle('')
    }

    const handleDone = async () => {
        try {
            if (focus.isBreak) {
                await focus.stopBreak()
                return
            }
            // ATOMIC UPDATE: End session, mark done, show celebration
            // (notes, focusScore, energyLevel, shouldClosePanel, markCompleted)
            await endSession(undefined, undefined, undefined, false, true)
        } catch (error) {
            console.error('Handle done failed:', error)
        }
    }

    const handleSkip = async () => {
        const next = nextTasks[0]?.id
        const ok = await confirm({ message: next ? 'Skip to the next task?' : 'End this session?', variant: 'warning', confirmLabel: next ? 'Skip' : 'End' })
        if (ok) await skipToNext(next)
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
    const totalEstimatedTime = nextTasks.reduce((acc, t) => acc + (t.estimated_minutes ?? 0), 0)
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
                "h-full flex flex-col w-full transition-colors",
                settings.theme === 'nebula' ? "glass-panel" : "bg-[var(--bg-secondary)]",
                isNativeDragOver && "ring-2 ring-inset ring-[var(--accent-primary)]/40"
            )}
        >
            {/* MINIMALIST HEADER */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                    <button className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium">
                        All
                    </button>
                    <span className="text-[var(--text-muted)]">›</span>
                    <span className="text-sm text-[var(--text-primary)] font-semibold">Today</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setShowFocusPanel(false)
                            setTimeout(() => window.location.hash = '#/settings', 100)
                        }}
                        className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] hover:scale-110 transition-all duration-200 flex items-center justify-center group border border-transparent hover:border-[var(--border-hover)]"
                    >
                        <Settings className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </button>
                    <button
                        onClick={() => {
                            setShowFocusPanel(false)
                            setTimeout(() => window.location.hash = '#/dashboard', 100)
                        }}
                        className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] hover:scale-110 transition-all duration-200 flex items-center justify-center group border border-transparent hover:border-[var(--border-hover)]"
                    >
                        <Home className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </button>
                    <button
                        onClick={() => {
                            useSettingsStore.getState().updateSettings({ superFocusMode: true })
                            setShowFocusPanel(false)
                        }}
                        className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] hover:scale-110 transition-all duration-200 flex items-center justify-center group border border-transparent hover:border-[var(--border-hover)]"
                    >
                        <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </button>
                </div>
            </div>

            {/* STATS BAR */}
            <div className="px-5 py-3 border-b border-[var(--border-default)]">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Est: {Math.floor(totalEstimatedTime / 60)}hr {totalEstimatedTime % 60}min</span>
                    <span className="text-[var(--text-secondary)]">{completedTasks}/{nextTasks.length + completedTasks} Done</span>
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
                        {activeTask && !focus.showCelebration ? (
                            <div
                                ref={setDropRef}
                                className={cn(
                                    "relative rounded-2xl p-4 transition-all bg-[var(--bg-card)] border border-[var(--border-default)]",
                                    isOver && "ring-2 ring-[var(--accent-primary)]/40 scale-[1.02]"
                                )}
                            >
                                {/* Status Badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                                        {isBreak ? 'BREAK' : (activeTask?.status === 'done' ? 'DONE' : isPaused ? 'PAUSED' : isOvertime ? 'OVERTIME' : 'DOING')}
                                    </span>
                                    <button
                                        onClick={() => endSession()}
                                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Task Title */}
                                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3 line-clamp-2">
                                    {activeTask.title}
                                </h3>

                                {/* Timer Display - Compact with Edit on Click */}
                                <div className="flex items-center justify-between mb-4">
                                    {isPaused && !isBreak ? (
                                        <TimeEditor
                                            initialSeconds={isOvertime ? -remainingTime : remainingTime}
                                            onSave={(newSeconds) => {
                                                // Update the remaining time in focus store
                                                focus.updateRemainingTime(newSeconds)
                                            }}
                                        />
                                    ) : (
                                        <div className="font-mono text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                                            {isBreak && isPaused && breakRemaining === 0
                                                ? "00:00:00"
                                                : formatTime(isBreak ? breakRemaining : (isOvertime ? -remainingTime : remainingTime))}
                                        </div>
                                    )}
                                    {duration > 0 && !isBreak && (
                                        <div className="text-xs text-[var(--text-muted)] font-mono">
                                            / {formatTime(duration)}
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                {duration > 0 && (
                                    <div className="h-1 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-4">
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

                                {/* Subtasks Section */}
                                {!isBreak && (
                                    <div className="mb-4 bg-[var(--bg-tertiary)] rounded-xl p-3 border border-[var(--border-default)]">
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Sub-Missions</span>
                                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                                {currentSubtasks.filter(s => s.completed).length}/{currentSubtasks.length}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1 mb-2">
                                            {currentSubtasks.map(sub => (
                                                <div
                                                    key={sub.id}
                                                    className="flex items-center gap-2 group/sub cursor-pointer"
                                                    onClick={() => toggleSubtask(sub.id)}
                                                >
                                                    <div className={cn(
                                                        "w-3.5 h-3.5 rounded border border-[var(--border-default)] flex items-center justify-center transition-colors shrink-0",
                                                        sub.completed ? "bg-emerald-500 border-emerald-500" : "group-hover/sub:border-[var(--border-hover)]"
                                                    )}>
                                                        {sub.completed && <Check size={10} className="text-black" />}
                                                    </div>
                                                    <span className={cn(
                                                        "text-xs truncate flex-1",
                                                        sub.completed ? "text-[var(--text-muted)] line-through" : "text-[var(--text-secondary)] group-hover/sub:text-[var(--text-primary)]"
                                                    )}>
                                                        {sub.title}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <form onSubmit={handleAddSubtask} className="relative">
                                            <input
                                                type="text"
                                                placeholder="Add sub-mission..."
                                                value={newSubtaskTitle}
                                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                className="w-full h-8 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] transition-all placeholder:text-[var(--text-muted)]"
                                            />
                                            <Plus className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
                                        </form>
                                    </div>
                                )}

                                {/* Action Buttons - Minimal */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => isPaused ? resumeSession() : pauseSession()}
                                        className={cn(
                                            "flex-1 h-9 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-medium",
                                            isPaused
                                                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
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
                                        className="h-9 px-4 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center"
                                    >
                                        <SkipForward className="w-4 h-4" />
                                    </button>
                                </div>

                                {isOver && (
                                    <div className="absolute inset-0 bg-[var(--accent-primary)]/10 flex items-center justify-center backdrop-blur-sm rounded-2xl border-2 border-dashed border-[var(--accent-primary)]/40">
                                        <span className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-wider">Drop to switch...</span>
                                    </div>
                                )}
                            </div>
                        ) : focus.showCelebration && focus.celebratedTask ? (
                            // CELEBRATION CARD
                            <div className="relative rounded-2xl bg-[var(--bg-card)] border-2 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] p-5 text-center transition-all animate-in fade-in zoom-in-95 duration-300">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center justify-center gap-2">
                                    Well done! <span className="text-lg">💥</span>
                                </h3>

                                <div className="rounded-xl overflow-hidden mb-4 border border-[var(--border-default)] shadow-lg aspect-video">
                                    <img src={celebrationGif} alt="Celebration" className="w-full h-full object-cover" />
                                </div>

                                <div className="mb-6">
                                    <p className="text-sm font-medium text-[var(--text-muted)] line-through mb-1">{focus.celebratedTask.title}</p>
                                    <p className="text-emerald-400 font-bold text-base">You finished the task!</p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={async () => {
                                            dismissCelebration()
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
                                            dismissCelebration()
                                            focus.startBreak()
                                        }}
                                        className="w-full py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <Coffee className="w-4 h-4" />
                                        Take a Break
                                    </button>
                                </div>

                                <div className="mt-5 pt-4 border-t border-[var(--border-default)] flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                                    <span>Est: {focus.celebratedTask.estimated_minutes ? `${focus.celebratedTask.estimated_minutes}m` : 'None'}</span>
                                    <span>Taken: {Math.floor(focus.celebratedDuration / 60)}min</span>
                                </div>
                            </div>
                        ) : null}

                        {/* EMPTY STATE */}
                        {!activeTask && (
                            <div
                                ref={setDropRef}
                                className={cn(
                                    "rounded-2xl border-2 border-dashed border-[var(--border-default)] p-12 flex flex-col items-center justify-center text-center transition-all",
                                    isOver && "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 scale-[1.02]"
                                )}
                            >
                                <Timer className="w-10 h-10 text-[var(--text-muted)] mb-3" />
                                <p className="text-sm font-medium text-[var(--text-secondary)]">
                                    {isOver ? "Drop to start" : "No active task"}
                                </p>
                                <p className="text-xs text-[var(--text-tertiary)] mt-1">
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
                                            onComplete={() => useTaskStore.getState().toggleComplete(t.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </SortableContext>

                        {/* ADD TASK BUTTON */}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="w-full h-10 rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card)] hover:border-[var(--border-hover)] transition-all flex items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] group mt-3"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Add Task</span>
                        </button>

                        {/* COMPLETED SECTION */}
                        {tasks.filter(t => t.status === 'done' && isToday(t.completed_at) && !t.deleted_at).length > 0 && (
                            <div className="pt-6 mt-6 border-t border-[var(--border-default)] space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
                                        Achievements (Today)
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)] font-mono">
                                        {tasks.filter(t => t.status === 'done' && isToday(t.completed_at)).length} Done
                                    </span>
                                </div>

                                <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                                    {tasks
                                        .filter(t => t.status === 'done' && isToday(t.completed_at) && !t.deleted_at)
                                        .map(t => (
                                            <div key={t.id} className="group relative">
                                                <TaskCard
                                                    task={t}
                                                    column="done"
                                                    disableTimer
                                                    onComplete={() => { }}
                                                />
                                            </div>
                                        ))
                                    }
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
            <div className="border-t border-[var(--border-default)] p-4 flex items-center justify-between bg-[var(--bg-primary)]">
                <button
                    onClick={() => focus.isBreak ? focus.stopBreak() : focus.startBreak()}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium",
                        focus.isBreak
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                            : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-hover)]"
                    )}
                >
                    <Coffee className="w-4 h-4" />
                    <span>{focus.isBreak ? 'End Break' : 'Break'}</span>
                </button>

                <button
                    onClick={() => setShowFocusPanel(false)}
                    className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all duration-200 text-sm font-medium border border-transparent hover:border-[var(--border-hover)]"
                >
                    Close Session
                </button>
            </div>

            {
                showCreateModal && (
                    <CreateTaskModal
                        isOpen={true}
                        onClose={() => setShowCreateModal(false)}
                        listId={(selectedListId && selectedListId !== 'all' ? selectedListId : lists.find(l => l.id !== 'all')?.id) || ''}
                    />
                )
            }
        </div >
    )
}