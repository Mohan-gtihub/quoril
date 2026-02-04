
import { ChevronDown, Settings, User, LayoutGrid, Trash2 } from 'lucide-react'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'
import { useState } from 'react'

export function PlannerHeader() {
    const { lists, selectedListId, setSelectedList, deleteList } = useListStore()
    const { tasks } = useTaskStore()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [hoveredListId, setHoveredListId] = useState<string | null>(null)

    const selectedList = lists.find(l => l.id === selectedListId)

    // Calculate progress summary
    const pendingTasks = tasks.filter(t => t.status !== 'done').length
    const totalMinutes = tasks
        .filter(t => t.status !== 'done')
        .reduce((sum, t) => sum + (t.estimated_minutes || 0), 0)

    const formatTime = (minutes: number) => {
        if (minutes === 0) return '0min'
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
        }
        return `${mins}min`
    }

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
        <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-default)' }}>
            {/* Workspace Selector */}
            <div className="relative group z-50">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
                        {selectedListId === 'all' ? <LayoutGrid className="w-5 h-5" /> : (selectedList?.name.charAt(0) || 'L')}
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
                    <div className="absolute top-full left-0 mt-2 w-64 border rounded-xl shadow-xl overflow-hidden py-1" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
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
                            <LayoutGrid className="w-4 h-4" />
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

            {/* Progress Summary */}
            <div className="flex flex-col items-center">
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {pendingTasks} pending tasks
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Est: {formatTime(totalMinutes)}
                </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
                <button className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full hover:opacity-90 transition-opacity">
                    PRO
                </button>

                <button className="p-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <Settings className="w-5 h-5" />
                </button>

                <button className="p-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <User className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
