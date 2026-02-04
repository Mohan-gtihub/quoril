import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import { Plus, Search, Settings, MoreVertical, LayoutGrid, Zap } from 'lucide-react'
import type { ListWithStats } from '@/types/list'
import type { Task } from '@/types/database'
import { CreateListModal } from './CreateListModal'

export function Dashboard() {
    const { user } = useAuthStore()
    const { lists, fetchLists, setSelectedList, getListStats } = useListStore()
    const { tasks, fetchTasks } = useTaskStore()
    const [listStats, setListStats] = useState<Record<string, ListWithStats>>({})
    const [showCreateModal, setShowCreateModal] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        fetchLists()
        fetchTasks()
    }, [fetchLists, fetchTasks])

    useEffect(() => {
        const loadStats = async () => {
            const stats: Record<string, ListWithStats> = {}
            for (const list of lists) {
                const listStat = await getListStats(list.id)
                if (listStat) {
                    stats[list.id] = listStat
                }
            }
            setListStats(stats)
        }
        if (lists.length > 0) {
            loadStats()
        }
    }, [lists, getListStats])

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

    const handleListClick = (listId: string | 'all') => {
        setSelectedList(listId === 'all' ? 'all' : listId)
        navigate('/planner')
    }

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${minutes}min`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}hr ${mins}min`
    }

    const tasksByList = useMemo(() => {
        const groups: Record<string, Task[]> = {}
        tasks.forEach(task => {
            if (!task.list_id) return
            if (!groups[task.list_id]) groups[task.list_id] = []
            groups[task.list_id].push(task)
        })
        return groups
    }, [tasks])

    const allListsStats = useMemo(() => {
        const pendingTasks = tasks.filter(t => t.status !== 'done')
        const totalMinutes = pendingTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0)
        return {
            count: pendingTasks.length,
            timeLabel: formatTime(totalMinutes)
        }
    }, [tasks])

    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] text-gray-300 overflow-hidden">
            {/* Top Bar */}
            <header className="h-20 px-8 flex items-center justify-between border-b border-white/5 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        {getGreeting()}, {getUserName()}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Ready to blitz through your tasks?</p>
                </div>

                <div className="flex items-center gap-2">
                    <IconButton icon={<Search className="w-4 h-4" />} />
                    <IconButton icon={<LayoutGrid className="w-4 h-4" />} />
                    <IconButton icon={<Settings className="w-4 h-4" />} />
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold ml-2">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-baseline justify-between mb-8">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            Your Lists
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/10">
                                {lists.length}
                            </span>
                        </h3>
                        <span className="text-xs text-gray-500 font-medium tracking-wide">LISTS WITH UPCOMING TASKS</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* All Tasks Summary Card */}
                        <ListCard
                            title="All Lists"
                            icon={<Zap className="w-4 h-4 text-blue-500 fill-current" />}
                            tasks={tasks.filter(t => t.status !== 'done').slice(0, 4)}
                            stats={{ count: allListsStats.count, time: allListsStats.timeLabel }}
                            onClick={() => handleListClick('all')}
                        />

                        {/* Individual List Cards */}
                        {lists.map(list => {
                            const stats = listStats[list.id]
                            return (
                                <ListCard
                                    key={list.id}
                                    title={list.name}
                                    icon={<div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color || '#3b82f6' }} />}
                                    tasks={(tasksByList[list.id] || []).filter(t => t.status !== 'done').slice(0, 4)}
                                    stats={{
                                        count: stats?.pendingCount || 0,
                                        time: formatTime(stats?.estimatedMinutes || 0)
                                    }}
                                    onClick={() => handleListClick(list.id)}
                                    onDelete={() => {
                                        if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
                                            useListStore.getState().deleteList(list.id)
                                        }
                                    }}
                                />
                            )
                        })}

                        {/* Add New List Button */}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="h-[260px] rounded-2xl border-2 border-dashed border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-gray-600 hover:text-blue-400 flex flex-col items-center justify-center gap-3 group"
                        >
                            <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center transition-transform group-hover:scale-110">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black tracking-[0.2em] uppercase">Create List</span>
                        </button>
                    </div>
                </div>
            </main>

            <CreateListModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />
        </div>
    )
}

function IconButton({ icon }: { icon: React.ReactNode }) {
    return (
        <button className="p-2.5 text-gray-500 hover:text-white transition rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5">
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
    onDelete?: () => void
}

function ListCard({ title, icon, tasks, stats, onClick, onDelete }: ListCardProps) {
    return (
        <div
            onClick={onClick}
            className="group h-[260px] bg-[#1a1a1a]/40 rounded-2xl border border-white/5 p-6 flex flex-col cursor-pointer transition-all hover:bg-[#1a1a1a] hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.05)]"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        {icon}
                    </div>
                    <h4 className="text-sm font-bold text-gray-200 group-hover:text-white transition">{title}</h4>
                </div>
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                        className="p-1 rounded-lg hover:bg-white/5 text-gray-700 hover:text-red-400 transition"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 space-y-3 overflow-hidden">
                {tasks.length > 0 ? (
                    tasks.map((task, idx) => (
                        <div key={task.id} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-[10px] font-mono text-gray-700 w-3 shrink-0">{idx + 1}</span>
                                <span className="text-xs text-gray-500 truncate group-hover:text-gray-300 transition">
                                    {task.title}
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-gray-700">
                                {task.estimated_minutes ? `${String(Math.floor(task.estimated_minutes / 60)).padStart(2, '0')}:${String(task.estimated_minutes % 60).padStart(2, '0')}` : '00:00'}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center text-[10px] text-gray-700 italic">
                        Empty list
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">Pending</span>
                    <span className="text-xs font-bold text-gray-400">{stats.count} tasks</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">Estimate</span>
                    <span className="text-xs font-bold text-gray-400">{stats.time}</span>
                </div>
            </div>
        </div>
    )
}
