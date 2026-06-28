import { useEffect, useState } from 'react'
import { X, Repeat } from 'lucide-react'
import { useCreateTask } from '@/hooks/useCreateTask'
import type { Task } from '@/types/database'
import type { TaskColumn } from '@/types/list'

interface Props {
    isOpen: boolean
    onClose: () => void
    listId: string
    column?: TaskColumn
    position?: 'top' | 'bottom'
    onCreated?: (task: Task) => void
}

const PRESETS = [25, 45, 60, 90]

export function CreateTaskModal({ isOpen, onClose, listId, column = 'today', position = 'bottom', onCreated }: Props) {
    const { submit, loading, error } = useCreateTask(listId)

    const [title, setTitle] = useState('')
    const [minutes, setMinutes] = useState(0)
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
    const [isRecurring, setIsRecurring] = useState(false)

    /* Reset on close */
    useEffect(() => {
        if (!isOpen) reset()
    }, [isOpen])

    function reset() {
        setTitle('')
        setMinutes(0)
        setPriority('medium')
        setIsRecurring(false)
    }

    async function handleSubmit(focusAfter = false) {
        const res = await submit({
            title,
            minutes,
            priority,
            focusAfter,
            isRecurring,
            column,
            position,
        })

        if (res) {
            onCreated?.(res)
            reset()
            onClose()
        }
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape') onClose()
        if (e.ctrlKey && e.key === 'Enter') handleSubmit(true)
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-[var(--radius-tile)] p-6 bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-lift)] animate-scale-in"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={onKeyDown}
                tabIndex={0}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                        New task
                    </h2>

                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-[var(--radius-tile)] transition-colors">
                        <X className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                    </button>
                </div>

                {/* Title */}
                <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task name..."
                    className="w-full mb-6 px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-tile)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15 placeholder:text-[var(--text-muted)] transition-colors"
                />

                {/* Priority */}
                <div className="mb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2.5">Priority</p>

                    <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPriority(p)}
                                className={`flex-1 py-2 rounded-[var(--radius-tile)] text-xs font-medium transition-colors border ${priority === p
                                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--accent-contrast)]'
                                    : 'bg-[var(--bg-tertiary)] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                                    }`}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Presets */}
                <div className="mb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2.5">Focus duration</p>

                    <div className="flex gap-2 mb-3">
                        {PRESETS.map((m) => (
                            <button
                                key={m}
                                onClick={() => setMinutes(m)}
                                className={`flex-1 py-2 rounded-[var(--radius-tile)] text-xs font-medium tabular-nums transition-colors border ${minutes === m
                                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--accent-contrast)]'
                                    : 'bg-[var(--bg-tertiary)] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                                    }`}
                            >
                                {m}m
                            </button>
                        ))}
                    </div>

                    <input
                        type="number"
                        min={0}
                        step={5}
                        value={minutes || ''}
                        onChange={(e) => setMinutes(+e.target.value)}
                        placeholder="Unlimited focus..."
                        className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] tabular-nums border border-[var(--border-default)] rounded-[var(--radius-tile)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15 placeholder:text-[var(--text-muted)] transition-colors"
                    />
                </div>

                {/* Recurrence */}
                <div className="mb-6">
                    <button
                        onClick={() => setIsRecurring(!isRecurring)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-tile)] border transition-colors ${isRecurring
                            ? 'bg-[var(--accent-lime-100)] border-[var(--accent-primary)]/40 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Repeat className="w-4 h-4" />
                            <span className="text-sm font-medium">Daily recurrence</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${isRecurring ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'}`}>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-[var(--accent-contrast)] rounded-full transition-transform ${isRecurring ? 'translate-x-5' : ''}`} />
                        </div>
                    </button>
                    <p className="text-[11px] text-[var(--text-muted)] mt-2 ml-1 leading-relaxed">
                        Task will automatically reappear in your list tomorrow morning.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 px-4 py-2 bg-[var(--error)]/10 text-xs text-[var(--error)] rounded-[var(--radius-tile)]">
                        {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col gap-2.5 mt-8">
                    <div className="flex gap-2.5">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] py-3 rounded-[var(--radius-tile)] font-medium hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            disabled={loading || !title.trim()}
                            onClick={() => handleSubmit(false)}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] py-3 rounded-[var(--radius-tile)] font-medium hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create
                        </button>
                    </div>

                    <button
                        disabled={loading || !title.trim()}
                        onClick={() => handleSubmit(true)}
                        className="w-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] py-3 rounded-[var(--radius-tile)] font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create & Focus Now
                    </button>
                </div>

                {/* Hint */}
                <p className="text-[11px] text-[var(--text-muted)] mt-4 text-center tracking-wide">
                    Ctrl + Enter to create & focus
                </p>
            </div>
        </div>
    )
}
