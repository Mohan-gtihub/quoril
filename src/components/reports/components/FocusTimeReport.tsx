import { Clock, Briefcase } from 'lucide-react'

interface FocusTimeReportProps {
    stats: any // Using specific type would be better but keeping flexible for now matching controller output
}

export function FocusTimeReport({ stats }: FocusTimeReportProps) {
    const focusPerTask = stats.focusTime?.focusPerTask || []

    return (
        <div className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Task Breakdown
            </h2>

            {/* Focus Per Task */}
            <div className="glass-panel rounded-xl p-6">
                {focusPerTask.length === 0 ? (
                    <div className="text-center py-12">
                        <Clock className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4" />
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
                                    <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500/80 rounded-full transition-all duration-500 group-hover:bg-indigo-500"
                                            style={{ width: `${widthPercent}%` }}
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
