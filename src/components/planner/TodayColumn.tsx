
import { Task } from '@/types/database'
import { TaskCard } from './TaskCard'
import { Rocket, Plus, Clock } from 'lucide-react'
import { TaskColumn } from '@/types/list'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'

interface TodayColumnProps {
    tasks: Task[]
    columnId: TaskColumn
    onTaskComplete: (taskId: string) => void
    onStartNow: (task: Task) => void
    onAddTask?: () => void
}

export function TodayColumn({ tasks, columnId, onTaskComplete, onStartNow, onAddTask }: TodayColumnProps) {

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
            className="flex flex-col h-full bg-[#232936] rounded-xl border border-gray-700/50 shadow-lg overflow-hidden flex-shrink-0"
        >
            {/* Header (Clean Blitzit Style) */}
            <div className="p-4 bg-[#2a3441] border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        Today
                    </h2>

                    <div className="flex items-center gap-2">
                        {/* Task Count Badge */}
                        <div className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400 font-mono">
                            {tasks.length}
                        </div>

                        {onAddTask && (
                            <button
                                onClick={onAddTask}
                                className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                                title="Add task"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Simple Stats Row */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Est: {formatTime(totalMinutes)}</span>
                    </div>
                </div>
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
                        className="group w-full py-2 flex items-center gap-3 text-gray-500 hover:text-gray-300 transition-colors px-2 rounded-lg hover:bg-white/5"
                    >
                        <Plus className="w-4 h-4 text-gray-600 group-hover:text-blue-400" />
                        <span className="text-xs font-medium uppercase tracking-wider">Add Task</span>
                    </button>
                )}
            </div>

            {/* Blitzit Now CTA at the bottom */}
            {tasks.length > 0 && (
                <div className="p-4 bg-[#2a3441] border-t border-gray-700 flex-shrink-0">
                    <button
                        onClick={() => tasks[0] && onStartNow(tasks[0])}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Rocket className="w-4 h-4" />
                        <span>Blitzit now</span>
                    </button>
                </div>
            )}
        </div>
    )
}
