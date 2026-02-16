import { Clock, Zap, Target, TrendingUp } from 'lucide-react'
import type { FocusTimeStats } from '../types/reports.types'

interface FocusTimeReportProps {
    stats: FocusTimeStats
}

export function FocusTimeReport({ stats }: FocusTimeReportProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/60 flex items-center gap-3">
                <Zap className="w-4 h-4" />
                Focus Time Analytics
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xs font-bold text-white/40 uppercase">Today</h3>
                        <Clock className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    </div>
                    <div className="text-3xl font-black text-white font-mono">
                        {Math.floor(stats.totalMinutesToday / 60)}h {stats.totalMinutesToday % 60}m
                    </div>
                    <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">Total Focus</p>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xs font-bold text-white/40 uppercase">This Week</h3>
                        <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                    </div>
                    <div className="text-3xl font-black text-white font-mono">
                        {Math.floor(stats.totalMinutesWeek / 60)}h {stats.totalMinutesWeek % 60}m
                    </div>
                    <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">Weekly Total</p>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-purple-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xs font-bold text-white/40 uppercase">Deep Work</h3>
                        <Target className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    </div>
                    <div className="text-3xl font-black text-white font-mono">
                        {stats.deepWorkSessionsCount}
                    </div>
                    <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">Sessions (25+ min)</p>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-amber-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xs font-bold text-white/40 uppercase">Active Tasks</h3>
                        <Zap className="w-4 h-4 text-amber-400 group-hover:text-amber-300 transition-colors" />
                    </div>
                    <div className="text-3xl font-black text-white font-mono">
                        {stats.focusPerTask.length}
                    </div>
                    <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">With Focus Time</p>
                </div>
            </div>

            {/* Focus Per Task */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-6">
                    Focus Time Per Task
                </h3>

                {stats.focusPerTask.length === 0 ? (
                    <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-sm text-white/30">No focus sessions recorded yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {stats.focusPerTask.map((task, index) => {
                            const maxMinutes = Math.max(...stats.focusPerTask.map(t => t.minutes))
                            const widthPercent = (task.minutes / maxMinutes) * 100

                            return (
                                <div key={task.taskId} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="text-xs font-bold text-white/30 tabular-nums w-6">
                                                #{index + 1}
                                            </span>
                                            <span className="text-sm text-white font-medium truncate">
                                                {task.taskTitle}
                                            </span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-indigo-400 ml-4 tabular-nums">
                                            {Math.floor(task.minutes / 60)}h {task.minutes % 60}m
                                        </span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 group-hover:from-indigo-400 group-hover:to-purple-400"
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
