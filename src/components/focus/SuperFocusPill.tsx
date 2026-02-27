import { Play, Pause, Maximize2, Coffee, SkipForward, CheckCircle2, ListTodo, Check, GripVertical, Plus } from 'lucide-react'
import { useFocusStore } from '@/store/focusStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { useTaskStore } from '@/store/taskStore'
import { cn } from '@/utils/helpers'
import { useEffect, useState } from 'react'

export function SuperFocusPill() {
    const {
        isPaused,
        isBreak,
        pauseSession,
        resumeSession,
        endSession,
        taskId,
        startBreak,
        stopBreak,
        skipToNext
    } = useFocusStore()
    const { updateSettings } = useSettingsStore()
    const { tasks, subtasks, fetchSubtasks, toggleSubtask, moveTaskToColumn } = useTaskStore()
    const { isOvertime, displayTime, pomodoroRemaining } = useTimerDisplay()
    const settings = useSettingsStore()

    const [isHovered, setIsHovered] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

    const activeTask = tasks.find(t => t.id === taskId)
    const currentSubtasks = taskId ? subtasks[taskId] || [] : []

    useEffect(() => {
        if (taskId) {
            fetchSubtasks(taskId)
        }
    }, [taskId, fetchSubtasks])

    useEffect(() => {
        if (window.electron) {
            const performResize = () => {
                window.electron.closeDevTools()
                window.electron.setResizable(true)
                // Precise height: Badge(12) + Pill(48) + Gap(8) + Container
                // Precise height: Badge(12) + Pill(48) + Gap(8) + Container
                const itemsCount = currentSubtasks.length
                // If 0 items, allocate 60px for the "Target is locked" message
                const contentHeight = itemsCount === 0 ? 60 : (itemsCount * 32) + 40 // +40 for add button space
                const containerHeight = (12 + 20 + contentHeight + 48 + 12)
                const baseHeight = 48 + 12 // 48 pill + 12 badge space
                const height = isExpanded ? (baseHeight + 8 + containerHeight) : baseHeight

                window.electron.resizeWindow(340, height, 40, 40)
                window.electron.setAlwaysOnTop(true)
                window.electron.setResizable(false)
            }

            performResize()
            const t1 = setTimeout(performResize, 500)
            const t2 = setTimeout(performResize, 1500)

            return () => {
                clearTimeout(t1)
                clearTimeout(t2)
                window.electron.setResizable(true)
                window.electron.restoreWindow()
                window.electron.setAlwaysOnTop(false)
            }
        }
    }, [isExpanded, currentSubtasks.length])

    const formatShortTime = (seconds: number) => {
        const abs = Math.round(Math.abs(seconds))
        const mins = Math.floor(abs / 60)
        const secs = abs % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const time = displayTime

    const handleDone = async () => {
        if (taskId) await moveTaskToColumn(taskId, 'done')
        await endSession()
    }

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSubtaskTitle.trim() || !taskId) return
        await useTaskStore.getState().createSubtask(taskId, newSubtaskTitle.trim())
        setNewSubtaskTitle('')
    }

    return (
        <div className="w-full h-full flex flex-col gap-2 pointer-events-none pt-4 bg-transparent border-none outline-none">
            {/* Main Pill Row */}
            <div
                className={cn(
                    "w-[340px] h-[48px] flex items-center gap-3 px-4 transition-all duration-300 pointer-events-auto shrink-0 relative",
                    "bg-[#0f1117] border border-white/10 rounded-full group hover:border-[#3b82f6]/50"
                )}
                style={{ WebkitAppRegion: 'no-drag' } as any}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* POMODORO BADGE: Half-on-air, Centered Top */}
                {!isBreak && settings.pomodorosEnabled && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none">
                        <div className="bg-[var(--bg-primary)] border border-red-500/30 text-red-500 text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase">
                            POMO {formatShortTime(pomodoroRemaining)}
                        </div>
                    </div>
                )}

                {/* 1. RELIABLE DRAG HANDLE (Visual) */}
                <div
                    className="w-10 h-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-grab active:cursor-grabbing group/handle"
                    style={{ WebkitAppRegion: 'drag' } as any}
                    title="Drag to move"
                >
                    <GripVertical size={16} className="group-hover/handle:text-[var(--text-primary)] transition-colors" />
                </div>

                {!isHovered ? (
                    /* DEFAULT STATE: [Name] [Time] */
                    <div className="flex items-center justify-between flex-1 animate-in fade-in duration-300 pr-5 pl-1 overflow-hidden">
                        <div className="flex flex-col min-w-0 pr-2 justify-center h-full">
                            <span className="text-sm font-bold text-[var(--text-primary)] tracking-wide truncate drop-shadow-md leading-tight">
                                {isBreak ? 'Taking a Break' : (activeTask?.title || 'No Active Mission')}
                            </span>
                        </div>
                        <span className={cn(
                            "font-mono font-bold text-sm tabular-nums tracking-tight shrink-0",
                            isOvertime ? "text-red-400" : (isBreak ? "text-amber-400" : "text-emerald-400")
                        )}>
                            {formatShortTime(time)}
                        </span>
                    </div>
                ) : (
                    /* HOVER STATE: Enhanced Pill Controls */
                    <div className="flex items-center justify-between flex-1 animate-in fade-in slide-in-from-bottom-1 duration-200" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => isBreak ? stopBreak() : startBreak()}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    isBreak ? "text-amber-400 bg-amber-400/10" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                                )}
                                title="Break"
                            >
                                <Coffee size={16} />
                            </button>

                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    isExpanded ? "text-blue-400 bg-blue-400/10" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                                )}
                                title="Subtasks"
                            >
                                <ListTodo size={16} />
                            </button>
                        </div>

                        <button
                            onClick={() => isPaused ? resumeSession() : pauseSession()}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm",
                                isPaused ? "bg-blue-500 text-white shadow-blue-500/20" : "bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                            )}
                        >
                            {isPaused ? <Play size={10} className="fill-current" /> : <Pause size={10} className="fill-current" />}
                            <span>{isPaused ? 'Resume' : 'Pause'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                            <button onClick={() => skipToNext()} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Skip">
                                <SkipForward size={16} />
                            </button>
                            <button onClick={handleDone} className="p-2 rounded-lg hover:bg-emerald-500/20 text-emerald-500 transition-colors" title="Done">
                                <CheckCircle2 size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    useFocusStore.getState().setShowFocusPanel(true);
                                    updateSettings({ superFocusMode: false });
                                }}
                                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                title="Return to Focus Mode"
                            >
                                <Maximize2 size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Subtasks Panel (Floating Accordion) */}
            {isExpanded && (
                <div
                    className="mx-2 w-[324px] bg-[#0f1117] border border-white/10 rounded-2xl p-3 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto overflow-hidden shrink-0"
                    style={{ WebkitAppRegion: 'no-drag' } as any}
                >
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Mission Objectives</span>
                        <span className="text-[9px] text-[var(--accent-primary)]/80 font-mono font-bold">
                            {currentSubtasks.filter(s => s.completed).length}/{currentSubtasks.length}
                        </span>
                    </div>

                    <div className="space-y-1 mb-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                        {currentSubtasks.map(subtask => (
                            <div
                                key={subtask.id}
                                className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-[var(--bg-hover)] transition-all cursor-pointer group/sub"
                                onClick={() => toggleSubtask(subtask.id)}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded border border-[var(--border-default)] flex items-center justify-center transition-all shrink-0",
                                    subtask.completed ? "bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "group-hover/sub:border-[var(--border-hover)]"
                                )}>
                                    {subtask.completed && <Check size={11} className="text-white" />}
                                </div>
                                <span className={cn(
                                    "text-xs truncate transition-all flex-1",
                                    subtask.completed ? "text-[var(--text-muted)] line-through" : "text-[var(--text-secondary)] group-hover/sub:text-[var(--text-primary)]"
                                )}>
                                    {subtask.title}
                                </span>
                            </div>
                        ))}
                        {currentSubtasks.length === 0 && (
                            <div className="py-4 text-center border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-tertiary)]">
                                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest">Target is locked. No sub-missions.</span>
                            </div>
                        )}
                    </div>

                    {/* Add Subtask Input */}
                    <form onSubmit={handleAddSubtask} className="relative mt-auto">
                        <input
                            type="text"
                            placeholder="Add mission objective..."
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            className="w-full h-10 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl px-4 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/40 focus:bg-[var(--bg-secondary)] focus:ring-1 focus:ring-[var(--accent-primary)]/20 transition-all placeholder:text-[var(--text-muted)]"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                            <Plus size={14} />
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
