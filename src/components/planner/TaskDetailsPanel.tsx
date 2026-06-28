import { useState, useEffect, useMemo } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { X, CheckCircle2, Circle, Trash2, Plus, Repeat } from 'lucide-react'
import { confirm } from '@/components/ui/ConfirmDialog'

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

    const lists = useListStore(s => s.lists)
    const membersByWorkspace = useWorkspaceStore(s => s.membersByWorkspace)
    const loadWorkspaceMembers = useWorkspaceStore(s => s.loadWorkspaceMembers)
    const currentEmail = useAuthStore(s => s.user?.email ?? null)

    const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
    const [taskUsage, setTaskUsage] = useState<any[]>([])
    const task = tasks.find(t => t.id === selectedTaskId)

    // A task is assignable only when it lives in a shared workspace list.
    const workspaceId = useMemo(() => {
        const list = lists.find(l => l.id === task?.list_id)
        return (list as any)?.workspace_id ?? null
    }, [lists, task?.list_id])

    useEffect(() => {
        if (selectedTaskId) {
            fetchSubtasks(selectedTaskId)
            window.electronAPI?.db?.getAppUsageByTask?.(selectedTaskId).then(setTaskUsage)
        }
    }, [selectedTaskId, fetchSubtasks])

    useEffect(() => {
        if (workspaceId) loadWorkspaceMembers(workspaceId)
    }, [workspaceId, loadWorkspaceMembers])

    // Candidates = everyone invited to the workspace, plus yourself. Deduped by email.
    const assignees = useMemo(() => {
        if (!workspaceId) return [] as string[]
        const members = (membersByWorkspace[workspaceId] || [])
            .filter(m => !m.deleted_at)
            .map(m => m.email.toLowerCase())
        const set = new Set(members)
        if (currentEmail) set.add(currentEmail.toLowerCase())
        return [...set].sort()
    }, [workspaceId, membersByWorkspace, currentEmail])

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
        <div className="glass-thick fixed inset-y-0 right-0 w-96 shadow-sm transform transition-transform duration-300 ease-in-out flex flex-col z-50">
            {/* Header */}
            <div className="px-6 py-6 border-b border-[var(--border-default)] flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTask(task.id, { title: e.target.value })}
                        className="bg-transparent text-xl font-semibold tracking-tight text-[var(--text-primary)] w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/50 rounded-[var(--radius-tile)] px-1.5 -ml-1.5 py-0.5 border border-transparent hover:bg-[var(--bg-hover)] transition-colors"
                    />
                    <div className="flex items-center gap-2 mt-2.5 px-0.5">
                        <span className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-[11px] uppercase font-semibold tracking-wide ${task.status === 'done' ? 'bg-[var(--accent-lime-100)] text-[var(--text-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                            }`}>
                            {task.status.replace('_', ' ')}
                        </span>
                        {task.estimated_minutes && (
                            <span className="text-[var(--text-muted)] text-xs tabular-nums">
                                {task.estimated_minutes}m est.
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-[var(--bg-hover)] rounded-[var(--radius-tile)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Recurrence toggle row */}
            <div className="px-6 py-2.5 border-b border-[var(--border-default)] flex items-center">
                <button
                    onClick={() => updateTask(task.id, { is_recurring: !task.is_recurring })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-tile)] text-xs font-medium transition-colors ${task.is_recurring
                        ? 'bg-[var(--accent-lime-100)] text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <Repeat className="w-3.5 h-3.5" />
                    {task.is_recurring ? 'Daily recurrence active' : 'Enable daily recurrence'}
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                {/* Assignee — only for tasks in a shared workspace */}
                {workspaceId && (
                    <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                            Assigned to
                        </label>
                        <select
                            value={task.assigned_to ?? ''}
                            onChange={(e) => updateTask(task.id, { assigned_to: e.target.value || null })}
                            className="w-full bg-[var(--bg-card)] text-[var(--text-secondary)] text-sm rounded-[var(--radius-card)] p-3 border border-[var(--border-default)] focus:ring-1 focus:ring-[var(--accent-primary)]/50 focus:outline-none"
                        >
                            <option value="">Unassigned</option>
                            {task.assigned_to && !assignees.includes(task.assigned_to.toLowerCase()) && (
                                <option value={task.assigned_to}>
                                    {task.assigned_to} (former member)
                                </option>
                            )}
                            {assignees.map(email => (
                                <option key={email} value={email}>
                                    {email}{currentEmail && email === currentEmail.toLowerCase() ? ' (you)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Description */}
                <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                        Description
                    </label>
                    <textarea
                        value={task.description || ''}
                        onChange={(e) => updateTask(task.id, { description: e.target.value })}
                        placeholder="Add notes..."
                        className="w-full bg-[var(--bg-card)] text-[var(--text-secondary)] text-sm rounded-[var(--radius-card)] p-4 border border-[var(--border-default)] focus:ring-1 focus:ring-[var(--accent-primary)]/50 focus:outline-none min-h-[140px] resize-none placeholder:text-[var(--text-muted)]"
                    />
                </div>

                {/* Task intelligence - App usage per task */}
                <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                        Task Intelligence
                    </label>

                    <div className="space-y-3">
                        {taskUsage.length === 0 ? (
                            <div className="text-[11px] text-[var(--text-muted)] text-center py-4">
                                No specific app activity tied to this task yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {taskUsage.map((item) => (
                                    <div key={item.appName} className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-medium">
                                            <span className="text-[var(--text-secondary)] truncate max-w-[150px]">{item.appName}</span>
                                            <span className="text-[var(--text-muted)] tabular-nums">{Math.round(item.totalSeconds / 60)}m</span>
                                        </div>
                                        <div className="w-full h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--accent-primary)]"
                                                style={{ width: `${Math.min((item.totalSeconds / (task.actual_seconds || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-relaxed">
                            Apps used while this task was in 'Active' state. Data is local and private.
                        </p>
                    </div>
                </div>

                {/* Subtasks */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                            Subtasks
                        </label>
                        {taskSubtasks.length > 0 && (
                            <span className="text-xs text-[var(--text-tertiary)] font-medium tabular-nums">
                                {calculateProgress()}% complete
                            </span>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {taskSubtasks.length > 0 && (
                        <div className="h-1 w-full bg-[var(--bg-hover)] rounded-full mb-4 overflow-hidden">
                            <div
                                className="h-full bg-[var(--accent-primary)] transition-all duration-500"
                                style={{ width: `${calculateProgress()}%` }}
                            />
                        </div>
                    )}

                    <div className="space-y-0.5">
                        {taskSubtasks.map(subtask => (
                            <div key={subtask.id} className="group flex items-center gap-3 px-2 -mx-2 py-2 rounded-[var(--radius-tile)] hover:bg-[var(--bg-hover)] transition-colors">
                                <button
                                    onClick={() => toggleSubtask(subtask.id)}
                                    className={`flex-shrink-0 transition-colors ${subtask.completed ? 'text-[var(--success)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                >
                                    {subtask.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </button>
                                <span className={`flex-1 text-sm transition-all ${subtask.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                                    {subtask.title}
                                </span>
                                <button
                                    onClick={() => deleteSubtask(subtask.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--text-muted)] hover:text-[var(--error)] rounded-[var(--radius-tile)] transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Subtask Input */}
                    <form onSubmit={handleAddSubtask} className="mt-2 flex items-center gap-3 px-2 -mx-2 py-2 rounded-[var(--radius-tile)] group hover:bg-[var(--bg-hover)] transition-colors">
                        <Plus className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Add subtask..."
                            className="bg-transparent text-sm text-[var(--text-primary)] flex-1 focus:outline-none placeholder:text-[var(--text-muted)]"
                        />
                    </form>
                </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-default)]">
                <button
                    onClick={async () => {
                        if (await confirm({ message: 'Delete this task?', variant: 'danger', confirmLabel: 'Delete' })) {
                            deleteTask(task.id)
                            handleClose()
                        }
                    }}
                    className="w-full py-2 text-xs font-medium text-[var(--error)] hover:bg-[var(--error)]/10 rounded-[var(--radius-tile)] transition-colors flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-3 h-3" />
                    Delete Task
                </button>
            </div>
        </div>
    )
}
