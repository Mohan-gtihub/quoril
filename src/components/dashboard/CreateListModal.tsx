import { useState } from 'react'
import { X } from 'lucide-react'
import { useListStore } from '@/store/listStore'

interface CreateListModalProps {
    isOpen: boolean
    onClose: () => void
}

const PRESET_COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
]

const PRESET_ICONS = ['📋', '💼', '🎯', '📚', '💡', '🚀', '✨', '🔥']

export function CreateListModal({ isOpen, onClose }: CreateListModalProps) {
    const { createList } = useListStore()
    const [name, setName] = useState('')
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
    const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0])
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {

            const result = await createList({
                name: name.trim(),
                color: selectedColor,
                icon: selectedIcon,
            })


            if (result) {
                // Refresh the lists
                const { fetchLists } = useListStore.getState()
                await fetchLists()

                setName('')
                setSelectedColor(PRESET_COLORS[0])
                setSelectedIcon(PRESET_ICONS[0])
                onClose()
            } else {
                console.error('[CreateList] Failed to create list - no result returned')
            }
        } catch (error) {
            console.error('[CreateList] Error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Create New List</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            List Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Work Projects"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>

                    {/* Icon Picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Icon
                        </label>
                        <div className="grid grid-cols-8 gap-2">
                            {PRESET_ICONS.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setSelectedIcon(icon)}
                                    className={`p-2 rounded-lg text-2xl transition-colors ${selectedIcon === icon
                                        ? 'bg-blue-600'
                                        : 'bg-gray-700 hover:bg-gray-600'
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Color
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-10 h-10 rounded-lg transition-transform ${selectedColor === color ? 'scale-110 ring-2 ring-white' : ''
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create List'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
