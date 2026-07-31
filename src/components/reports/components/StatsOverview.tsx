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
            <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-6">
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <h3 className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Daily Focus Goal</h3>
                    <DailyGoalRing
                        currentMinutes={stats.focusTime.totalMinutesToday}
                        goalMinutes={dailyFocusGoalMinutes}
                        size={160}
                    />
                    <div className="text-center">
                        <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide font-medium">Today's Progress</p>
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
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5 flex flex-col justify-between flex-1 min-h-[140px]">
                    <div className="flex items-start justify-between">
                        <h4 className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">
                            Completed
                        </h4>
                        <div className="text-3xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
                            {stats.taskCompletion.completedToday}
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="w-full bg-[var(--bg-hover)] h-1.5 rounded-full overflow-hidden mb-2">
                            <div
                            className="h-full bg-[var(--accent-primary)] rounded-full"
                            style={{
                                width: `${Math.min(100, Math.max(0, stats.taskCompletion.completionRatePercent))}%`,
                            }}
                        ></div>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] font-medium">
                            {stats.taskCompletion.completedToday > 0
                                ? `You crushed ${stats.taskCompletion.completedToday} tasks today. Strong pace.`
                                : "No tasks finished yet. Pick one and start."}
                        </p>
                    </div>
                </div>

                {/* Efficiency & Total Focus Grid */}
                <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-[var(--radius-tile)] p-4 flex flex-col justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wide opacity-80 mb-2">Efficiency</span>
                        <div className="text-2xl font-semibold tabular-nums tracking-tight">{stats.efficiencyScore}%</div>
                    </div>

                    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-4 flex flex-col justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">Focus</span>
                        <div className="text-xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight truncate" title={stats.totalFocusDisplay}>
                            {stats.totalFocusDisplay}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
