import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useListStore } from '@/store/listStore'
import type { List } from '@/types/list'

interface CreateListModalProps {
    isOpen: boolean
    onClose: () => void
    listToEdit?: List | null
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

export function CreateListModal({ isOpen, onClose, listToEdit }: CreateListModalProps) {
    const { createList, updateList } = useListStore()
    const [name, setName] = useState('')
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
    const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (listToEdit) {
                setName(listToEdit.name)
                setSelectedColor(listToEdit.color)
                setSelectedIcon(listToEdit.icon)
            } else {
                setName('')
                setSelectedColor(PRESET_COLORS[0])
                setSelectedIcon(PRESET_ICONS[0])
            }
        }
    }, [isOpen, listToEdit])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {
            if (listToEdit) {
                await updateList(listToEdit.id, {
                    name: name.trim(),
                    color: selectedColor,
                    icon: selectedIcon,
                })
                // Refresh is handled by generic update in store usually, but let's be safe
                const { fetchLists } = useListStore.getState()
                await fetchLists()
                onClose()
            } else {
                const result = await createList({
                    name: name.trim(),
                    color: selectedColor,
                    icon: selectedIcon,
                })

                if (result) {
                    const { fetchLists } = useListStore.getState()
                    await fetchLists()
                    onClose()
                } else {
                    console.error('[CreateList] Failed to create list - no result returned')
                }
            }
        } catch (error) {
            console.error('[CreateList] Error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="glass-thick rounded-2xl p-8 w-full max-w-md shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        {listToEdit ? 'Configure Module' : 'Initialize Module'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            Deployment Designation
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Strategic Ops"
                            className="w-full px-4 py-3 bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder:[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
                            autoFocus
                        />
                    </div>

                    {/* Icon Picker */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            Visual Identifier
                        </label>
                        <div className="grid grid-cols-8 gap-2">
                            {PRESET_ICONS.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setSelectedIcon(icon)}
                                    className={`p-2 rounded-xl text-2xl transition-all ${selectedIcon === icon
                                        ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/25'
                                        : 'bg-[var(--bg-hover)] hover:bg-[var(--bg-tertiary)]'
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            Signature Frequency
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-10 h-10 rounded-xl transition-all ${selectedColor === color ? 'scale-110 ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-card)]' : 'hover:scale-105 opacity-80 hover:opacity-100'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl font-bold hover:bg-[var(--bg-tertiary)] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || loading}
                            className="flex-1 btn-glass-primary py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (listToEdit ? 'Updating...' : 'Deploying...') : (listToEdit ? 'Save Changes' : 'Deploy Module')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
