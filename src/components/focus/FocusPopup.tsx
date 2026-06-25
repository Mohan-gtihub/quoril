import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { Play, Pause, CheckCircle2, SkipForward } from 'lucide-react'
import { cn } from '@/utils/helpers'

export function FocusPopup() {
    const {
        isActive,
        isPaused,
        taskId,
        pauseSession,
        resumeSession,
        endSession,
        skipToNext,
    } = useFocusStore()

    const { elapsed, remainingTime, isOvertime, progress, duration } = useTimerDisplay()
    const isStopwatch = duration === 0

    const { tasks: allTasks } = useTaskStore()
    const { selectedListId } = useListStore()

    const activeTask = allTasks.find(t => t.id === taskId)
    const nextTasks = allTasks.filter(t =>
        t.id !== taskId &&
        (selectedListId === 'all' || t.list_id === selectedListId) &&
        useTaskStore.getState().getColumnStatuses('today').includes(t.status)
    )

    const formatTimer = (seconds: number) => {
        const absSeconds = Math.round(Math.abs(seconds))
        const hrs = Math.floor(absSeconds / 3600)
        const mins = Math.floor((absSeconds % 3600) / 60)
        const secs = absSeconds % 60

        const timeStr = hrs > 0
            ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
            : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

        return `${!isStopwatch && seconds < 0 ? '+' : ''}${timeStr}`
    }

    const handleSkip = async () => {
        const nextTaskId = nextTasks.length > 0 ? nextTasks[0].id : undefined
        await skipToNext(nextTaskId)
        if (!nextTaskId) window.close()
    }

    const handleDone = async () => {
        await endSession()
        window.close()
    }

    if (!isActive || !activeTask) {
        return (
            <div className="h-screen w-screen flex items-center justify-center p-6 text-center bg-[var(--bg-primary)]">
                <div className="space-y-4">
                    <p className="text-sm text-[var(--text-tertiary)]">No active session</p>
                    <button
                        onClick={() => window.close()}
                        className="text-sm font-semibold px-5 py-2.5 rounded-[var(--radius-pill)] transition-all hover:brightness-105 bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                    >
                        Close window
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen flex flex-col p-6 overflow-hidden bg-[var(--bg-primary)]">
            <div className="flex-1 flex flex-col justify-center space-y-6 max-w-sm mx-auto w-full">
                {/* Timer Display */}
                <div className="text-center p-6 rounded-[var(--radius-tile)] border bg-[var(--bg-card)] border-[var(--border-default)]">
                    <div className={cn("text-6xl font-semibold tabular-nums tracking-tight mb-2", isOvertime ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]")}>
                        {isStopwatch ? formatTimer(elapsed) : formatTimer(remainingTime)}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest mb-4 text-[var(--text-muted)]">
                        {isStopwatch ? 'Stopwatch' : isOvertime ? 'Overtime' : 'Remaining'}
                    </div>

                    {/* Progress Bar */}
                    {!isStopwatch && (
                        <div className="h-1 rounded-full overflow-hidden bg-[var(--bg-hover)]">
                            <div
                                className={cn("h-full transition-all duration-1000", isOvertime ? "bg-[var(--error)]" : "bg-[var(--accent-primary)]")}
                                style={{ width: `${isOvertime ? 100 : progress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Task Info */}
                <div className="text-center space-y-1.5">
                    <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">{activeTask.title}</h2>
                    {duration > 0 && (
                        <p className="text-xs tabular-nums text-[var(--text-muted)]">
                            {Math.floor(duration / 60)} min session
                        </p>
                    )}
                </div>

                {/* Controls */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => isPaused ? resumeSession() : pauseSession()}
                        className="flex flex-col items-center justify-center gap-2 py-4 rounded-[var(--radius-tile)] transition-all bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-hover)]"
                    >
                        {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                        <span className="text-[11px] font-semibold">{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>

                    <button
                        onClick={handleDone}
                        className="flex flex-col items-center justify-center gap-2 py-4 rounded-[var(--radius-tile)] transition-all hover:brightness-105 bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-[11px] font-semibold">Done</span>
                    </button>

                    <button
                        onClick={handleSkip}
                        className="flex flex-col items-center justify-center gap-2 py-4 rounded-[var(--radius-tile)] transition-all bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-hover)]"
                    >
                        <SkipForward className="w-5 h-5" />
                        <span className="text-[11px] font-semibold">Skip</span>
                    </button>
                </div>

                {/* Next Up */}
                {nextTasks.length > 0 && (
                    <div className="space-y-0.5 -mx-2">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest px-2 mb-1 text-[var(--text-muted)]">Next up</h3>
                        {nextTasks.slice(0, 3).map(task => (
                            <div key={task.id} className="text-sm px-2 py-1.5 rounded-[var(--radius-card)] truncate hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]">
                                {task.title}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
