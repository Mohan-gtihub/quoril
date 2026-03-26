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

    const { isOvertime, progress, breakRemaining, pomodoroRemaining, pomodoroTotal, displayTime } = useTimerDisplay()


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
                settings.theme === 'blue' ? "bg-[#050b1a]" : settings.theme === 'red' ? "bg-[#1a0505]" : "bg-transparent",
                "text-white"
            )}>
                <header className={cn(
                    "h-14 flex items-center justify-between px-6 border-b border-white/5",
                    settings.theme === 'blue' ? "bg-[#0a1630]" : settings.theme === 'red' ? "bg-[#300a0a]" : "glass-thick"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            settings.theme === 'blue' ? "bg-blue-400 shadow-[0_0_8px_#3b82f6]" : settings.theme === 'red' ? "bg-red-400 shadow-[0_0_8px_#ef4444]" : settings.theme === 'nebula' ? "bg-violet-400 shadow-[0_0_8px_#8b5cf6]" : "bg-green-500"
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

                    {/* POMODORO BADGE: Half-on-air, Centered Top */}
                    {!isBreak && settings.pomodorosEnabled && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center pointer-events-none">
                            <div className="bg-[#0a0a0a] border border-red-500/30 text-red-500 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg tracking-widest uppercase">
                                POMO {formatTimerTime(pomodoroRemaining)}
                            </div>
                        </div>
                    )}

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
                            {formatTimerTime(displayTime)}
                        </div>
                        <div className="h-1.5 w-64 mx-auto bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-1000",
                                    isBreak
                                        ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                        : settings.theme === 'red'
                                            ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                            : settings.theme === 'nebula'
                                                ? "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
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
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isPaused ? 'Resume' : 'Hold'}</span>
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

                    <div className="w-full h-[400px] flex flex-col pt-4">
                        <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setRightPanelTab('queue')}
                                    className={cn(
                                        "flex items-center gap-2 pb-2 border-b-2 transition-all",
                                        rightPanelTab === 'queue' ? "border-blue-500 text-white" : "border-transparent text-white/20 hover:text-white/40"
                                    )}
                                >
                                    <ListTodo className="w-3 h-3" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Mission Buffer</span>
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('history')}
                                    className={cn(
                                        "flex items-center gap-2 pb-2 border-b-2 transition-all",
                                        rightPanelTab === 'history' ? "border-amber-500 text-white" : "border-transparent text-white/20 hover:text-white/40"
                                    )}
                                >
                                    <FileText className="w-3 h-3" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Intelligence</span>
                                </button>
                            </div>
                            <span className="text-[9px] font-mono text-white/10 uppercase tabular-nums tracking-widest">Sector_01_Sync</span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8">
                            {rightPanelTab === 'queue' ? (
                                <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
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
                            ) : (
                                <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                    {/* Mini Session Log for Focus Mode */}
                                    {allStoreTasks.filter(t => t.status === 'done' && t.completed_at?.startsWith(new Date().toISOString().split('T')[0])).length === 0 && (
                                        <div className="py-12 flex flex-col items-center justify-center opacity-20 text-center">
                                            <Zap className="w-8 h-8 mb-2" />
                                            <p className="text-[10px] uppercase font-bold tracking-widest">No achievements<br />recorded yet</p>
                                        </div>
                                    )}
                                    {allStoreTasks
                                        .filter(t => t.status === 'done' && t.completed_at?.startsWith(new Date().toISOString().split('T')[0]))
                                        .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
                                        .map(t => (
                                            <div key={t.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1 h-6 rounded-full bg-green-500/40" />
                                                    <div>
                                                        <p className="text-[11px] font-bold text-white/60 truncate w-40">{t.title}</p>
                                                        <p className="text-[9px] font-mono text-white/20 uppercase">{t.completed_at ? t.completed_at.split('T')[1].slice(0, 5) : 'DONE'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-mono text-green-500/60 font-bold">{Math.round((t.actual_seconds || 0) / 60)}m</p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>

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
