
import { Task } from '@/types/database'
import { TaskCard } from './TaskCard'
import { Plus } from 'lucide-react'
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
            className="flex flex-col h-full rounded-[var(--radius-tile)] border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
        >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                        <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                            {title}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Task Count Badge */}
                        <div className="text-[11px] font-semibold text-[var(--text-muted)] tabular-nums">
                            {tasks.length}
                        </div>

                        {onAddTask && (
                            <button
                                onClick={onAddTask}
                                className="w-7 h-7 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                title="Add task"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Simple Stats Row */}
                {!hideEstDoneTimes && (
                    <div className="text-xs text-[var(--text-tertiary)] mt-3">
                        Est <span className="tabular-nums font-medium text-[var(--text-secondary)]">{formatTime(totalMinutes)}</span>
                    </div>
                )}
            </div>

            {/* Unified Kanban List */}
            <div className="flex-1 px-3 pb-3 overflow-y-auto custom-scrollbar flex flex-col">
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
                        <div className="flex-1 flex flex-col items-center justify-center py-12 min-h-[200px] text-[var(--text-muted)]">
                            <p className="text-sm font-semibold text-[var(--text-tertiary)]">Nothing scheduled</p>
                            <p className="text-xs mt-1">Drag tasks here</p>
                        </div>
                    )}
                </SortableContext>

                {/* Bottom Add Task Shortcut (Minimal/Transparent) */}
                {onAddTask && (
                    <button
                        onClick={onAddTask}
                        className="group w-full py-2.5 flex items-center gap-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-3 rounded-xl hover:bg-[var(--bg-hover)]"
                    >
                        <Plus className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]" />
                        <span className="text-xs font-medium">Add task</span>
                    </button>
                )}
            </div>

            {/* Quoril Now CTA at the bottom */}
            {tasks.length > 0 && (
                <div className="p-4 border-t border-[var(--border-default)] flex-shrink-0">
                    <button
                        onClick={() => tasks[0] && onStartNow(tasks[0])}
                        className="w-full py-3 bg-[var(--accent-primary)] hover:brightness-105 active:scale-95 text-[var(--accent-contrast)] font-semibold rounded-full flex items-center justify-center gap-2 transition-all"
                    >
                        <span>Quoril now</span>
                    </button>
                </div>
            )}
        </div>
    )
}
