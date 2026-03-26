import { useEffect, useState } from 'react'
import { X, Repeat } from 'lucide-react'
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
                className="glass-thick w-full max-w-md rounded-2xl p-8 shadow-2xl animate-scale-in"
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
                        min={0}
                        step={5}
                        value={minutes || ''}
                        onChange={(e) => setMinutes(+e.target.value)}
                        placeholder="Unlimited focus..."
                        className="w-full px-4 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/50"
                    />
                </div>

                {/* Recurrence */}
                <div className="mb-6">
                    <button
                        onClick={() => setIsRecurring(!isRecurring)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${isRecurring
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'bg-[var(--bg-hover)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Repeat className={`w-4 h-4 ${isRecurring ? 'animate-pulse-slow' : ''}`} />
                            <span className="text-sm font-bold">Daily Recurrence</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${isRecurring ? 'bg-emerald-500' : 'bg-[var(--bg-tertiary)]'}`}>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isRecurring ? 'translate-x-5' : ''}`} />
                        </div>
                    </button>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2 ml-1 font-medium italic">
                        Task will automatically reappear in your list tomorrow morning.
                    </p>
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
                            disabled={loading || !title.trim()}
                            onClick={() => handleSubmit(false)}
                            className="flex-1 btn-glass-primary py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create
                        </button>
                    </div>

                    <button
                        disabled={loading || !title.trim()}
                        onClick={() => handleSubmit(true)}
                        className="w-full bg-emerald-500/80 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold backdrop-blur-md border border-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
