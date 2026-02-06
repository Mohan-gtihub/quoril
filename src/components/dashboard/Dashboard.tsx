import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import {
    Plus,
    Search,
    Settings,
    MoreVertical,
    LayoutGrid,
    Zap
} from 'lucide-react'

import type { List, ListWithStats } from '@/types/list'
import type { Task } from '@/types/database'
import { CreateListModal } from './CreateListModal'

export function Dashboard() {
    const [showArchived, setShowArchived] = useState(false)

    const { user } = useAuthStore()

    const {
        lists,
        archivedLists,
        fetchLists,
        fetchArchivedLists,
        setSelectedList,
        getListStats,
        duplicateList,
        deleteList,
        restoreList
    } = useListStore((state) => state)

    const { tasks, fetchTasks } = useTaskStore((state) => state)

    const [listStats, setListStats] = useState<Record<string, ListWithStats>>({})
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingList, setEditingList] = useState<List | null>(null)

    const navigate = useNavigate()

    /* ---------------- LOAD DATA ---------------- */

    useEffect(() => {
        fetchLists()
        fetchArchivedLists()
        fetchTasks()
    }, [])

    useEffect(() => {
        const loadStats = async () => {
            const stats: Record<string, ListWithStats> = {}

            const allLists = [...lists, ...archivedLists]

            for (const list of allLists) {
                const data = await getListStats(list.id)
                if (data) stats[list.id] = data
            }

            setListStats(stats)
        }

        if (lists.length || archivedLists.length) {
            loadStats()
        }
    }, [lists, archivedLists])

    /* ---------------- HELPERS ---------------- */

    const getGreeting = () => {
        const hour = new Date().getHours()

        if (hour < 5 || hour >= 21) return 'Good Night'
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    const getUserName = () => {
        if (!user?.email) return 'User'
        return user.email.split('@')[0]
    }

    const handleListClick = (id: string | 'all') => {
        setSelectedList(id === 'all' ? 'all' : id)
        navigate('/planner')
    }

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${minutes}min`

        const h = Math.floor(minutes / 60)
        const m = minutes % 60

        return `${h}hr ${m}min`
    }

    /* ---------------- GROUP TASKS ---------------- */

    const tasksByList = useMemo(() => {
        const map: Record<string, Task[]> = {}

        for (const task of tasks) {
            if (!task.list_id) continue

            if (!map[task.list_id]) {
                map[task.list_id] = []
            }

            map[task.list_id].push(task)
        }

        return map
    }, [tasks])

    const allListsStats = useMemo(() => {
        const activeListIds = new Set(lists.map(l => l.id))
        const pending = tasks.filter(t => t.status !== 'done' && activeListIds.has(t.list_id || ''))

        const minutes = pending.reduce(
            (s, t) => s + (t.estimated_minutes || 0),
            0
        )

        return {
            count: pending.length,
            timeLabel: formatTime(minutes)
        }
    }, [tasks, lists])

    const visibleLists = showArchived ? archivedLists : lists

    /* ---------------- UI ---------------- */

    return (
        <div className="flex flex-col h-full ambient-bg text-gray-300 overflow-hidden">

            {/* HEADER */}

            <header className="h-20 px-8 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">

                <div>
                    <h2 className="text-2xl font-black text-[var(--text-primary)]">
                        {getGreeting()}, {getUserName()}
                    </h2>

                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        Ready to blitz through your tasks?
                    </p>
                </div>

                <div className="flex items-center gap-2">

                    <IconButton icon={<Search size={16} />} />
                    <IconButton icon={<LayoutGrid size={16} />} />
                    <IconButton icon={<Settings size={16} />} />

                    <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-bold">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>

                </div>
            </header>

            {/* CONTENT */}

            <main className="flex-1 overflow-y-auto p-8">

                <div className="max-w-7xl mx-auto">

                    {/* TITLE */}

                    <div className="flex justify-between mb-8">

                        <div className="flex items-center gap-4">

                            <h3 className="text-xl font-bold text-[var(--text-primary)] flex gap-2">

                                Your Lists

                                <span className="text-[10px] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-2 py-0.5 rounded-full">
                                    {visibleLists.length}
                                </span>

                            </h3>

                            <div className="flex gap-1 p-1 bg-[var(--bg-hover)] rounded-lg">

                                <button
                                    onClick={() => setShowArchived(false)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${!showArchived
                                        ? 'bg-[var(--accent-primary)] text-white'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    Active
                                </button>

                                <button
                                    onClick={() => setShowArchived(true)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${showArchived
                                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    Archived
                                </button>

                            </div>
                        </div>

                        <span className="text-xs text-[var(--text-muted)]">
                            {showArchived ? 'ARCHIVED LISTS' : 'ACTIVE LISTS'}
                        </span>

                    </div>

                    {/* GRID */}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* ALL TASKS */}

                        {!showArchived && (

                            <ListCard
                                title="All Lists"
                                icon={<Zap size={16} className="text-blue-500" />}
                                tasks={tasks.filter(t => {
                                    if (t.status === 'done') return false
                                    return lists.some(l => l.id === t.list_id)
                                }).slice(0, 4)}
                                stats={{
                                    count: allListsStats.count,
                                    time: allListsStats.timeLabel
                                }}
                                onClick={() => handleListClick('all')}
                            />

                        )}

                        {/* LISTS */}

                        {visibleLists.map((list: List) => {

                            const stats = listStats[list.id]

                            return (

                                <ListCard
                                    key={list.id}
                                    title={list.name}
                                    icon={
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ background: list.color || '#3b82f6' }}
                                        />
                                    }
                                    tasks={(tasksByList[list.id] || [])
                                        .filter(t => t.status !== 'done')
                                        .slice(0, 4)
                                    }
                                    stats={{
                                        count: stats?.pendingCount || 0,
                                        time: formatTime(stats?.estimatedMinutes || 0)
                                    }}
                                    isArchived={showArchived}
                                    onClick={() => !showArchived && handleListClick(list.id)}
                                    onDuplicate={!showArchived ? () => duplicateList(list.id) : undefined}
                                    onEdit={!showArchived ? () => setEditingList(list) : undefined}
                                    onArchive={!showArchived ? () => deleteList(list.id) : undefined}
                                    onRestore={showArchived ? () => restoreList(list.id) : undefined}
                                    onDelete={showArchived ? () => {
                                        if (window.confirm('Permanently delete this list and all its tasks?')) {
                                            useListStore.getState().permanentDeleteList(list.id)
                                        }
                                    } : undefined}
                                />

                            )
                        })}

                        {/* CREATE */}

                        {!showArchived && (

                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="h-[260px] rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/40 flex flex-col items-center justify-center gap-3"
                            >
                                <Plus size={22} />

                                <span className="text-xs font-bold tracking-widest">
                                    CREATE LIST
                                </span>
                            </button>

                        )}

                    </div>

                </div>

            </main>

            {/* MODAL */}

            <CreateListModal
                isOpen={showCreateModal || !!editingList}
                onClose={() => {
                    setShowCreateModal(false)
                    setEditingList(null)
                }}
                listToEdit={editingList}
            />

        </div>
    )
}

/* ================= COMPONENTS ================= */

function IconButton({ icon }: { icon: React.ReactNode }) {
    return (
        <button className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5">
            {icon}
        </button>
    )
}

interface ListCardProps {
    title: string
    icon: React.ReactNode
    tasks: Task[]
    stats: { count: number; time: string }
    onClick: () => void
    isArchived?: boolean
    onDuplicate?: () => void
    onEdit?: () => void
    onArchive?: () => void
    onRestore?: () => void
    onDelete?: () => void
}

function ListCard({
    title,
    icon,
    tasks,
    stats,
    onClick,
    isArchived,
    onDuplicate,
    onEdit,
    onArchive,
    onRestore,
    onDelete
}: ListCardProps) {

    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }

        document.addEventListener('mousedown', fn)

        return () => document.removeEventListener('mousedown', fn)
    }, [])

    const hasMenu = onDuplicate || onEdit || onArchive || onRestore || onDelete

    return (
        <div
            onClick={onClick}
            className={`group h-[260px] glass card-glow rounded-2xl border border-[var(--border-default)] p-6 flex flex-col cursor-pointer hover:border-[var(--accent-primary)]/40 transition ${isArchived ? 'opacity-70' : ''
                }`}
        >

            {/* HEADER */}

            <div className="flex justify-between mb-6">

                <div className="flex gap-3 items-center">

                    <div className="p-2 rounded bg-[var(--bg-hover)]">
                        {icon}
                    </div>

                    <h4 className="text-sm font-bold">
                        {title}
                    </h4>

                </div>

                {hasMenu && (

                    <div className="relative" ref={ref}>

                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setOpen(!open)
                            }}
                        >
                            <MoreVertical size={16} />
                        </button>

                        {open && (

                            <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl z-50 shadow-2xl">

                                <div className="p-1">

                                    {onRestore && (
                                        <MenuItem label="Restore" onClick={onRestore} />
                                    )}

                                    {onDuplicate && (
                                        <MenuItem label="Duplicate" onClick={onDuplicate} />
                                    )}

                                    {onEdit && (
                                        <MenuItem label="Edit" onClick={onEdit} />
                                    )}

                                    {onArchive && (
                                        <MenuItem danger label="Archive" onClick={onArchive} />
                                    )}

                                    {onDelete && (
                                        <MenuItem danger label="Delete" onClick={onDelete} />
                                    )}

                                </div>

                            </div>
                        )}

                    </div>
                )}

            </div>

            {/* TASKS */}

            <div className="flex-1 space-y-2 overflow-hidden">

                {tasks.length ? (

                    tasks.map((task, i) => (

                        <div key={task.id} className="flex justify-between text-xs">

                            <span className="truncate">
                                {i + 1}. {task.title}
                            </span>

                            <span className="text-gray-600">
                                {task.estimated_minutes || 0}m
                            </span>

                        </div>

                    ))

                ) : (

                    <div className="h-full flex items-center justify-center text-xs text-gray-600 italic">
                        Empty list
                    </div>

                )}

            </div>

            {/* FOOTER */}

            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs">

                <div>
                    <div className="text-gray-500">Pending</div>
                    <div>{stats.count}</div>
                </div>

                <div className="text-right">
                    <div className="text-gray-500">Estimate</div>
                    <div>{stats.time}</div>
                </div>

            </div>

        </div>
    )
}

function MenuItem({
    label,
    onClick,
    danger
}: {
    label: string
    onClick: () => void
    danger?: boolean
}) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation()
                onClick()
            }}
            className={`w-full text-left px-3 py-2 text-xs rounded ${danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-gray-400 hover:bg-white/5'
                }`}
        >
            {label}
        </button>
    )
}
