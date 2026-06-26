import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTaskStore } from '@/store/taskStore'
import { useFocusStore } from '@/store/focusStore'
import { useListStore } from '@/store/listStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSyncStore } from '@/store/syncStore'
import { Play, Pause, ArrowLeft, CheckCircle2, Plus, ArrowRight, Settings as SettingsIcon, Coffee, Maximize2 } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { CreateTaskModal } from '../planner/CreateTaskModal'
import { TaskCard } from '../planner/TaskCard'
import { CompletionCelebration } from '../ui/CompletionCelebration'
import { HoldButton } from '../ui/HoldButton'
import { cn } from '@/utils/helpers'
import { SuperFocusPill } from './SuperFocusPill'
import type { Task } from '@/types/database'
import { platform } from '@/services/platform'

export function FocusMode() {
    const navigate = useNavigate()
    const { fetchTasksByColumn, moveTaskToColumn, reorderTasks, fetchTasks, tasks: allStoreTasks } = useTaskStore()
    const { selectedListId, lists } = useListStore()
    const settings = useSettingsStore()

    const {
        isActive,
        isPaused,
        taskId: activeTaskId,
        pauseSession,
        resumeSession,
        endSession,
        startSession,
        isBreak,
        startBreak,
        stopBreak
    } = useFocusStore()

    const { isOvertime, progress, breakRemaining, pomodoroRemaining, pomodoroTotal, displayTime } = useTimerDisplay()
    const { syncing, pendingCount, error: syncError } = useSyncStore()


    // Request Notification Permission
    useEffect(() => {
        if (settings.notificationAlertsEnabled && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }, [settings.notificationAlertsEnabled])

    // Local Tasks State
    const [tasks, setTasks] = useState<Task[]>([])

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Celebration State
    const [celebrationTask, setCelebrationTask] = useState<{ title: string; timeSpent: number } | null>(null)

    // Right Panel Tab State
    const [rightPanelTab, setRightPanelTab] = useState<'queue' | 'history'>('queue')

    // Load tasks
    const loadFocusTasks = useCallback(async () => {
        if (!selectedListId) return
        const todayTasks = await fetchTasksByColumn(selectedListId, 'today')
        setTasks(todayTasks)
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

    // Window resizing for Focus Mode entry/exit (Blitzit Parity)
    useEffect(() => {
        if (!settings.superFocusMode && platform.capabilities.nativeOverlay) {
            // Blitzit-style: 1/6 of screen width, full height, anchored left
            const sidebarWidth = Math.max(380, Math.round(window.screen.availWidth / 6))
            const screenHeight = window.screen.availHeight

            platform.focusWindow.resize(sidebarWidth, screenHeight, 0, 0)
            platform.focusWindow.setAlwaysOnTop(true)
        }

        return () => {
            // Restore to standard Planner size: 1400x900 on exit
            if (!settings.superFocusMode && platform.capabilities.nativeOverlay) {
                platform.focusWindow.restore()
                platform.focusWindow.setAlwaysOnTop(false)
            }
        }
    }, [settings.superFocusMode])

    // Load tasks on mount
    useEffect(() => {
        if (selectedListId) {
            loadFocusTasks()
            fetchTasks(selectedListId)
        }
    }, [selectedListId, fetchTasksByColumn, activeTaskId, fetchTasks, loadFocusTasks])


    const activeTask = tasks.find(t => t.id === activeTaskId) || allStoreTasks.find(t => t.id === activeTaskId)

    const handleBack = () => {
        navigate('/planner')
    }

    const handleCompleteTask = async (taskId: string) => {
        try {
            const taskToMove = tasks.find(t => t.id === taskId) || allStoreTasks.find(t => t.id === taskId)
            if (!taskToMove) return

            const isActiveTask = taskId === activeTaskId

            if (isActiveTask) {
                await endSession()
                if (settings.showSuccessScreen) {
                    setCelebrationTask({
                        title: taskToMove.title,
                        timeSpent: taskToMove.actual_seconds || 0
                    })
                }
            }

            await moveTaskToColumn(taskId, 'done')
            if (!isActiveTask) toast.success("Task Fulfilled")
            await loadFocusTasks()
        } catch (error) {
            console.error(error)
            toast.error('Failed to complete task')
            await loadFocusTasks()
        }
    }

    const { setNodeRef: setActiveRef, isOver: isOverActive } = useDroppable({ id: 'focus-active' })

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

        if (over.id === 'focus-active') {
            await startSession(taskId)
            await loadFocusTasks()
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

    if (settings.superFocusMode) {
        return <SuperFocusPill />
    }

    const ringCirc = 2 * Math.PI * 52
    const ringPct = Math.min(100, isBreak
        ? (breakRemaining / (settings.defaultBreakLength * 60)) * 100
        : (settings.pomodorosEnabled ? (pomodoroRemaining / pomodoroTotal) * 100 : progress))
    const isOver = isOvertime && !isBreak && !settings.pomodorosEnabled
    const ringStroke = isBreak ? 'var(--break)' : (isOver ? 'var(--break)' : 'var(--focus)')

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full flex flex-col font-sans select-none overflow-hidden bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-default)] shrink-0">
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            isActive && !isPaused ? cn("animate-pulse", isBreak ? "bg-[var(--break)]" : "bg-[var(--focus)]") : "bg-[var(--text-muted)]"
                        )} />
                        <h1 className="text-[24px] font-semibold tracking-tight">
                            {isBreak ? 'Break' : 'Focus'}
                        </h1>
                    </div>

                    {/* POMODORO BADGE: Centered Top */}
                    {!isBreak && settings.pomodorosEnabled && (
                        <div className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                            <div className="px-3 py-1 rounded-full bg-[var(--focus)] text-[var(--accent-contrast)] text-xs font-semibold tracking-wide tabular-nums">
                                POMO {formatTimerTime(pomodoroRemaining)}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => settings.updateSettings({ superFocusMode: true })}
                            className="w-9 h-9 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            title="Super Focus"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => navigate('/settings')}
                            className="w-9 h-9 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            title="Settings"
                        >
                            <SettingsIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 px-4 h-9 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-sm font-semibold">Exit</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-8 grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* TIMER + RING */}
                        <div className="rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] p-6 flex flex-col items-center justify-center">
                            <div className="mb-4 h-7 flex items-center">
                                {isBreak ? (
                                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Recovery mode</span>
                                ) : settings.pomodorosEnabled ? (
                                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Focus session</span>
                                ) : (
                                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Open focus</span>
                                )}
                            </div>

                            <div className="relative w-[260px] h-[260px]">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-hover)" strokeWidth="8" />
                                    <motion.circle
                                        cx="60" cy="60" r="52" fill="none" stroke={ringStroke} strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray={ringCirc}
                                        animate={{ strokeDashoffset: ringCirc - (ringPct / 100) * ringCirc }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={cn(
                                        "font-semibold text-[52px] leading-none tabular-nums tracking-tight",
                                        isOver ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
                                    )}>
                                        {formatTimerTime(displayTime)}
                                    </span>
                                    {activeTask && (
                                        <span className="mt-3 max-w-[180px] text-center text-sm text-[var(--text-tertiary)] truncate">
                                            {activeTask.title}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* CONTROLS */}
                            <div className="w-full flex items-center justify-center gap-3 mt-8">
                                <button
                                    onClick={() => isPaused ? resumeSession() : pauseSession()}
                                    className={cn(
                                        "flex items-center gap-2 px-6 h-12 rounded-full font-semibold transition-all active:scale-95",
                                        isPaused
                                            ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-105 shadow-sm"
                                            : "bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--border-hover)]"
                                    )}
                                >
                                    {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                                </button>

                                <HoldButton
                                    onTrigger={() => activeTask && handleCompleteTask(activeTask.id)}
                                    duration={1500}
                                    className="flex items-center gap-2 px-6 h-12 rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-semibold hover:brightness-105 active:scale-95 transition-all shadow-sm"
                                    fillClassName="bg-black/10"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Done</span>
                                </HoldButton>

                                <button
                                    onClick={() => isBreak ? stopBreak() : startBreak()}
                                    className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95",
                                        isBreak
                                            ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                                            : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-hover)] hover:text-[var(--text-primary)]"
                                    )}
                                    title={isBreak ? 'End Break' : 'Take Break'}
                                >
                                    <Coffee className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => endSession()}
                                    className="w-12 h-12 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-hover)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all active:scale-95"
                                    title="Skip"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col gap-4">
                            {/* ACTIVE TASK TILE */}
                            <div
                                ref={setActiveRef}
                                className={cn(
                                    "rounded-[var(--radius-tile)] border transition-all p-5 relative",
                                    isOverActive
                                        ? "bg-[var(--bg-hover)] border-[var(--border-hover)] border-dashed"
                                        : "bg-[var(--bg-card)] border-[var(--border-default)]"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">Active task</h2>
                                    {syncError ? (
                                        <span className="text-xs text-[var(--error)]">Sync error</span>
                                    ) : syncing ? (
                                        <span className="text-xs text-[var(--text-tertiary)] animate-pulse">Syncing…</span>
                                    ) : pendingCount > 0 ? (
                                        <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{pendingCount} pending</span>
                                    ) : null}
                                </div>

                                <div className="mt-4">
                                    {activeTask ? (
                                        <TaskCard
                                            task={activeTask}
                                            column="today"
                                            draggable={false}
                                            onComplete={() => handleCompleteTask(activeTask.id)}
                                        />
                                    ) : (
                                        <div className="rounded-[var(--radius-card)] bg-[var(--bg-hover)] py-10 flex flex-col items-center justify-center text-center gap-2">
                                            <Play className="w-7 h-7 text-[var(--text-muted)]" />
                                            <p className="text-sm text-[var(--text-tertiary)]">Drag a task here<br />to start a session</p>
                                        </div>
                                    )}
                                </div>

                                {isOverActive && (
                                    <div className="absolute inset-0 bg-[var(--bg-hover)]/80 backdrop-blur-sm rounded-[var(--radius-tile)] flex items-center justify-center z-50">
                                        <Play className="w-12 h-12 text-[var(--accent-primary)] fill-[var(--accent-primary)] animate-pulse" />
                                    </div>
                                )}
                            </div>

                            {/* QUEUE / HISTORY TILE */}
                            <div className="flex-1 rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] p-5 flex flex-col min-h-[360px]">
                                <div className="flex items-center gap-1 shrink-0 p-1 bg-[var(--bg-hover)] rounded-[var(--radius-pill)] self-start">
                                    <button
                                        onClick={() => setRightPanelTab('queue')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-semibold transition-colors",
                                            rightPanelTab === 'queue'
                                                ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                        )}
                                    >
                                        Up next
                                    </button>
                                    <button
                                        onClick={() => setRightPanelTab('history')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-[var(--radius-pill)] text-sm font-semibold transition-colors",
                                            rightPanelTab === 'history'
                                                ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                        )}
                                    >
                                        Completed
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 -mx-1 px-1">
                                    {rightPanelTab === 'queue' ? (
                                        <div className="space-y-2">
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

                                            <button
                                                onClick={() => setShowCreateModal(true)}
                                                className="w-full h-11 rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-all flex items-center justify-center gap-2 group mt-2"
                                            >
                                                <Plus className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                                                <span className="text-sm font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">Add task</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="-mx-2">
                                            {allStoreTasks.filter(t => t.status === 'done' && t.completed_at?.startsWith(new Date().toISOString().split('T')[0])).length === 0 && (
                                                <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                                                    <CheckCircle2 className="w-7 h-7 text-[var(--text-muted)]" />
                                                    <p className="text-sm text-[var(--text-tertiary)]">No tasks completed yet today</p>
                                                </div>
                                            )}
                                            {allStoreTasks
                                                .filter(t => t.status === 'done' && t.completed_at?.startsWith(new Date().toISOString().split('T')[0]))
                                                .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
                                                .map(t => (
                                                    <div key={t.id} className="rounded-[var(--radius-card)] px-2 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-hover)] transition-colors">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-[var(--text-secondary)] truncate">{t.title}</p>
                                                                <p className="text-[11px] text-[var(--text-muted)] tabular-nums">{t.completed_at ? t.completed_at.split('T')[1].slice(0, 5) : 'Done'}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-semibold text-[var(--text-tertiary)] tabular-nums shrink-0">{Math.round((t.actual_seconds || 0) / 60)}m</span>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {showCreateModal && (
                    <CreateTaskModal
                        isOpen={true}
                        onClose={() => setShowCreateModal(false)}
                        listId={selectedListId && selectedListId !== 'all' ? selectedListId : (lists.find(l => l.id !== 'all')?.id || '')}
                        onCreated={(task) => {
                            if (selectedListId !== 'all' && task.list_id !== selectedListId) return
                            setTasks(prev => {
                                if (prev.some(t => t.id === task.id)) return prev
                                return [...prev, task].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                            })
                        }}
                    />
                )}

                {celebrationTask && (
                    <CompletionCelebration
                        taskTitle={celebrationTask.title}
                        timeSpent={celebrationTask.timeSpent}
                        onClose={() => setCelebrationTask(null)}
                    />
                )}

                {isBreak && (
                    <div className="fixed inset-0 bg-[var(--bg-secondary)]/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-6">Recovery mode</span>
                        <h2 className="text-[30px] font-semibold tracking-tight text-[var(--text-primary)] mb-2">Take a breather</h2>
                        <div className="font-semibold text-[64px] leading-none text-[var(--text-primary)] my-10 tabular-nums tracking-tight">
                            {formatTimerTime(breakRemaining)}
                        </div>
                        <button
                            onClick={() => stopBreak()}
                            className="px-10 py-3.5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-semibold hover:brightness-105 active:scale-95 transition-all shadow-sm"
                        >Resume focus</button>
                    </div>
                )}

            </div>
        </DndContext>
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
