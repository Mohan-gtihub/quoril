import { format, parseISO } from 'date-fns'
import { cn } from '@/utils/helpers'
import { TimelineGroup } from '../types/reports.types'
import { Task } from '@/types/database'

interface SessionLogProps {
    timelineData: TimelineGroup[]
    activeTasks: Task[]
}

export function SessionLog({ timelineData, activeTasks }: SessionLogProps) {
    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5 min-h-[400px]">
            <div className="h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {timelineData.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-[var(--border-default)] rounded-2xl text-center">
                        <p className="text-xs text-[var(--text-muted)]">No sessions recorded in this period.</p>
                    </div>
                )}

                {timelineData.map(({ date, items }) => (
                    <div key={date} className="relative pl-6 border-l border-[var(--border-default)] space-y-4 mb-8">
                        <span className="absolute -left-[3px] top-0 w-1.5 h-1.5 rounded-full bg-[var(--bg-tertiary)] ring-2 ring-[var(--bg-primary)]"></span>
                        <h4 className="text-xs font-semibold text-[var(--text-secondary)]">{format(parseISO(date), 'EEEE, MMM do')}</h4>

                        <div className="space-y-0.5">
                            {items.map((s, idx) => {
                                const task = activeTasks.find(t => t.id === s.task_id)
                                const isBreak = s.type === 'break'
                                const isLive = s.id === 'live-session'

                                return (
                                    <div key={s.id || idx} className={cn(
                                        "flex items-center justify-between p-2.5 rounded-[var(--radius-tile)] group relative transition-colors",
                                        isLive ? "bg-[var(--accent-primary)]/10" : "hover:bg-[var(--bg-hover)]"
                                    )}>
                                        <div className="flex items-center gap-3 relative z-10 min-w-0">
                                            <div className={cn(
                                                "w-1 h-8 rounded-full flex-shrink-0",
                                                isLive ? "bg-[var(--accent-primary)] animate-pulse" :
                                                    isBreak ? "bg-[var(--text-muted)]/40" : "bg-[var(--text-tertiary)]/50"
                                            )} />
                                            <div className="min-w-0">
                                                <p className={cn(
                                                    "text-xs font-semibold truncate max-w-[180px]",
                                                    isLive ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
                                                )}>
                                                    {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-ping mr-2"></span>}
                                                    {isBreak ? 'Break' : ((s as any).title || task?.title || 'Unknown Task')}
                                                </p>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wide tabular-nums">
                                                    {isLive ? 'Active' : `${format(parseISO(s.rawStartTime), 'HH:mm')} • ${s.type}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <span className={cn(
                                                "text-xs font-semibold tabular-nums",
                                                isLive ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)]"
                                            )}>
                                                {s.duration}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}


