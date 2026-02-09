import { useState, useEffect } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { X, CheckCircle2, Circle, Trash2, Plus, Repeat, Activity } from 'lucide-react'

export function TaskDetailsPanel() {
    const {
        tasks,
        selectedTaskId,
        setSelectedTask,
        updateTask,
        deleteTask,
        subtasks,
        fetchSubtasks,
        createSubtask,
        toggleSubtask,
        deleteSubtask
    } = useTaskStore()

    const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
    const [taskUsage, setTaskUsage] = useState<any[]>([])
    const task = tasks.find(t => t.id === selectedTaskId)

    useEffect(() => {
        if (selectedTaskId) {
            fetchSubtasks(selectedTaskId)
            window.electronAPI.db.getAppUsageByTask(selectedTaskId).then(setTaskUsage)
        }
    }, [selectedTaskId, fetchSubtasks])

    if (!task || !selectedTaskId) return null

    const handleClose = () => setSelectedTask(null)

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSubtaskTitle.trim()) return

        await createSubtask(task.id, newSubtaskTitle)
        setNewSubtaskTitle('')
    }

    const taskSubtasks = (selectedTaskId && subtasks[selectedTaskId]) || []

    const calculateProgress = () => {
        if (taskSubtasks.length === 0) return 0
        const completed = taskSubtasks.filter(s => s.completed).length
        return Math.round((completed / taskSubtasks.length) * 100)
    }

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-[var(--bg-card)] border-l border-[var(--border-default)] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col z-50">
            {/* Header */}
            <div className="p-6 border-b border-gray-700/50 flex items-start justify-between">
                <div className="flex-1">
                    <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTask(task.id, { title: e.target.value })}
                        className="bg-transparent text-xl font-bold text-[var(--text-primary)] w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/50 rounded px-1 -ml-1 border-transparent hover:border-[var(--border-default)] border"
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${task.status === 'done' ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-400'
                            }`}>
                            {task.status.replace('_', ' ')}
                        </span>
                        {task.estimated_minutes && (
                            <span className="text-[var(--text-tertiary)] text-xs font-mono">
                                {task.estimated_minutes}m est.
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Bodies... wait, I need to insert the toggle below the header. */}
            <div className="px-6 py-2 border-b border-gray-700/30 flex items-center justify-between bg-[var(--bg-hover)]/20">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => updateTask(task.id, { is_recurring: !task.is_recurring })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${task.is_recurring
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]'
                            : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:border-gray-600'
                            }`}
                    >
                        <Repeat className={`w-3.5 h-3.5 ${task.is_recurring ? 'animate-pulse' : ''}`} />
                        {task.is_recurring ? 'Daily Recurrence Active' : 'Enable Daily Recurrence'}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Description
                    </label>
                    <textarea
                        value={task.description || ''}
                        onChange={(e) => updateTask(task.id, { description: e.target.value })}
                        placeholder="Add notes..."
                        className="w-full bg-[var(--bg-hover)] text-[var(--text-secondary)] text-sm rounded-xl p-4 border border-[var(--border-default)] focus:ring-1 focus:ring-[var(--accent-primary)]/50 focus:outline-none min-h-[140px] resize-none placeholder:text-[var(--text-muted)]"
                    />
                </div>

                {/* Task intelligence - App usage per task */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity className="w-3 h-3 text-indigo-400" />
                        Task Intelligence
                    </label>

                    <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                        {taskUsage.length === 0 ? (
                            <div className="text-[10px] text-white/20 italic text-center py-4">
                                No specific app activity tied to this task yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {taskUsage.map((item) => (
                                    <div key={item.appName} className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-bold">
                                            <span className="text-white/60 truncate max-w-[150px]">{item.appName}</span>
                                            <span className="text-white/40">{Math.round(item.totalSeconds / 60)}m</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500/40"
                                                style={{ width: `${Math.min((item.totalSeconds / (task.actual_seconds || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-[9px] text-white/20 mt-4 leading-relaxed">
                            Apps used while this task was in 'Active' state. Data is local and private.
                        </p>
                    </div>
                </div>

                {/* Subtasks */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Subtasks
                        </label>
                        {taskSubtasks.length > 0 && (
                            <span className="text-xs text-[var(--accent-primary)] font-bold">
                                {calculateProgress()}% Complete
                            </span>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {taskSubtasks.length > 0 && (
                        <div className="h-1.5 w-full bg-[var(--bg-hover)] rounded-full mb-6 overflow-hidden border border-[var(--border-default)]">
                            <div
                                className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-500 shadow-[0_0_10px_var(--accent-glow)]"
                                style={{ width: `${calculateProgress()}%` }}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        {taskSubtasks.map(subtask => (
                            <div key={subtask.id} className="group flex items-center gap-3 bg-[var(--bg-hover)] p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--accent-primary)]/30 transition-all">
                                <button
                                    onClick={() => toggleSubtask(subtask.id)}
                                    className={`flex-shrink-0 transition-colors ${subtask.completed ? 'text-emerald-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                >
                                    {subtask.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </button>
                                <span className={`flex-1 text-sm transition-all ${subtask.completed ? 'text-[var(--text-muted)] line-through opacity-50' : 'text-[var(--text-primary)]'}`}>
                                    {subtask.title}
                                </span>
                                <button
                                    onClick={() => deleteSubtask(subtask.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Subtask Input */}
                    <form onSubmit={handleAddSubtask} className="mt-4 flex items-center gap-3 px-3 py-2 rounded-xl border border-dashed border-[var(--border-default)] group hover:border-[var(--accent-primary)]/50 transition-all">
                        <Plus className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]" />
                        <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Add mission objective..."
                            className="bg-transparent text-sm text-[var(--text-primary)] flex-1 focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                    </form>
                </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border-default)] bg-[var(--bg-hover)]/30">
                <button
                    onClick={() => {
                        if (window.confirm('Delete this task?')) {
                            deleteTask(task.id)
                            handleClose()
                        }
                    }}
                    className="w-full py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-3 h-3" />
                    Delete Task
                </button>
            </div>
        </div>
    )
}
