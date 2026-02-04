import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'
import { Play, Pause, CheckCircle2, SkipForward } from 'lucide-react'

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

        if (nextTaskId) {
            if (window.confirm('Skip to next task?')) {
                await skipToNext(nextTaskId)
            }
        } else {
            if (window.confirm('Skip this session? (No more tasks in queue)')) {
                await skipToNext()
                window.close()
            }
        }
    }

    const handleDone = async () => {
        await endSession()
        window.close()
    }

    if (!isActive || !activeTask) {
        return (
            <div className="h-screen w-screen flex items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="space-y-4">
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No active session</p>
                    <button
                        onClick={() => window.close()}
                        className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded"
                        style={{ backgroundColor: 'var(--accent-blue-500)', color: 'white' }}
                    >
                        Close Window
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen flex flex-col p-6 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex-1 flex flex-col justify-center space-y-6 max-w-sm mx-auto w-full">
                {/* Timer Display */}
                <div className="text-center p-6 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                    <div className={`text-6xl font-mono font-bold tracking-tighter mb-2`} style={{ color: isOvertime ? 'var(--accent-red-500)' : 'var(--text-primary)' }}>
                        {isStopwatch ? formatTimer(elapsed) : formatTimer(remainingTime)}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                        {isStopwatch ? 'Stopwatch' : isOvertime ? 'Overtime' : 'Remaining'}
                    </div>

                    {/* Progress Bar */}
                    {!isStopwatch && (
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--accent-gray-700)' }}>
                            <div
                                className="h-full transition-all duration-1000"
                                style={{ width: `${isOvertime ? 100 : progress}%`, backgroundColor: isOvertime ? 'var(--accent-red-500)' : 'var(--accent-blue-500)' }}
                            />
                        </div>
                    )}
                </div>

                {/* Task Info */}
                <div className="text-center space-y-2">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{activeTask.title}</h2>
                    {duration > 0 && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {Math.floor(duration / 60)} min session
                        </p>
                    )}
                </div>

                {/* Controls */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={isPaused ? resumeSession : pauseSession}
                        className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg transition-all"
                        style={{
                            backgroundColor: isPaused ? 'var(--accent-yellow-100)' : 'var(--accent-blue-100)',
                            color: isPaused ? 'var(--accent-yellow-400)' : 'var(--accent-blue-400)'
                        }}
                    >
                        {isPaused ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
                        <span className="text-xs font-bold uppercase">{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>

                    <button
                        onClick={handleDone}
                        className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg transition-all"
                        style={{ backgroundColor: 'var(--accent-green-100)', color: 'var(--accent-green-400)' }}
                    >
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase">Done</span>
                    </button>

                    <button
                        onClick={handleSkip}
                        className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg transition-all"
                        style={{ backgroundColor: 'var(--accent-gray-800)', color: 'var(--text-tertiary)', borderColor: 'var(--accent-gray-700)' }}
                    >
                        <SkipForward className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase">Skip</span>
                    </button>
                </div>

                {/* Next Up */}
                {nextTasks.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Next Up</h3>
                        {nextTasks.slice(0, 3).map(task => (
                            <div key={task.id} className="text-sm p-2 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                                {task.title}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
