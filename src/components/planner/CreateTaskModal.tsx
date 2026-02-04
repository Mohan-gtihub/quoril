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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 w-full max-w-md rounded-xl p-6 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={onKeyDown}
                tabIndex={0}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-semibold text-white">
                        New Focus Task
                    </h2>

                    <button onClick={onClose}>
                        <X className="text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Title */}
                <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What will you work on?"
                    className="w-full mb-4 px-4 py-2 bg-gray-700 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Priority */}
                <div className="mb-4">
                    <p className="text-sm text-gray-300 mb-2">Priority</p>

                    <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPriority(p)}
                                className={`flex-1 py-1 rounded-lg text-sm ${priority === p
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300'
                                    }`}
                            >
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Presets */}
                <div className="mb-4">
                    <p className="text-sm text-gray-300 mb-2">Focus Time</p>

                    <div className="flex gap-2 mb-2">
                        {PRESETS.map((m) => (
                            <button
                                key={m}
                                onClick={() => setMinutes(m)}
                                className={`px-3 py-1 rounded-lg text-sm ${minutes === m
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300'
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
                        className="w-full px-3 py-1 bg-gray-700 text-white rounded-lg"
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-700 py-2 rounded-lg"
                    >
                        Cancel
                    </button>

                    <button
                        disabled={loading}
                        onClick={() => handleSubmit(false)}
                        className="flex-1 bg-blue-600 py-2 rounded-lg disabled:opacity-50"
                    >
                        Create
                    </button>

                    <button
                        disabled={loading}
                        onClick={() => handleSubmit(true)}
                        className="flex-1 bg-green-600 py-2 rounded-lg disabled:opacity-50"
                    >
                        Create & Focus
                    </button>
                </div>

                {/* Hint */}
                <p className="text-xs text-gray-400 mt-3 text-center">
                    Ctrl + Enter → Create & Focus
                </p>
            </div>
        </div>
    )
}
