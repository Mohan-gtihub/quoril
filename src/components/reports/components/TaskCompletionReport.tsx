import { motion } from 'framer-motion'
import type { TaskCompletionStats } from '../types/reports.types'

interface TaskCompletionReportProps {
    stats: TaskCompletionStats
}

export function TaskCompletionReport({ stats }: TaskCompletionReportProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                Task Completion Metrics
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Completed Today</h3>
                    <div className="text-3xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
                        {stats.completedToday}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-2 uppercase tracking-wider">Tasks Done</p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Completion Rate</h3>
                    <div className="text-3xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
                        {stats.completionRatePercent}%
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-2 uppercase tracking-wider">Overall</p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Overdue</h3>
                    <div className="text-3xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
                        {stats.overdueTasks}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-2 uppercase tracking-wider">Tasks Past Due</p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Active Lists</h3>
                    <div className="text-3xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
                        {stats.completedByList.length}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-2 uppercase tracking-wider">With Completions</p>
                </div>
            </div>

            {/* Completions Per List */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">
                    Tasks Completed Per List
                </h3>

                {stats.completedByList.length === 0 ? (
                    <div className="text-center py-12">
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
                                        <span className="text-sm font-semibold text-[var(--text-secondary)] ml-4 tabular-nums">
                                            {list.count} {list.count === 1 ? 'task' : 'tasks'}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${widthPercent}%` }}
                                            transition={{ duration: 0.7, ease: 'easeOut' }}
                                            style={{
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
