import { CheckCircle2, TrendingUp, AlertCircle, ListChecks } from 'lucide-react'
import type { TaskCompletionStats } from '../types/reports.types'

interface TaskCompletionReportProps {
    stats: TaskCompletionStats
}

export function TaskCompletionReport({ stats }: TaskCompletionReportProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--text-secondary)] flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4" />
                Task Completion Metrics
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-regular rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Completed Today</h3>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                    </div>
                    <div className="text-3xl font-black text-[var(--text-primary)] font-mono">
                        {stats.completedToday}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2 uppercase tracking-widest">Tasks Done</p>
                </div>

                <div className="glass-regular rounded-2xl p-6 hover:border-indigo-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Completion Rate</h3>
                        <TrendingUp className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    </div>
                    <div className="text-3xl font-black text-[var(--text-primary)] font-mono">
                        {stats.completionRatePercent}%
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2 uppercase tracking-widest">Overall</p>
                </div>

                <div className="glass-regular rounded-2xl p-6 hover:border-red-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Overdue</h3>
                        <AlertCircle className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
                    </div>
                    <div className="text-3xl font-black text-[var(--text-primary)] font-mono">
                        {stats.overdueTasks}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2 uppercase tracking-widest">Tasks Past Due</p>
                </div>

                <div className="glass-regular rounded-2xl p-6 hover:border-purple-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Active Lists</h3>
                        <ListChecks className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    </div>
                    <div className="text-3xl font-black text-[var(--text-primary)] font-mono">
                        {stats.completedByList.length}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2 uppercase tracking-widest">With Completions</p>
                </div>
            </div>

            {/* Completions Per List */}
            <div className="glass-regular rounded-2xl p-6">
                <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-6">
                    Tasks Completed Per List
                </h3>

                {stats.completedByList.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle2 className="w-12 h-12 text-[var(--text-muted)]/30 mx-auto mb-4" />
                        <p className="text-sm text-[var(--text-muted)]">No completed tasks yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {stats.completedByList.map((list) => {
                            const maxCount = Math.max(...stats.completedByList.map(l => l.count))
                            const widthPercent = (list.count / maxCount) * 100

                            return (
                                <div key={list.listName} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: list.color }}
                                            />
                                            <span className="text-sm text-[var(--text-primary)] font-medium truncate">
                                                {list.listName}
                                            </span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-emerald-400 ml-4 tabular-nums">
                                            {list.count} {list.count === 1 ? 'task' : 'tasks'}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${widthPercent}%`,
                                                backgroundColor: list.color,
                                                opacity: 0.8
                                            }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
