import { ChevronDown, Trash2, Search } from 'lucide-react'
import { useListStore } from '@/store/listStore'
import { useState } from 'react'
import { DateNavigator } from './DateNavigator'
import { IconButton } from '../dashboard/Dashboard'

export function PlannerHeader() {
    const { lists, selectedListId, setSelectedList, deleteList } = useListStore()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [hoveredListId, setHoveredListId] = useState<string | null>(null)

    const selectedList = lists.find(l => l.id === selectedListId)


    const handleDeleteList = async (listId: string, listName: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (window.confirm(`Delete list "${listName}"? All tasks in this list will also be deleted.`)) {
            await deleteList(listId)
            if (selectedListId === listId) {
                setSelectedList('all')
            }
        }
    }

    return (
        <div className="flex items-center justify-between p-4 border-b relative z-50" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-default)' }}>
            {/* Workspace Selector */}
            <div className="relative group z-50">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <div className="w-8 h-8 rounded bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold">
                        {selectedListId === 'all' ? 'A' : (selectedList?.name.charAt(0) || 'L')}
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {selectedListId === 'all' ? 'All Tasks' : (selectedList?.name || 'Select List')}
                        </div>
                        <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            {selectedListId === 'all' ? 'Master View' : 'Workspace'} <ChevronDown className="w-3 h-3" />
                        </div>
                    </div>
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 border rounded-xl shadow-2xl glass-thick z-50 overflow-hidden py-1" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="px-3 py-2 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Views</div>
                        <button
                            onClick={() => {
                                setSelectedList('all')
                                setIsDropdownOpen(false)
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedListId === 'all' ? 'bg-blue-500/10 text-blue-500' : ''}`}
                            style={selectedListId !== 'all' ? { color: 'var(--text-secondary)' } : {}}
                            onMouseEnter={(e) => { if (selectedListId !== 'all') e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
                            onMouseLeave={(e) => { if (selectedListId !== 'all') e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            All Tasks
                        </button>

                        <div className="my-1 border-t" style={{ borderColor: 'var(--border-default)' }} />

                        <div className="px-3 py-2 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>My Lists</div>
                        {lists.map(list => (
                            <div
                                key={list.id}
                                className="relative group/list"
                                onMouseEnter={() => setHoveredListId(list.id)}
                                onMouseLeave={() => setHoveredListId(null)}
                            >
                                <button
                                    onClick={() => {
                                        setSelectedList(list.id)
                                        setIsDropdownOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedListId === list.id ? 'bg-blue-500/10 text-blue-500' : ''}`}
                                    style={selectedListId !== list.id ? { color: 'var(--text-secondary)' } : {}}
                                    onMouseEnter={(e) => { if (selectedListId !== list.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
                                    onMouseLeave={(e) => { if (selectedListId !== list.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                                >
                                    <div className={`w-2 h-2 rounded-full ${list.color || 'bg-gray-400'}`} />
                                    <span className="flex-1 text-left">{list.name}</span>
                                    {hoveredListId === list.id && (
                                        <button
                                            onClick={(e) => handleDeleteList(list.id, list.name, e)}
                                            className="p-1 hover:bg-red-500/20 rounded transition-colors text-gray-500 hover:text-red-400"
                                            title="Delete list"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Center: Date Selection */}
            <div className="flex-1 max-w-lg mx-8">
                <DateNavigator />
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1">
                <IconButton icon={<Search size={16} />} />
                <button className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-orange-500 text-[10px] font-black rounded-xl border border-orange-500/20 hover:bg-orange-500/30 transition-all uppercase tracking-widest mr-2">
                    Premium
                </button>

                <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm">
                    {selectedListId === 'all' ? 'A' : (selectedList?.name.charAt(0) || 'U')}
                </div>
            </div>
        </div>
    )
}
