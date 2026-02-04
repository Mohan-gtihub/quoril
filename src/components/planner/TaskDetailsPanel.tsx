import { useState, useEffect } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { X, CheckCircle2, Circle, Trash2, Plus } from 'lucide-react'

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
    const task = tasks.find(t => t.id === selectedTaskId)

    useEffect(() => {
        if (selectedTaskId) {
            fetchSubtasks(selectedTaskId)
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
        <div className="fixed inset-y-0 right-0 w-96 bg-[#232936] border-l border-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col z-50">
            {/* Header */}
            <div className="p-6 border-b border-gray-700/50 flex items-start justify-between">
                <div className="flex-1">
                    <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTask(task.id, { title: e.target.value })}
                        className="bg-transparent text-xl font-bold text-white w-full focus:outline-none focus:ring-1 focus:ring-blue-500/50 rounded px-1 -ml-1 border-transparent hover:border-gray-700 border"
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${task.status === 'done' ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-400'
                            }`}>
                            {task.status.replace('_', ' ')}
                        </span>
                        {task.estimated_minutes && (
                            <span className="text-gray-500 text-xs">
                                {task.estimated_minutes}m est.
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
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
                        className="w-full bg-[#1a1f2e] text-gray-300 text-sm rounded-lg p-3 border border-gray-700/50 focus:border-blue-500 focus:outline-none min-h-[100px] resize-none"
                    />
                </div>

                {/* Subtasks */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Subtasks
                        </label>
                        {taskSubtasks.length > 0 && (
                            <span className="text-xs text-blue-400 font-medium">
                                {calculateProgress()}% Done
                            </span>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {taskSubtasks.length > 0 && (
                        <div className="h-1 w-full bg-gray-800 rounded-full mb-4 overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${calculateProgress()}%` }}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        {taskSubtasks.map(subtask => (
                            <div key={subtask.id} className="group flex items-center gap-2 bg-[#1a1f2e] p-2 rounded-lg border border-transparent hover:border-gray-700/50 transition-colors">
                                <button
                                    onClick={() => toggleSubtask(subtask.id)}
                                    className={`flex-shrink-0 ${subtask.completed ? 'text-green-500' : 'text-gray-600 hover:text-gray-400'}`}
                                >
                                    {subtask.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </button>
                                <span className={`flex-1 text-sm ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                    {subtask.title}
                                </span>
                                <button
                                    onClick={() => deleteSubtask(subtask.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Subtask Input */}
                    <form onSubmit={handleAddSubtask} className="mt-3 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Add a subtask..."
                            className="bg-transparent text-sm text-white flex-1 focus:outline-none placeholder-gray-600"
                        />
                    </form>
                </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700/50 bg-[#1a1f2e]/50">
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
