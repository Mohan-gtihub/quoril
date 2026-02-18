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
        <div className="bg-[#111111] border border-white/[0.05] rounded-3xl p-8 min-h-[400px]">
            <div className="h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {timelineData.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl text-center">
                        <p className="text-xs text-white/30">No sessions recorded in this period.</p>
                    </div>
                )}

                {timelineData.map(({ date, items }) => (
                    <div key={date} className="relative pl-6 border-l border-white/5 space-y-4 mb-8">
                        <span className="absolute -left-[3px] top-0 w-1.5 h-1.5 rounded-full bg-white/20"></span>
                        <h4 className="text-xs font-bold text-white/60">{format(parseISO(date), 'EEEE, MMM do')}</h4>

                        <div className="space-y-2">
                            {items.map((s, idx) => {
                                const task = activeTasks.find(t => t.id === s.task_id)
                                const isBreak = s.type === 'break'
                                const isLive = s.id === 'live-session'

                                return (
                                    <div key={s.id || idx} className={cn(
                                        "flex items-center justify-between border p-3 rounded-xl transition-all group relative overflow-hidden",
                                        isLive ? "bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]" : "bg-[#0A0A0A] border-white/[0.03] hover:border-white/10"
                                    )}>
                                        {isLive && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent animate-[pulse_3s_linear_infinite]" />
                                        )}

                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={cn(
                                                "w-1.5 h-8 rounded-full",
                                                isLive ? "bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" :
                                                    isBreak ? "bg-emerald-500/50" : "bg-indigo-500/50"
                                            )} />
                                            <div>
                                                <p className={cn(
                                                    "text-xs font-bold truncate max-w-[180px]",
                                                    isLive ? "text-white" : isBreak ? "text-emerald-300" : "text-indigo-300"
                                                )}>
                                                    {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping mr-2"></span>}
                                                    {isBreak ? 'Break' : ((s as any).title || task?.title || 'Unknown Task')}
                                                </p>
                                                <p className="text-[10px] text-white/30 font-mono mt-0.5 uppercase tracking-tighter">
                                                    {isLive ? 'Active Uplink' : `${format(parseISO(s.rawStartTime), 'HH:mm')} • ${s.type}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <span className={cn(
                                                "text-xs font-bold font-mono",
                                                isLive ? "text-indigo-400" : "text-white/80"
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


