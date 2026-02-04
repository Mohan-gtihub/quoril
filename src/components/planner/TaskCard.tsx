import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
/* --------------------------------------------- */
import { Play, Square, MoreHorizontal, Plus, Trash2, ArrowRight, ArrowLeft, FileText, ListTodo, Zap } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import type { Task } from '@/types/database'
import type { TaskColumn } from '@/types/list'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { calculateRemainingSeconds } from '@/utils/sessionUtils'
import { useState, useEffect } from 'react'
import { formatTimeInput, parseTimeInput } from '@/utils/timeParser'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { cn } from '@/utils/helpers'

interface TaskCardProps {
    task: Task
    column: TaskColumn
    onComplete?: () => void
    draggable?: boolean
    disableTimer?: boolean
}

const COLUMN_ORDER: TaskColumn[] = ['backlog', 'this_week', 'today', 'done']

// Helper to determine active state style
const getTaskStateStyles = (isActive: boolean, isPaused: boolean, isCompleted: boolean) => {
    if (isCompleted) {
        return "bg-black/40 border-white/5 opacity-60"
    }
    if (isActive) {
        if (isPaused) {
            return "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20"
        } else {
            return "bg-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/30"
        }
    }
    return "bg-[#161618] border-white/5 hover:border-white/10 hover:bg-[#1c1c1e] shadow-lg shadow-black/20"
}

