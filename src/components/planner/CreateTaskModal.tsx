import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useCreateTask } from '@/hooks/useCreateTask'

interface Props {
    isOpen: boolean
    onClose: () => void
    listId: string
}

const PRESETS = [25, 45, 60, 90]

export function CreateTaskModal({ isOpen, onClose, listId }: Props) {
    const { submit, loading, error } = useCreateTask(listId)

    const [title, setTitle] = useState('')
    const [minutes, setMinutes] = useState(25)
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')

    /* Reset on close */
    useEffect(() => {
        if (!isOpen) reset()
    }, [isOpen])

    function reset() {
        setTitle('')
        setMinutes(25)
        setPriority('medium')
    }

    async function handleSubmit(focusAfter = false) {
        const res = await submit({
            title,
            minutes,
            priority,
            focusAfter,
        })

        if (res) {
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
                className="bg-[var(--bg-card)] w-full max-w-md rounded-2xl p-8 border border-[var(--border-default)] shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={onKeyDown}
                tabIndex={0}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        New Focus Mission
                    </h2>

                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
                        <X className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                    </button>
                </div>

                {/* Title */}
                <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Identify the target..."
                    className="w-full mb-6 px-4 py-3 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 placeholder:text-[var(--text-muted)]"
                />

                {/* Priority */}
                <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Priority Level</p>

                    <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPriority(p)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${priority === p
                                    ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/25'
                                    : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Presets */}
                <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Focus Duration</p>

                    <div className="flex gap-2 mb-3">
                        {PRESETS.map((m) => (
                            <button
                                key={m}
                                onClick={() => setMinutes(m)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${minutes === m
                                    ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/25'
                                    : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {m}m
                            </button>
                        ))}
                    </div>

                    <input
                        type="number"
                        min={5}
                        step={5}
                        value={minutes}
                        onChange={(e) => setMinutes(+e.target.value || 25)}
                        className="w-full px-4 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/50"
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 px-4 py-2 bg-[var(--error)]/10 text-xs text-[var(--error)] rounded-lg border border-[var(--error)]/20">
                        {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col gap-3 mt-8">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-[var(--bg-hover)] text-[var(--text-primary)] py-3 rounded-xl font-bold hover:bg-[var(--bg-tertiary)] transition-all"
                        >
                            Cancel
                        </button>

                        <button
                            disabled={loading}
                            onClick={() => handleSubmit(false)}
                            className="flex-1 bg-[var(--accent-primary)] text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-[var(--accent-primary)]/20"
                        >
                            Create
                        </button>
                    </div>

                    <button
                        disabled={loading}
                        onClick={() => handleSubmit(true)}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                    >
                        Create & Focus Now
                    </button>
                </div>

                {/* Hint */}
                <p className="text-[10px] text-[var(--text-muted)] mt-4 text-center font-bold uppercase tracking-wider">
                    CTRL + ENTER → CREATE & FOCUS
                </p>
            </div>
        </div>
    )
}
