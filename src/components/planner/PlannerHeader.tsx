import { ChevronDown, Trash2, Tag } from 'lucide-react'
import { useListStore } from '@/store/listStore'
import { useAuthStore } from '@/store/authStore'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DateNavigator } from './DateNavigator'
import { confirm } from '@/components/ui/ConfirmDialog'
import { NicknameManagerModal } from './NicknameManagerModal'

export function PlannerHeader() {
    const { lists, selectedListId, setSelectedList, deleteList } = useListStore()
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [hoveredListId, setHoveredListId] = useState<string | null>(null)
    const [showNicknames, setShowNicknames] = useState(false)

    const selectedList = lists.find(l => l.id === selectedListId)

    // Workspace context: the selected list's workspace, else the first workspace
    // any list belongs to. Null when there are no shared workspaces.
    const nicknameWorkspaceId = useMemo(() => {
        const fromSelected = (selectedList as any)?.workspace_id
        if (fromSelected) return fromSelected as string
        const first = lists.find(l => (l as any).workspace_id)
        return (first as any)?.workspace_id ?? null
    }, [selectedList, lists])

    const handleDeleteList = async (listId: string, listName: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (await confirm({ message: `Delete list "${listName}"? All tasks in this list will also be deleted.`, variant: 'danger', confirmLabel: 'Delete List' })) {
            await deleteList(listId)
            if (selectedListId === listId) {
                setSelectedList('all')
            }
        }
    }

    return (
        <div className="flex items-center justify-between gap-4 px-6 md:px-10 py-5 relative z-50">
            {/* Workspace Selector */}
            <div className="relative group z-50">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 pl-2 pr-3.5 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-contrast)] font-bold text-sm">
                        {selectedListId === 'all' ? 'A' : (selectedList?.name.charAt(0) || 'L')}
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-semibold leading-none text-[var(--text-primary)]">
                            {selectedListId === 'all' ? 'All Tasks' : (selectedList?.name || 'Select List')}
                        </div>
                        <div className="text-[11px] flex items-center gap-1 mt-1 text-[var(--text-tertiary)]">
                            {selectedListId === 'all' ? 'Master View' : 'Workspace'} <ChevronDown className="w-3 h-3" />
                        </div>
                    </div>
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 rounded-[var(--radius-card)] bg-[var(--bg-elevated)] z-50 overflow-hidden py-1.5 border border-[var(--border-default)]">
                        <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Views</div>
                        <button
                            onClick={() => {
                                setSelectedList('all')
                                setIsDropdownOpen(false)
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${selectedListId === 'all' ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                        >
                            All Tasks
                        </button>

                        <div className="my-1.5 border-t border-[var(--border-default)]" />

                        <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">My Lists</div>
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
                                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${selectedListId === list.id ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${list.color || 'bg-[var(--text-muted)]'}`} />
                                    <span className="flex-1 text-left truncate">{list.name}</span>
                                    {hoveredListId === list.id && (
                                        <button
                                            onClick={(e) => handleDeleteList(list.id, list.name, e)}
                                            className="p-1 hover:bg-[var(--error)]/15 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--error)]"
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
            <div className="flex-1 flex justify-center">
                <DateNavigator />
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
                {nicknameWorkspaceId && (
                    <button
                        onClick={() => setShowNicknames(true)}
                        title="Assign nicknames to workspace members"
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] active:scale-95 transition-colors"
                    >
                        <Tag size={13} className="text-[var(--accent-primary)]" />
                        Assign a nickname
                    </button>
                )}
                <button
                    onClick={() => navigate('/settings')}
                    title={user?.email || 'Account'}
                    className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] active:scale-95 transition-colors font-semibold text-sm"
                >
                    {(user?.email?.charAt(0) || 'U').toUpperCase()}
                </button>
            </div>

            {showNicknames && nicknameWorkspaceId && (
                <NicknameManagerModal
                    workspaceId={nicknameWorkspaceId}
                    onClose={() => setShowNicknames(false)}
                />
            )}
        </div>
    )
}