export function TaskCard({ task, column, onComplete, draggable = true, disableTimer = false }: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, disabled: !draggable })

    const { updateTask, deleteTask, moveTaskToColumn, fetchSubtasks, subtasks, toggleSubtask, deleteSubtask, createSubtask } = useTaskStore()

    // Focus Store – subscribe to what we need for active-timer display
    const timer = useTimerDisplay()
    const isTaskActive = timer.isActive && timer.taskId === task.id
    const focus = useFocusStore()

    // Use synced timer if active, else fallback to static task calculation
    const displayRemainingSeconds = isTaskActive
        ? timer.remainingTime
        : calculateRemainingSeconds(task, 0)

    // Local State
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [titleInput, setTitleInput] = useState(task.title)
    const [isEditingEst, setIsEditingEst] = useState(false)
    const [estInput, setEstInput] = useState(formatTimeInput(task.estimated_minutes || 0))
    const [isEditingActual, setIsEditingActual] = useState(false)
    const [actualInput, setActualInput] = useState(formatTimeInput(Math.floor((task.actual_seconds || 0) / 60)))
    const [descriptionInput, setDescriptionInput] = useState(task.description || '')
    const [isExpanded, setIsExpanded] = useState(false)
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

    // Fetch subtasks on mount for progress display
    useEffect(() => {
        fetchSubtasks(task.id)
    }, [task.id, fetchSubtasks])

    const allSubtasks = subtasks[task.id] || []

    const handleColumnMove = async (direction: 'next' | 'prev') => {
        const currentIndex = COLUMN_ORDER.indexOf(column)
        if (currentIndex === -1) return

        const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
        if (newIndex >= 0 && newIndex < COLUMN_ORDER.length) {
            const targetCol = COLUMN_ORDER[newIndex]
            await moveTaskToColumn(task.id, targetCol)
        }
    }

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSubtaskTitle.trim()) return
        await createSubtask(task.id, newSubtaskTitle)
        setNewSubtaskTitle('')
    }

    const handleDeleteSubtask = async (subtaskId: string) => {
        await deleteSubtask(subtaskId)
    }

    // Progress Calculation
    const totalSub = allSubtasks.length
    const doneSub = allSubtasks.filter(s => s.done || s.completed).length
    const progressPercent = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0

    const isCompleted = task.status === 'done' || column === 'done'

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 100 : 1,
    }

    const formatRemainingTime = (seconds: number) => {
        const absSeconds = Math.abs(seconds)
        const h = Math.floor(absSeconds / 3600)
        const m = Math.floor((absSeconds % 3600) / 60)
        const s = Math.floor(absSeconds % 60)
        const timeStr = `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        return seconds < 0 ? `+${timeStr}` : timeStr
    }

    const handleStartClick = () => {
        if (isTaskActive) {
            if (timer.isPaused) focus.resumeSession()
            else focus.pauseSession()
        } else {
            focus.startSession(task.id)
            focus.setShowFocusPanel(true)
        }
    }

    const handleStopClick = async () => {
        if (window.confirm('End focus session?')) {
            await focus.endSession()
        }
    }

    const handleTitleBlur = async () => {
        setIsEditingTitle(false)
        if (titleInput !== task.title) {
            await updateTask(task.id, { title: titleInput })
        }
    }

    const handleEstBlur = async () => {
        setIsEditingEst(false)
        const minutes = parseTimeInput(estInput)
        if (minutes !== task.estimated_minutes) {
            await updateTask(task.id, { estimated_minutes: minutes })
        }
    }

    const handleActualBlur = async () => {
        setIsEditingActual(false)
        const minutes = parseTimeInput(actualInput)
        if (minutes * 60 !== task.actual_seconds) {
            await updateTask(task.id, { actual_seconds: minutes * 60 })
        }
    }

    const handleDescriptionBlur = async () => {
        if (descriptionInput !== task.description) {
            await updateTask(task.id, { description: descriptionInput })
        }
    }


    const stateStyles = getTaskStateStyles(isTaskActive, timer.isPaused, isCompleted)

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id)
                e.dataTransfer.effectAllowed = 'move'
            }}
            className={cn(
                "group rounded-xl p-3 mb-2 transition-all duration-300 border backdrop-blur-sm relative",
                stateStyles
            )}
            style={style}
        >
            {/* Top Row: Title & Actions */}
            <div className="flex items-start gap-3 min-h-[28px]">
                {/* Checkbox */}
                <div className="pt-0.5">
                    <Checkbox
                        checked={isCompleted}
                        onChange={onComplete || (() => { })}
                        size="sm"
                    />
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                            autoFocus
                            className="w-full bg-white/5 text-white text-sm px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={e => e.stopPropagation()}
                        />
                    ) : (
                        <p
                            className={cn(
                                "text-sm font-semibold leading-tight break-words cursor-text transition-colors",
                                isCompleted ? "line-through text-white/30" : "text-white/90 group-hover:text-white"
                            )}
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsEditingTitle(true)
                            }}
                        >
                            {task.title}
                        </p>
                    )}

                    {/* Inline Subtasks & Progress - ONLY IF ACTIVE */}
                    {isTaskActive && allSubtasks.length > 0 && (
                        <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            <div className="space-y-1.5">
                                {allSubtasks.slice(0, 5).map(sub => (
                                    <div key={sub.id} className="flex items-center gap-2 px-1 py-0.5 group/sub">
                                        <Checkbox
                                            checked={!!(sub.done || sub.completed)}
                                            onChange={() => toggleSubtask(sub.id)}
                                            size="xs"
                                        />
                                        <span className={cn(
                                            "text-[11px] truncate flex-1",
                                            (sub.done || sub.completed) ? "line-through text-white/30" : "text-white/60"
                                        )}>
                                            {sub.title}
                                        </span>
                                    </div>
                                ))}
                                {allSubtasks.length > 5 && (
                                    <span className="text-[10px] text-white/40 pl-6 font-medium">+{allSubtasks.length - 5} more</span>
                                )}
                            </div>

                            {/* Premium Progress Bar */}
                            <div className="mt-3 pt-2 border-t border-white/5">
                                <div className="flex justify-between items-center mb-1.5 px-0.5">
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Session Progress</span>
                                    <span className="text-[10px] text-blue-400 font-mono font-bold">{doneSub}/{totalSub}</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden ring-1 ring-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hover Actions */}
                <div className={cn(
                    "flex items-center gap-1 transition-all duration-200",
                    isTaskActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        title="Expansion"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bottom Row: Metadata & Timer */}
            <div className="flex items-center justify-between mt-3 pl-1">
                <div className="flex items-center gap-4">
                    {/* EST */}
                    <div
                        className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setIsEditingEst(true); }}
                    >
                        {isEditingEst ? (
                            <input
                                value={estInput}
                                onChange={(e) => setEstInput(e.target.value)}
                                onBlur={handleEstBlur}
                                onKeyDown={(e) => e.key === 'Enter' && handleEstBlur()}
                                className="w-12 bg-white/5 text-white text-[11px] px-1 rounded focus:outline-none ring-1 ring-blue-500/30"
                                autoFocus
                                onClick={e => e.stopPropagation()}
                                onPointerDown={e => e.stopPropagation()}
                            />
                        ) : (
                            <span className="flex items-center gap-1 lowercase tracking-tight">
                                <Zap className="w-3 h-3 text-amber-500/50" />
                                {task.estimated_minutes ? `${formatTimeInput(task.estimated_minutes)}` : 'set est'}
                            </span>
                        )}
                    </div>

                    {/* Subtasks Count (if not active) */}
                    {!isTaskActive && totalSub > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white/40">
                            <ListTodo className="w-3 h-3" />
                            <span>{doneSub}/{totalSub}</span>
                        </div>
                    )}
                </div>

                {/* Right Side: Timer Controls */}
                <div className="flex items-center gap-2">
                    {!isCompleted && !disableTimer && (
                        <button
                            onClick={(e) => { e.stopPropagation(); isTaskActive ? handleStopClick() : handleStartClick(); }}
                            className={cn(
                                "h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-lg",
                                isTaskActive
                                    ? "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30"
                                    : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20"
                            )}
                        >
                            {isTaskActive ? (
                                <><Square className="w-2.5 h-2.5 fill-current" /><span>Stop</span></>
                            ) : (
                                <><Play className="w-2.5 h-2.5 fill-current" /><span>Start</span></>
                            )}
                        </button>
                    )}

                    {/* Timer Display */}
                    <div className="text-[11px] font-mono font-bold tracking-tighter">
                        {isTaskActive ? (
                            <span className={cn(
                                "animate-pulse px-2 py-0.5 rounded-md bg-white/5",
                                displayRemainingSeconds < 0 ? "text-red-400" : "text-blue-400"
                            )}>
                                {formatRemainingTime(displayRemainingSeconds)}
                            </span>
                        ) : (
                            <span
                                onClick={e => { e.stopPropagation(); setIsEditingActual(true); }}
                                className="text-white/30 hover:text-white/60 cursor-pointer"
                            >
                                {isEditingActual ? (
                                    <input
                                        value={actualInput}
                                        onChange={(e) => setActualInput(e.target.value)}
                                        onBlur={handleActualBlur}
                                        onKeyDown={(e) => e.key === 'Enter' && handleActualBlur()}
                                        className="w-12 bg-white/5 text-white px-1 rounded focus:outline-none ring-1 ring-blue-500/30"
                                        autoFocus
                                        onClick={e => e.stopPropagation()}
                                        onPointerDown={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <span>{task.actual_seconds ? `${formatTimeInput(Math.floor(task.actual_seconds / 60))}` : '0m'}</span>
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Expansion Menu (Drop down) */}
            {isExpanded && (
                <div
                    className="mt-4 pt-4 border-t border-white/5 space-y-5 animate-in fade-in duration-300"
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                >
                    {/* Description */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">
                            <FileText className="w-3 h-3" />
                            Quick Notes
                        </div>
                        <textarea
                            placeholder="Think it, type it..."
                            value={descriptionInput}
                            onChange={(e) => setDescriptionInput(e.target.value)}
                            onBlur={handleDescriptionBlur}
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none min-h-[80px] placeholder:text-white/10 transition-all"
                        />
                    </div>

                    {/* Subtasks */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                                <ListTodo className="w-3 h-3" />
                                Breakdown
                            </div>
                            <span className="text-[10px] font-bold text-white/30">{doneSub}/{totalSub}</span>
                        </div>

                        <div className="space-y-1">
                            {allSubtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-white/5 group/sub">
                                    <Checkbox
                                        checked={!!(subtask.done || subtask.completed)}
                                        onChange={() => toggleSubtask(subtask.id)}
                                        size="sm"
                                    />
                                    <span className={cn(
                                        "flex-1 text-xs",
                                        (subtask.done || subtask.completed) ? "text-white/20 line-through" : "text-white/70"
                                    )}>
                                        {subtask.title}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteSubtask(subtask.id)}
                                        className="opacity-0 group-hover/sub:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg text-white/20 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}

                            <form onSubmit={handleAddSubtask} className="relative mt-2">
                                <input
                                    type="text"
                                    placeholder="Add specialized mission..."
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                                />
                                <Plus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            </form>
                        </div>
                    </div>

                    {/* Danger Zone / Move */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleColumnMove('prev')}
                                disabled={column === 'backlog'}
                                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white disabled:opacity-20 transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleColumnMove('next')}
                                disabled={column === 'done'}
                                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white disabled:opacity-20 transition-all"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={() => { if (window.confirm('Erase this task?')) deleteTask(task.id); }}
                            className="p-2 rounded-lg bg-red-500/5 text-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
