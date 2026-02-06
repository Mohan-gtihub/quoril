import { TrendingUp, Clock, Zap } from 'lucide-react'
import { DailyGoalRing } from './DailyGoalRing'
import { HabitConsistencyCard } from './HabitConsistencyCard'
import type { ReportStats } from '../types/reports.types'

interface SimpleStatCardProps {
    title: string
    value: string | number
    icon?: React.ReactNode
    trend?: string
}

function SimpleStatCard({ title, value, icon }: SimpleStatCardProps) {
    return (
        <div className="bg-[#111111] border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors group">
            <div className="flex items-start justify-between mb-2">
                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{title}</h4>
                {icon && <div className="text-white/20 group-hover:text-white/40 transition-colors">{icon}</div>}
            </div>
            <div className="text-xl font-bold text-white font-mono tracking-tight">{value}</div>
        </div>
    )
}

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
                        currentMinutes={stats.minutesToday}
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

            {/* 3. Key Metrics (Top Right) */}
            <div className="col-span-12 lg:col-span-4 grid grid-rows-3 gap-4 h-full">
                <div className="bg-[#111111] border border-white/[0.05] rounded-2xl p-5 flex items-center justify-between relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
                    <div>
                        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <TrendingUp size={12} /> Efficiency
                        </h4>
                        <div className="text-3xl font-bold text-white font-mono">{stats.efficiencyScore}%</div>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                        <span className="text-xs text-white/30 font-bold">%</span>
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle
                                cx="32" cy="32" r="28"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                className="text-indigo-500"
                                strokeDasharray={`${2 * Math.PI * 28}`}
                                strokeDashoffset={`${2 * Math.PI * 28 * (1 - stats.efficiencyScore / 100)}`}
                            />
                        </svg>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 row-span-2">
                    <SimpleStatCard
                        title="Total Focus"
                        value={stats.totalFocusDisplay}
                        icon={<Zap size={14} />}
                    />
                    <SimpleStatCard
                        title="Total Break"
                        value={stats.totalBreakDisplay}
                        icon={<Clock size={14} />}
                    />
                </div>
            </div>
        </div>
    )
}
