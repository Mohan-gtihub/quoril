import { useMemo, useEffect } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { isToday, parseISO } from 'date-fns'
import { Clock, CheckCircle2, PlusCircle, Timer } from 'lucide-react'

export function Reports() {
    const tasks = useTaskStore(state => state.tasks)
    const fetchTasks = useTaskStore(state => state.fetchTasks)

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    const stats = useMemo(() => {
        let totalSeconds = 0
        let createdToday = 0
        let completedToday = 0

        const taskPerformance = tasks.map(t => {
            const actual = t.actual_seconds || 0
            totalSeconds += actual

            if (t.created_at && isToday(parseISO(t.created_at))) {
                createdToday++
            }
            if (t.status === 'done' && t.completed_at && isToday(parseISO(t.completed_at))) {
                completedToday++
            }

            return {
                id: t.id,
                title: t.title,
                status: t.status,
                timeSpent: actual,
                date: t.created_at
            }
        }).sort((a, b) => b.timeSpent - a.timeSpent) // Sort by time spent desc

        const hours = Math.floor(totalSeconds / 3600)
        const mins = Math.floor((totalSeconds % 3600) / 60)
        const secs = totalSeconds % 60

        return {
            totalTime: hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`,
            createdToday,
            completedToday,
            taskPerformance
        }
    }, [tasks])

    return (
        <div className="h-full overflow-auto bg-[#1a1f2e] text-white p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Performance Report
                    </h1>
                    <p className="text-gray-400 mt-2">Daily overview and time tracking</p>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#232936] p-6 rounded-2xl border border-gray-800 flex items-center gap-4 shadow-lg">
                        <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400">
                            <Timer className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Total Time Spent</p>
                            <p className="text-3xl font-bold text-white mt-1">{stats.totalTime}</p>
                        </div>
                    </div>

                    <div className="bg-[#232936] p-6 rounded-2xl border border-gray-800 flex items-center gap-4 shadow-lg">
                        <div className="p-4 bg-green-500/10 rounded-xl text-green-400">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Completed Today</p>
                            <p className="text-3xl font-bold text-white mt-1">{stats.completedToday}</p>
                        </div>
                    </div>

                    <div className="bg-[#232936] p-6 rounded-2xl border border-gray-800 flex items-center gap-4 shadow-lg">
                        <div className="p-4 bg-purple-500/10 rounded-xl text-purple-400">
                            <PlusCircle className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Created Today</p>
                            <p className="text-3xl font-bold text-white mt-1">{stats.createdToday}</p>
                        </div>
                    </div>
                </div>

                {/* Task Performance Table */}
                <div className="bg-[#232936] rounded-2xl border border-gray-800 shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            Time per Task
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#1f2430] text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 font-medium">Task Name</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium text-right">Time Spent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {stats.taskPerformance.length > 0 ? (
                                    stats.taskPerformance.map(task => (
                                        <tr key={task.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-medium text-gray-200">{task.title}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${task.status === 'done' ? 'bg-green-500/20 text-green-400' :
                                                    task.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-gray-700 text-gray-400'
                                                    }`}>
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-gray-300">
                                                {task.timeSpent > 0 ? (
                                                    task.timeSpent < 60 ? `${task.timeSpent}s` : `${Math.floor(task.timeSpent / 60)}m ${task.timeSpent % 60}s`
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-gray-500">
                                            No tasks found. Start tracking time to see data here.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
