
import { Task } from '@/types/database'
import { TaskCard } from './TaskCard'
import { Rocket, Plus, Clock } from 'lucide-react'
import { TaskColumn } from '@/types/list'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'

import { useSettingsStore } from '@/store/settingsStore'

interface TodayColumnProps {
    title?: string
    tasks: Task[]
    columnId: TaskColumn
    onTaskComplete: (taskId: string) => void
    onStartNow: (task: Task) => void
    onAddTask?: () => void
}

export function TodayColumn({ title = "Today", tasks, columnId, onTaskComplete, onStartNow, onAddTask }: TodayColumnProps) {
    const { hideEstDoneTimes } = useSettingsStore()

    // Simple Stats
    const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0)

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    }

    const { setNodeRef } = useDroppable({ id: columnId })

    return (
        <div
            ref={setNodeRef}
            className="flex flex-col h-full rounded-xl border shadow-lg overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
            {/* Header (Clean Quoril Style) */}
            <div className="p-4 border-b flex-shrink-0" style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--border-default)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[var(--text-primary)] font-bold text-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]"></span>
                        {title}
                    </h2>

                    <div className="flex items-center gap-2">
                        {/* Task Count Badge */}
                        <div className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-muted)] font-mono">
                            {tasks.length}
                        </div>

                        {onAddTask && (
                            <button
                                onClick={onAddTask}
                                className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                title="Add task"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Simple Stats Row */}
                {!hideEstDoneTimes && (
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Est: {formatTime(totalMinutes)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Unified Kanban List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar flex flex-col">
                <SortableContext
                    id={columnId}
                    items={tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.length > 0 ? (
                        tasks.map((task) => (
                            <div key={task.id}>
                                <TaskCard
                                    task={task}
                                    column={columnId}
                                    onComplete={() => onTaskComplete(task.id)}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-12 min-h-[200px]">
                            <Rocket className="w-12 h-12 mb-2" />
                            <p className="text-xs font-bold uppercase text-center">Ready for Action<br /><span className="font-normal normal-case">Drag tasks here</span></p>
                        </div>
                    )}
                </SortableContext>

                {/* Bottom Add Task Shortcut (Minimal/Transparent) */}
                {onAddTask && (
                    <button
                        onClick={onAddTask}
                        className="group w-full py-2 flex items-center gap-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 rounded-lg hover:bg-[var(--bg-hover)]"
                    >
                        <Plus className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]" />
                        <span className="text-xs font-medium uppercase tracking-wider">Add Task</span>
                    </button>
                )}
            </div>

            {/* Quoril Now CTA at the bottom */}
            {tasks.length > 0 && (
                <div className="p-4 border-t flex-shrink-0" style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--border-default)' }}>
                    <button
                        onClick={() => tasks[0] && onStartNow(tasks[0])}
                        className="w-full py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-[var(--accent-primary)]/40 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Rocket className="w-4 h-4" />
                        <span>Quoril now</span>
                    </button>
                </div>
            )}
        </div>
    )
}
