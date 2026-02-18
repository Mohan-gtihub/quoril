import { TrendingUp, Clock, Zap } from 'lucide-react'
import { DailyGoalRing } from './DailyGoalRing'
import { HabitConsistencyCard } from './HabitConsistencyCard'
import type { ComprehensiveReportStats as ReportStats } from '../types/reports.types'



interface StatsOverviewProps {
    stats: ReportStats
    dailyFocusGoalMinutes: number
}

export function StatsOverview({ stats, dailyFocusGoalMinutes }: StatsOverviewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* 1. Daily Goal Ring (Top Left) */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-[#111111] border border-white/[0.05] rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="flex flex-col items-center justify-center h-full gap-4 relative z-10">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">Daily Focus Goal</h3>
                    <DailyGoalRing
                        currentMinutes={stats.focusTime.totalMinutesToday}
                        goalMinutes={dailyFocusGoalMinutes}
                        size={160}
                    />
                    <div className="text-center">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Today's Progress</p>
                    </div>
                </div>
            </div>

            {/* 2. Habit & Streak (Top Middle) */}
            <div className="col-span-12 md:col-span-8 lg:col-span-5">
                <HabitConsistencyCard
                    streak={stats.currentStreak}
                    consistencyScore={stats.rangeConsistency}
                    dates={stats.chartData.map(d => ({ date: d.date, minutes: d.focusMinutes, goalMet: d.goalMet }))}
                />
            </div>

            {/* 3. Key Metrics & Daily Summary (Right Column) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-full">

                {/* Completed Tasks Card */}
                <div className="bg-[#111111] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-between group hover:border-white/10 transition-colors flex-1 min-h-[140px]">
                    <div className="flex items-start justify-between">
                        <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Zap size={12} className="fill-emerald-400" /> Completed
                        </h4>
                        <div className="text-3xl font-bold text-white font-mono">
                            {stats.taskCompletion.completedToday}
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <p className="text-xs text-white/40 font-medium">
                            {stats.taskCompletion.completedToday > 0
                                ? `You crushed ${stats.taskCompletion.completedToday} tasks today. Strong pace.`
                                : "No tasks finished yet. Pick one and start."}
                        </p>
                    </div>
                </div>

                {/* Efficiency & Total Focus Grid */}
                <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-[#111111] border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-indigo-400">
                            <TrendingUp size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Efficiency</span>
                        </div>
                        <div className="text-2xl font-bold text-white font-mono">{stats.efficiencyScore}%</div>
                    </div>

                    <div className="bg-[#111111] border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-amber-400">
                            <Clock size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Focus</span>
                        </div>
                        <div className="text-xl font-bold text-white font-mono truncate" title={stats.totalFocusDisplay}>
                            {stats.totalFocusDisplay}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
