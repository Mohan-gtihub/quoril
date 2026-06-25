import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useListStore } from '@/store/listStore'
import type { List } from '@/types/list'

interface CreateListModalProps {
    isOpen: boolean
    onClose: () => void
    listToEdit?: List | null
    defaultWorkspaceId?: string
}

// Desaturated monochrome ink ramp to match the calm "Daylight" design system
const PRESET_COLORS = [
    '#16160f', // ink darkest
    '#3f3f3a', // ink dark
    '#6b6b66', // ink mid
    '#8f8f88', // ink soft
    '#a8a8a1', // ink light
    '#cfcec7', // ink lightest
]

const DEFAULT_ICON = 'list'

export function CreateListModal({ isOpen, onClose, listToEdit, defaultWorkspaceId }: CreateListModalProps) {
    const { createList, updateList } = useListStore()
    const [name, setName] = useState('')
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
    const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICON)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (listToEdit) {
                setName(listToEdit.name)
                setSelectedColor(listToEdit.color)
                setSelectedIcon(listToEdit.icon || DEFAULT_ICON)
            } else {
                setName('')
                setSelectedColor(PRESET_COLORS[0])
                setSelectedIcon(DEFAULT_ICON)
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
                    ...(defaultWorkspaceId ? { workspace_id: defaultWorkspaceId } : {}),
                } as any)

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
        <div className="fixed inset-0 bg-[var(--text-primary)]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-6 w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                        {listToEdit ? 'Edit List' : 'Create New List'}
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
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                            List Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Marketing Tasks"
                            className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-[var(--radius-tile)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                            autoFocus
                        />
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                            Theme Color
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-10 h-10 rounded-[var(--radius-tile)] transition-all ${selectedColor === color ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-elevated)]' : 'opacity-70 hover:opacity-100'
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
                            className="flex-1 px-4 py-2.5 text-sm bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-[var(--radius-tile)] font-semibold hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || loading}
                            className="flex-1 btn-glass-primary py-2.5 text-sm rounded-[var(--radius-tile)] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (listToEdit ? 'Updating...' : 'Creating...') : (listToEdit ? 'Save Changes' : 'Create List')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
