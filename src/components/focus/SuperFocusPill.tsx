import { Play, Pause, Maximize2, Coffee, SkipForward, CheckCircle2, ListTodo, Check, GripVertical } from 'lucide-react'
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
    const { remainingTime, breakRemaining, pomodoroRemaining } = useTimerDisplay()
    const settings = useSettingsStore()
    const [isHovered, setIsHovered] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)

    const activeTask = tasks.find(t => t.id === taskId)
    const currentSubtasks = taskId ? subtasks[taskId] || [] : []

    useEffect(() => {
        if (taskId) {
            fetchSubtasks(taskId)
        }
    }, [taskId, fetchSubtasks])

    useEffect(() => {
        if (window.electron) {
            // Aggressive resize attempts to overcome DevTools docking delays
            const performResize = () => {
                window.electron.closeDevTools()
                window.electron.setResizable(true)
                // Expand height if showing subtasks
                const height = isExpanded ? 48 + (currentSubtasks.length * 32) : 48
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

    const time = isBreak ? breakRemaining : (settings.pomodorosEnabled ? pomodoroRemaining : remainingTime)

    const handleDone = async () => {
        if (taskId) await moveTaskToColumn(taskId, 'done')
        await endSession()
    }

    return (
        <div
            className={cn(
                "w-full h-full flex flex-col transition-all duration-300 pointer-events-auto",
                "bg-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-full overflow-hidden group hover:border-white/20",
                isHovered && "scale-[1.01]",
                "cursor-grab active:cursor-grabbing"
            )}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main Pill Row */}
            <div className="h-[48px] flex items-center gap-3 px-4">
                {/* 1. RELIABLE DRAG HANDLE (Visual) */}
                {/* 1. RELIABLE DRAG HANDLE (Visual) */}
                <div
                    className="w-10 h-full flex items-center justify-center text-white/10 hover:text-white/40 transition-colors cursor-grab active:cursor-grabbing group/handle"
                    style={{ WebkitAppRegion: 'drag' } as any}
                    title="Drag to move"
                >
                    <GripVertical size={16} className="group-hover/handle:text-white/60 transition-colors" />
                </div>

                {!isHovered ? (
                    /* DEFAULT STATE: [Name] [Time] */
                    <div className="flex items-center justify-between flex-1 animate-in fade-in duration-300 pr-5 pl-1">
                        <span className="text-sm font-bold text-white tracking-wide truncate flex-1 drop-shadow-md">
                            {isBreak ? 'Taking a Break' : (activeTask?.title || 'No Active Mission')}
                        </span>
                        <span className={cn(
                            "font-mono font-bold text-sm tabular-nums tracking-tight ml-4 shrink-0",
                            time < 0 ? "text-red-400" : (isBreak ? "text-amber-400" : "text-emerald-400")
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
                                    isBreak ? "text-amber-400 bg-amber-400/10" : "text-white/60 hover:text-white hover:bg-white/10"
                                )}
                                title="Break"
                            >
                                <Coffee size={16} />
                            </button>

                            {currentSubtasks.length > 0 && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        isExpanded ? "text-blue-400 bg-blue-400/10" : "text-white/60 hover:text-white hover:bg-white/10"
                                    )}
                                    title="Subtasks"
                                >
                                    <ListTodo size={16} />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => isPaused ? resumeSession() : pauseSession()}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm",
                                isPaused ? "bg-blue-500 text-white shadow-blue-500/20" : "bg-white/10 text-white hover:bg-white/20"
                            )}
                        >
                            {isPaused ? <Play size={10} className="fill-current" /> : <Pause size={10} className="fill-current" />}
                            <span>{isPaused ? 'Resume' : 'Pause'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                            <button onClick={() => skipToNext()} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Skip">
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
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                title="Return to Focus Mode"
                            >
                                <Maximize2 size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Subtasks Panel (Expandable) */}
            {isExpanded && currentSubtasks.length > 0 && (
                <div
                    className="border-t border-white/5 bg-black/20 p-2 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-300"
                    style={{ WebkitAppRegion: 'no-drag' } as any}
                >
                    {currentSubtasks.map(subtask => (
                        <div
                            key={subtask.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer group/sub"
                            onClick={() => toggleSubtask(subtask.id)}
                        >
                            <div className={cn(
                                "w-3.5 h-3.5 rounded border border-white/20 flex items-center justify-center transition-colors",
                                subtask.completed ? "bg-emerald-500 border-emerald-500" : "group-hover/sub:border-white/40"
                            )}>
                                {subtask.completed && <Check size={10} className="text-white" />}
                            </div>
                            <span className={cn(
                                "text-[10px] truncate transition-all",
                                subtask.completed ? "text-white/30 line-through" : "text-white/70"
                            )}>
                                {subtask.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
