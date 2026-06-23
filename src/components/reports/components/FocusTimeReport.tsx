import { motion } from 'framer-motion'

interface FocusTimeReportProps {
    stats: any // Using specific type would be better but keeping flexible for now matching controller output
}

export function FocusTimeReport({ stats }: FocusTimeReportProps) {
    const focusPerTask = stats.focusTime?.focusPerTask || []

    return (
        <div className="space-y-6">
            <h2 className="text-[24px] font-semibold tracking-tight text-[var(--text-primary)]">
                Task Breakdown
            </h2>

            {/* Focus Per Task */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-6 shadow-sm">
                {focusPerTask.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-sm text-[var(--text-secondary)] font-medium">No activity recorded yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {focusPerTask.map((task: any, index: number) => {
                            const maxMinutes = Math.max(...focusPerTask.map((t: any) => t.minutes))
                            const widthPercent = (task.minutes / maxMinutes) * 100

                            return (
                                <div key={task.taskId} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="text-xs font-mono text-[var(--text-muted)] tabular-nums w-4">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <span className="text-sm text-[var(--text-secondary)] font-medium truncate group-hover:text-[var(--text-primary)] transition-colors">
                                                {task.taskTitle}
                                            </span>
                                        </div>
                                        <span className="text-sm font-mono text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors tabular-nums">
                                            {Math.floor(task.minutes / 60)}h {task.minutes % 60}m
                                        </span>
                                    </div>
                                    <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-[var(--accent-primary)]/80 rounded-full group-hover:bg-[var(--accent-primary)]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${widthPercent}%` }}
                                            transition={{ duration: 0.6, delay: index * 0.04, ease: 'easeOut' }}
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
