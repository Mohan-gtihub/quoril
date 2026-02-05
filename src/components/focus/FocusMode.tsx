import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTaskStore } from '@/store/taskStore'
import { useFocusStore } from '@/store/focusStore'
import { useListStore } from '@/store/listStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Play, Pause, Zap, ArrowLeft, CheckCircle2, Plus, ArrowRight, ListTodo, FileText, Settings as SettingsIcon, Coffee } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { CreateTaskModal } from '../planner/CreateTaskModal'
import { TaskCard } from '../planner/TaskCard'
import { CompletionCelebration } from '../ui/CompletionCelebration'
import { HoldButton } from '../ui/HoldButton'
import { cn } from '@/utils/helpers'
import { soundService } from '@/services/soundService'
import { SuperFocusPill } from './SuperFocusPill'
import type { Task } from '@/types/database'

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

    const { remainingTime, isOvertime, progress, elapsed, breakRemaining, pomodoroRemaining, pomodoroTotal } = useTimerDisplay()

    const [shouldFlash, setShouldFlash] = useState(false)
    const triggerFlash = useCallback(() => {
        if (!settings.animatedFlash) return
        setShouldFlash(true)
        setTimeout(() => setShouldFlash(false), 500)
    }, [settings.animatedFlash])

    // Timed Alerts Logic
    useEffect(() => {
        if (!isActive || isPaused || isBreak || !settings.timedAlertsEnabled) return

        const intervalSeconds = settings.alertInterval * 60
        if (elapsed > 0 && elapsed % intervalSeconds === 0) {
            triggerFlash()
            soundService.playAlert(settings.alertSound)

            if (settings.notificationAlertsEnabled && Notification.permission === 'granted') {
                new Notification("Quoril Focus", { body: "Stay Focused! 🎯 Task progress is being logged.", icon: '/icon.png' })
            }

            toast("Stay Focused! 🎯", {
                icon: '⚡',
                style: {
                    borderRadius: '12px',
                    background: '#1d4ed8',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px'
                },
            })
        }
    }, [elapsed, isActive, isPaused, isBreak, settings.alertInterval, settings.timedAlertsEnabled, settings.alertSound, settings.notificationAlertsEnabled, triggerFlash])

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
        if (!settings.superFocusMode && window.electron) {
            // Blitzit-style: 1/6 of screen width, full height, anchored left
            const sidebarWidth = Math.max(380, Math.round(window.screen.availWidth / 6))
            const screenHeight = window.screen.availHeight

            window.electron.resizeWindow(sidebarWidth, screenHeight, 0, 0)
            window.electron.setAlwaysOnTop(true)
        }

        return () => {
            // Restore to standard Planner size: 1400x900 on exit
            if (!settings.superFocusMode && window.electron) {
                window.electron.restoreWindow()
                window.electron.setAlwaysOnTop(false)
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
            if (!isActiveTask) toast.success("Task Fulfiilled! 🚀")
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

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
        >
            <div className={cn(
                "h-full flex flex-col font-sans select-none overflow-hidden transition-colors duration-700",
                settings.theme === 'blue' ? "bg-[#050b1a]" : settings.theme === 'red' ? "bg-[#1a0505]" : "bg-[#0a0c10]",
                "text-white"
            )}>
                <header className={cn(
                    "h-14 flex items-center justify-between px-6 border-b border-white/5",
                    settings.theme === 'blue' ? "bg-[#0a1630]" : settings.theme === 'red' ? "bg-[#300a0a]" : "bg-[#0d0f14]"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            settings.theme === 'blue' ? "bg-blue-400 shadow-[0_0_8px_#3b82f6]" : settings.theme === 'red' ? "bg-red-400 shadow-[0_0_8px_#ef4444]" : "bg-green-500"
                        )} />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40">Focus Terminal</span>
                            <div className="overflow-hidden w-24">
                                <span className={cn(
                                    "text-[9px] font-mono text-blue-400/60 uppercase tracking-wider block whitespace-nowrap",
                                    settings.scrollingTitle && activeTask && "animate-[marquee_10s_linear_infinite]"
                                )}>
                                    {settings.scrollingTitle && activeTask ? activeTask.title : 'QS_V1.0.4.QUORIL'}
                                </span>
                            </div>
                        </div>

                        {/* Quick Break Access */}
                        <button
                            onClick={() => isBreak ? stopBreak() : startBreak()}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
                                isBreak
                                    ? "bg-amber-500 text-black border-amber-400"
                                    : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <Coffee className="w-3 h-3" />
                            {isBreak ? 'End Break' : 'Take Break'}
                        </button>

                        {/* Super Focus Mode Toggle */}
                        <button
                            onClick={() => settings.updateSettings({ superFocusMode: true })}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <Zap className="w-3 h-3" />
                            Super Focus
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/settings')}
                            className="p-2 rounded-lg hover:bg-white/5 text-white/40 transition-colors"
                        >
                            <SettingsIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-all group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Exit</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center pt-8 pb-12 px-6 overflow-y-auto custom-scrollbar">
                    <div className="mb-12 text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            {isBreak && <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full animate-pulse border border-amber-500/20">Recovery Mode</span>}
                            {!isBreak && settings.pomodorosEnabled && <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">Focus Session</span>}
                        </div>
                        <div className={`font-mono font-black text-[64px] leading-none mb-2 tabular-nums tracking-tighter ${isOvertime && !isBreak && !settings.pomodorosEnabled ? 'text-red-500' : 'text-white'}`}>
                            {formatTimerTime(isBreak ? breakRemaining : (settings.pomodorosEnabled ? pomodoroRemaining : remainingTime))}
                        </div>
                        <div className="h-1.5 w-64 mx-auto bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-1000",
                                    isBreak
                                        ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                        : settings.theme === 'red'
                                            ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                            : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                )}
                                style={{
                                    width: `${Math.min(100, isBreak
                                        ? (breakRemaining / (settings.defaultBreakLength * 60)) * 100
                                        : (settings.pomodorosEnabled ? (pomodoroRemaining / pomodoroTotal) * 100 : progress))}%`
                                }}
                            />
                        </div>
                    </div>

                    <div className="w-full mb-12">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">Active Frontier</span>
                            </div>
                            <span className="text-[9px] font-mono text-white/20 uppercase tabular-nums">ID_{activeTaskId?.slice(-8) || 'none'}</span>
                        </div>

                        <div
                            ref={setActiveRef}
                            className={cn(
                                "min-h-[100px] rounded-2xl border transition-all duration-500 flex flex-col items-center justify-center p-4 relative group",
                                isOverActive
                                    ? "bg-blue-500/10 border-blue-500/40 border-dashed ring-4 ring-blue-500/10"
                                    : activeTask
                                        ? "bg-[#12141c] border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)]"
                                        : "bg-white/[0.02] border-white/5 border-dashed"
                            )}
                        >
                            {activeTask ? (
                                <div className="w-full">
                                    <TaskCard
                                        task={activeTask}
                                        column="today"
                                        draggable={false}
                                        onComplete={() => handleCompleteTask(activeTask.id)}
                                    />
                                </div>
                            ) : (
                                <div className="text-white/20 flex flex-col items-center gap-2 py-8">
                                    <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Drag a mission here<br />to initiate sequence</span>
                                </div>
                            )}

                            {isOverActive && (
                                <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm rounded-2xl flex items-center justify-center animate-in fade-in zoom-in duration-200 z-50">
                                    <Play className="w-12 h-12 text-white fill-white animate-pulse" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-3 gap-2 mb-10">
                        <button
                            onClick={() => isPaused ? resumeSession() : pauseSession()}
                            className={cn(
                                "h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all group",
                                isPaused
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                    : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10"
                            )}
                        >
                            {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isPaused ? 'Resuming' : 'Holding'}</span>
                        </button>

                        <HoldButton
                            onTrigger={() => activeTask && handleCompleteTask(activeTask.id)}
                            duration={1500}
                            className="h-24 rounded-2xl bg-[#14201a] border border-green-500/20 text-green-500 flex flex-col items-center justify-center gap-2 hover:bg-[#1a2b23] hover:border-green-500/40 transition-all shadow-[0_0_20px_rgba(34,197,94,0.05)]"
                            fillClassName="bg-green-500/10"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fulfill</span>
                        </HoldButton>

                        <button
                            onClick={() => endSession()}
                            className="h-24 rounded-2xl bg-[#1c1414] border border-red-500/20 text-red-500/60 flex flex-col items-center justify-center gap-2 hover:bg-[#251a1a] hover:border-red-500/40 transition-all"
                        >
                            <ArrowRight className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bypass</span>
                        </button>
                    </div>

                    <div className="w-full">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <ListTodo className="w-3 h-3 text-white/20" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">Mission Buffer</span>
                            </div>
                            <span className="text-[9px] font-mono text-white/20 uppercase tabular-nums">{tasks.filter(t => t.id !== activeTaskId).length} QUEUED</span>
                        </div>

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
                                className="w-full h-14 rounded-xl border border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all flex items-center justify-center gap-2 group mt-4"
                            >
                                <Plus className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-white/60 transition-colors">Enlist New Mission</span>
                            </button>
                        </div>
                    </div>

                    {activeTask && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#12141c]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-500 z-50">
                            <button
                                onClick={() => isBreak ? stopBreak() : startBreak()}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all border group",
                                    isBreak
                                        ? "bg-amber-500/20 border-amber-500/40 text-amber-500"
                                        : "bg-white/5 border-white/5 hover:bg-white/10"
                                )}
                            >
                                <Zap className={cn("w-4 h-4", isBreak ? "fill-current" : "text-amber-500 fill-amber-500")} />
                                <span className="text-xs font-bold">{isBreak ? 'End Break' : 'Break'}</span>
                            </button>
                            <div className="w-px h-6 bg-white/10" />
                            <div className="flex items-center gap-1">
                                <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><FileText className="w-4 h-4" /></button>
                                <button
                                    onClick={() => isPaused ? resumeSession() : pauseSession()}
                                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => endSession()}
                                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                ><ArrowRight className="w-4 h-4" /></button>
                                <button
                                    onClick={() => handleCompleteTask(activeTask.id)}
                                    className="p-2 text-green-500/60 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                                ><CheckCircle2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}
                </main>

                {showCreateModal && (
                    <CreateTaskModal
                        isOpen={true}
                        onClose={() => setShowCreateModal(false)}
                        listId={selectedListId && selectedListId !== 'all' ? selectedListId : (lists[0]?.id || '')}
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
                    <div className="fixed inset-0 bg-[#0a0c10]/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                        <div className="w-32 h-32 rounded-full border-4 border-amber-500/20 flex items-center justify-center mb-8 relative">
                            <Zap className="w-12 h-12 text-amber-500 animate-pulse" />
                            <div className="absolute inset-0 rounded-full border-t-4 border-amber-500 animate-[spin_3s_linear_infinite]" />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Recovery in Progress</h2>
                        <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em] mb-12">Detaching from active missions</p>
                        <div className="font-mono text-6xl text-white mb-12 tabular-nums">
                            {formatTimerTime(breakRemaining)}
                        </div>
                        <button
                            onClick={() => stopBreak()}
                            className="px-12 py-4 rounded-2xl bg-amber-500 text-black font-black uppercase tracking-[0.2em] hover:bg-amber-400 transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                        >Resume Mission</button>
                    </div>
                )}

                {shouldFlash && (
                    <div className="fixed inset-0 bg-blue-500/20 z-[200] pointer-events-none animate-in fade-in fill-mode-forwards duration-150" />
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
