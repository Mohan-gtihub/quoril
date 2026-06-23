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
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-8 min-h-[400px]">
            <div className="h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {timelineData.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-[var(--border-default)] rounded-2xl text-center">
                        <p className="text-xs text-[var(--text-muted)]">No sessions recorded in this period.</p>
                    </div>
                )}

                {timelineData.map(({ date, items }) => (
                    <div key={date} className="relative pl-6 border-l border-[var(--border-default)] space-y-4 mb-8">
                        <span className="absolute -left-[3px] top-0 w-1.5 h-1.5 rounded-full bg-[var(--bg-tertiary)] ring-2 ring-[var(--bg-primary)]"></span>
                        <h4 className="text-xs font-bold text-[var(--text-secondary)]">{format(parseISO(date), 'EEEE, MMM do')}</h4>

                        <div className="space-y-2">
                            {items.map((s, idx) => {
                                const task = activeTasks.find(t => t.id === s.task_id)
                                const isBreak = s.type === 'break'
                                const isLive = s.id === 'live-session'

                                return (
                                    <div key={s.id || idx} className={cn(
                                        "flex items-center justify-between border p-3 rounded-xl group relative overflow-hidden",
                                        isLive ? "bg-[var(--accent-lime-100)] border-[var(--accent-primary)]/40" : "bg-[var(--bg-card)] border-[var(--border-default)]"
                                    )}>
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={cn(
                                                "w-1.5 h-8 rounded-full",
                                                isLive ? "bg-[var(--accent-primary)] animate-pulse" :
                                                    isBreak ? "bg-emerald-500/50" : "bg-[var(--accent-primary)]/50"
                                            )} />
                                            <div>
                                                <p className={cn(
                                                    "text-xs font-bold truncate max-w-[180px]",
                                                    isLive ? "text-[var(--text-primary)]" : isBreak ? "text-emerald-500 dark:text-emerald-300" : "text-[var(--accent-primary)]"
                                                )}>
                                                    {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-ping mr-2"></span>}
                                                    {isBreak ? 'Break' : ((s as any).title || task?.title || 'Unknown Task')}
                                                </p>
                                                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 uppercase tracking-tighter">
                                                    {isLive ? 'Active Uplink' : `${format(parseISO(s.rawStartTime), 'HH:mm')} • ${s.type}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <span className={cn(
                                                "text-xs font-bold font-mono",
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


