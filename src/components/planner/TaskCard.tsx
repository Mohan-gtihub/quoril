import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
/* --------------------------------------------- */
import { Play, Pause, Square, MoreHorizontal, Plus, Trash2, ArrowRight, ArrowLeft, FileText, ListTodo, Zap, Repeat } from 'lucide-react'
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
import { useSettingsStore } from '@/store/settingsStore'
import { confirm } from '@/components/ui/ConfirmDialog'
import { usePlannerStore } from '@/store/plannerStore'
import { isSameDay, startOfToday } from 'date-fns'

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
        return "bg-[var(--bg-tertiary)]/40 border-[var(--border-default)] opacity-60"
    }
    if (isActive) {
        if (isPaused) {
            return "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20"
        } else {
            return "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/40 shadow-[0_0_20px_var(--accent-glow)] ring-1 ring-[var(--accent-primary)]/30"
        }
    }
    return "bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] shadow-lg shadow-black/5"
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

    const { updateTask, archiveTask, permanentDeleteTask, moveTaskToColumn, fetchSubtasks, subtasks, toggleSubtask, deleteSubtask, createSubtask, toggleTaskRecurring } = useTaskStore()
    const settings = useSettingsStore()

    const { selectedDate } = usePlannerStore()
    // Focus Store – subscribe to what we need for active-timer display
    const timer = useTimerDisplay()
    const isTaskActive = timer.isActive && timer.taskId === task.id && isSameDay(selectedDate, startOfToday())
    const focus = useFocusStore()

    // Use synced timer if active, else fallback to static task calculation
    const displayRemainingSeconds = isTaskActive
        ? timer.remainingTime
        : calculateRemainingSeconds(task, 0)

    // Local State
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [titleInput, setTitleInput] = useState(task.title)
    const [isEditingEst, setIsEditingEst] = useState(false)
    const [estInput, setEstInput] = useState(formatTimeInput(task.estimated_minutes ?? 0))
    const [isEditingActual, setIsEditingActual] = useState(false)
    const [actualInput, setActualInput] = useState(formatTimeInput(Math.floor((task.actual_seconds ?? 0) / 60)))
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
        const ok = await confirm({ message: 'End this focus session?', variant: 'warning', confirmLabel: 'End Session' })
        if (ok) await focus.endSession()
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
                        onChange={() => onComplete ? onComplete() : undefined}
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
                            className="w-full bg-[var(--bg-hover)] text-[var(--text-primary)] text-sm px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/50"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={e => e.stopPropagation()}
                        />
                    ) : (
                        <p
                            className={cn(
                                "text-sm font-semibold leading-tight break-words cursor-text transition-colors",
                                isCompleted ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]/90 group-hover:text-[var(--text-primary)]"
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
                                            checked={!!sub.completed}
                                            onChange={() => toggleSubtask(sub.id)}
                                            size="xs"
                                        />
                                        <span className={cn(
                                            "text-[11px] truncate flex-1",
                                            sub.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
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
                            <div className="mt-3 pt-2 border-t border-[var(--border-default)]">
                                <div className="flex justify-between items-center mb-1.5 px-0.5">
                                    <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Session Progress</span>
                                    <span className="text-[10px] text-[var(--accent-primary)] font-mono font-bold">{doneSub}/{totalSub}</span>
                                </div>
                                <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden ring-1 ring-[var(--border-default)]">
                                    <div
                                        className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-700 ease-out shadow-[0_0_8px_var(--accent-glow)]"
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
                    {!isTaskActive && (
                        <button
                            onClick={(e) => { e.stopPropagation(); focus.startSession(task.id); }}
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-white/40 hover:text-blue-400 transition-colors"
                            aria-label="Instant Launch"
                            title="Instant Launch"
                        >
                            <Zap className="w-4 h-4 fill-current" />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleTaskRecurring(task.id); }}
                        className={cn(
                            "p-1.5 rounded-lg transition-all",
                            task.is_recurring
                                ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
                                : "hover:bg-white/10 text-white/40 hover:text-white"
                        )}
                        title={task.is_recurring ? "Daily Recurrence On" : "Enable Daily Recurrence"}
                    >
                        <Repeat className={cn("w-4 h-4", task.is_recurring && "animate-pulse-slow")} />
                    </button>
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
                    {!settings.hideEstDoneTimes && (
                        <div
                            className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setIsEditingEst(true); }}
                        >
                            {isEditingEst ? (
                                <input
                                    value={estInput}
                                    onChange={(e) => setEstInput(e.target.value)}
                                    onBlur={handleEstBlur}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEstBlur()}
                                    className="w-12 bg-[var(--bg-hover)] text-[var(--text-primary)] text-[11px] px-1 rounded focus:outline-none ring-1 ring-[var(--accent-primary)]/30"
                                    autoFocus
                                    onClick={e => e.stopPropagation()}
                                    onPointerDown={e => e.stopPropagation()}
                                />
                            ) : (
                                <span className="flex items-center gap-1 lowercase tracking-tight">
                                    <Zap className="w-3 h-3 text-amber-500/50" />
                                    {(task.estimated_minutes ?? 0) > 0 ? `${formatTimeInput(task.estimated_minutes!)}` : 'unlimited'}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Subtasks Count (if not active) */}
                    {!isTaskActive && totalSub > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-tertiary)]">
                            <ListTodo className="w-3 h-3" />
                            <span>{doneSub}/{totalSub}</span>
                        </div>
                    )}
                </div>

                {/* Right Side: Timer Controls */}
                <div className="flex items-center gap-1.5">
                    {!isCompleted && !disableTimer && (
                        <>
                            {isTaskActive ? (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); timer.isPaused ? focus.resumeSession() : focus.pauseSession(); }}
                                        className={cn(
                                            "h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-lg",
                                            timer.isPaused
                                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                                : "bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30"
                                        )}
                                        title={timer.isPaused ? "Resume Mission" : "Hold Mission"}
                                    >
                                        {timer.isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleStopClick(); }}
                                        className="h-7 px-2.5 rounded-lg text-[10px] bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/30 hover:bg-[var(--error)]/30 font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-lg"
                                        title="Stop Mission"
                                    >
                                        <Square className="w-2.5 h-2.5 fill-current" />
                                        <span>Stop</span>
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleStartClick(); }}
                                    className="h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)] shadow-[var(--accent-primary)]/20"
                                >
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    <span>Start</span>
                                </button>
                            )}
                        </>
                    )}

                    {/* Timer Display */}
                    <div className="text-[11px] font-mono font-bold tracking-tighter">
                        {isTaskActive ? (
                            <span className={cn(
                                "animate-pulse px-2 py-0.5 rounded-md bg-[var(--bg-hover)]",
                                (isTaskActive ? timer.isOvertime : (task.estimated_minutes ?? 0) > 0 && displayRemainingSeconds < 0) ? "text-[var(--error)]" : "text-[var(--accent-primary)]"
                            )}>
                                {formatRemainingTime(displayRemainingSeconds)}
                            </span>
                        ) : (
                            <span
                                onClick={e => { e.stopPropagation(); setIsEditingActual(true); }}
                                className="text-[var(--text-muted)] hover:text-[var(--text-tertiary)] cursor-pointer"
                            >
                                {isEditingActual ? (
                                    <input
                                        value={actualInput}
                                        onChange={(e) => setActualInput(e.target.value)}
                                        onBlur={handleActualBlur}
                                        onKeyDown={(e) => e.key === 'Enter' && handleActualBlur()}
                                        className="w-12 bg-[var(--bg-hover)] text-[var(--text-primary)] px-1 rounded focus:outline-none ring-1 ring-[var(--accent-primary)]/30"
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
                    className="mt-4 pt-4 border-t border-[var(--border-default)] space-y-5 animate-in fade-in duration-300"
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                >
                    {/* Description */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">
                            <FileText className="w-3 h-3" />
                            Quick Notes
                        </div>
                        <textarea
                            placeholder="Think it, type it..."
                            value={descriptionInput}
                            onChange={(e) => setDescriptionInput(e.target.value)}
                            onBlur={handleDescriptionBlur}
                            className="w-full bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/30 resize-none min-h-[80px] placeholder:text-[var(--text-muted)] transition-all"
                        />
                    </div>

                    {/* Subtasks */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
                                <ListTodo className="w-3 h-3" />
                                Breakdown
                            </div>
                            <span className="text-[10px] font-bold text-[var(--text-tertiary)]">{doneSub}/{totalSub}</span>
                        </div>

                        <div className="space-y-1">
                            {allSubtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-[var(--bg-hover)] group/sub">
                                    <Checkbox
                                        checked={!!(subtask.done || subtask.completed)}
                                        onChange={() => toggleSubtask(subtask.id)}
                                        size="sm"
                                    />
                                    <span className={cn(
                                        "flex-1 text-xs",
                                        (subtask.done || subtask.completed) ? "text-[var(--text-muted)] line-through" : "text-[var(--text-secondary)]"
                                    )}>
                                        {subtask.title}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteSubtask(subtask.id)}
                                        className="opacity-0 group-hover/sub:opacity-100 p-1.5 hover:bg-[var(--error)]/10 rounded-lg text-[var(--text-muted)] hover:text-[var(--error)] transition-all"
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
                                    className="w-full bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-all"
                                />
                                <Plus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            </form>
                        </div>
                    </div>

                    {/* Danger Zone / Move */}
                    <div className="pt-4 border-t border-[var(--border-default)] flex items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleColumnMove('prev')}
                                disabled={column === 'backlog'}
                                className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleColumnMove('next')}
                                disabled={column === 'done'}
                                className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-all"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { focus.startSession(task.id) }}
                                className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 hover:text-[var(--accent-secondary)] transition-all"
                                aria-label="Launch Task Now"
                                title="Launch Task Now"
                            >
                                <Zap className="w-4 h-4 fill-current" />
                            </button>
                            <button
                                onClick={async () => { if (await confirm({ message: 'Archive this task? It will be removed from view.', variant: 'warning', confirmLabel: 'Archive' })) archiveTask(task.id); }}
                                className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
                                title="Archive Task"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-archive"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
                            </button>
                            <button
                                onClick={async () => { if (await confirm({ message: 'Permanently delete this task? This cannot be undone.', variant: 'danger', confirmLabel: 'Delete' })) permanentDeleteTask(task.id); }}
                                className="p-2 rounded-lg bg-[var(--error)]/5 text-[var(--error)]/40 hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-all"
                                title="Delete Permanently"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
