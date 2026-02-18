import { format, parseISO } from 'date-fns'
import { CheckCircle2, Clock } from 'lucide-react'
import { CompletedTaskGroup } from '../types/reports.types'

interface CompletedTasksLogProps {
    taskGroups: CompletedTaskGroup[]
}

export function CompletedTasksLog({ taskGroups }: CompletedTasksLogProps) {
    return (
        <div className="glass-panel rounded-3xl p-8 min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Completed Tasks Log
                </h3>
            </div>

            <div className="h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {taskGroups.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-[var(--border-default)] rounded-2xl text-center">
                        <CheckCircle2 className="w-8 h-8 text-[var(--text-muted)] opacity-30 mb-2" />
                        <p className="text-xs text-[var(--text-muted)]">No tasks completed in this period.</p>
                    </div>
                )}

                {taskGroups.map(({ date, items }) => (
                    <div key={date} className="relative pl-6 border-l border-[var(--border-default)] space-y-4 mb-8">
                        <span className="absolute -left-[3px] top-0 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-primary)]"></span>
                        <h4 className="text-xs font-bold text-[var(--text-secondary)]">{format(parseISO(date), 'EEEE, MMM do')}</h4>

                        <div className="space-y-2">
                            {items.map((task) => (
                                <div key={task.id} className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl hover:border-emerald-500/30 transition-all group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="w-1.5 h-8 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: task.listColor || 'var(--bg-tertiary)' }}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[200px] line-through decoration-emerald-500/50 decoration-2">
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {task.listName && (
                                                    <span
                                                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] uppercase tracking-wider font-bold"
                                                        style={{ color: task.listColor }}
                                                    >
                                                        {task.listName}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                                    {format(parseISO(task.completedAt), 'h:mm a')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right flex items-center gap-2">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-tight">Time Taken</span>
                                            <span className="text-xs font-bold font-mono text-emerald-400">
                                                {task.totalDurationFormatted}
                                            </span>
                                        </div>
                                        <Clock size={14} className="text-[var(--text-muted)] opacity-50" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
