import { Flame, Target } from 'lucide-react'
import type { StreakStats } from '../types/reports.types'

interface StreaksReportProps {
    stats: StreakStats
}

export function StreaksReport({ stats }: StreaksReportProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/60 flex items-center gap-3">
                <Flame className="w-4 h-4" />
                Streaks & Consistency
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Daily Focus Streak */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-8 hover:border-orange-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-orange-500/5 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest">
                                Daily Focus Streak
                            </h3>
                            <Flame className="w-5 h-5 text-orange-400 group-hover:text-orange-300 transition-colors" />
                        </div>

                        <div className="flex items-baseline gap-3 mb-3">
                            <div className="text-5xl font-black text-white font-mono">
                                {stats.dailyFocusStreak}
                            </div>
                            <div className="text-lg font-bold text-white/40">
                                {stats.dailyFocusStreak === 1 ? 'day' : 'days'}
                            </div>
                        </div>

                        <p className="text-xs text-white/30 uppercase tracking-wider">
                            Consecutive days with focus sessions
                        </p>

                        {/* Streak visualization */}
                        <div className="mt-6 flex gap-1.5">
                            {Array.from({ length: Math.min(stats.dailyFocusStreak, 30) }, (_, i) => (
                                <div
                                    key={i}
                                    className="h-2 flex-1 rounded-full bg-gradient-to-t from-orange-600 to-orange-400 animate-in fade-in slide-in-from-bottom-2"
                                    style={{
                                        animationDelay: `${i * 20}ms`,
                                        opacity: Math.max(0.3, 1 - (i * 0.02))
                                    }}
                                />
                            ))}
                        </div>

                        {stats.dailyFocusStreak > 30 && (
                            <p className="text-[10px] text-orange-400/60 mt-2 text-center font-bold">
                                +{stats.dailyFocusStreak - 30} more days
                            </p>
                        )}
                    </div>
                </div>

                {/* Daily Task Completion Streak */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-8 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                                Task Completion Streak
                            </h3>
                            <Target className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                        </div>

                        <div className="flex items-baseline gap-3 mb-3">
                            <div className="text-5xl font-black text-white font-mono">
                                {stats.dailyCompletionStreak}
                            </div>
                            <div className="text-lg font-bold text-white/40">
                                {stats.dailyCompletionStreak === 1 ? 'day' : 'days'}
                            </div>
                        </div>

                        <p className="text-xs text-white/30 uppercase tracking-wider">
                            Consecutive days completing tasks
                        </p>

                        {/* Streak visualization */}
                        <div className="mt-6 flex gap-1.5">
                            {Array.from({ length: Math.min(stats.dailyCompletionStreak, 30) }, (_, i) => (
                                <div
                                    key={i}
                                    className="h-2 flex-1 rounded-full bg-gradient-to-t from-emerald-600 to-emerald-400 animate-in fade-in slide-in-from-bottom-2"
                                    style={{
                                        animationDelay: `${i * 20}ms`,
                                        opacity: Math.max(0.3, 1 - (i * 0.02))
                                    }}
                                />
                            ))}
                        </div>

                        {stats.dailyCompletionStreak > 30 && (
                            <p className="text-[10px] text-emerald-400/60 mt-2 text-center font-bold">
                                +{stats.dailyCompletionStreak - 30} more days
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
