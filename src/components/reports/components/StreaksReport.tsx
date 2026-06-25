import { motion } from 'framer-motion'
import type { StreakStats } from '../types/reports.types'

interface StreaksReportProps {
    stats: StreakStats
}

export function StreaksReport({ stats }: StreaksReportProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                Streaks &amp; Consistency
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Daily Focus Streak */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                        Daily Focus Streak
                    </h3>

                    <div className="flex items-baseline gap-2 mb-2">
                        <div className="text-5xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
                            {stats.dailyFocusStreak}
                        </div>
                        <div className="text-base font-medium text-[var(--text-tertiary)]">
                            {stats.dailyFocusStreak === 1 ? 'day' : 'days'}
                        </div>
                    </div>

                    <p className="text-xs text-[var(--text-muted)]">
                        Consecutive days with focus sessions
                    </p>

                    {/* Streak visualization */}
                    <div className="mt-6 flex gap-1.5">
                        {Array.from({ length: Math.min(stats.dailyFocusStreak, 30) }, (_, i) => (
                            <motion.div
                                key={i}
                                className="h-2 flex-1 rounded-full bg-[var(--accent-primary)]"
                                initial={{ opacity: 0, scaleY: 0.4 }}
                                animate={{ opacity: Math.max(0.3, 1 - (i * 0.02)), scaleY: 1 }}
                                transition={{ duration: 0.3, delay: i * 0.02 }}
                            />
                        ))}
                    </div>

                    {stats.dailyFocusStreak > 30 && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center font-medium tabular-nums">
                            +{stats.dailyFocusStreak - 30} more days
                        </p>
                    )}
                </div>

                {/* Daily Task Completion Streak */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                        Task Completion Streak
                    </h3>

                    <div className="flex items-baseline gap-2 mb-2">
                        <div className="text-5xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
                            {stats.dailyCompletionStreak}
                        </div>
                        <div className="text-base font-medium text-[var(--text-tertiary)]">
                            {stats.dailyCompletionStreak === 1 ? 'day' : 'days'}
                        </div>
                    </div>

                    <p className="text-xs text-[var(--text-muted)]">
                        Consecutive days completing tasks
                    </p>

                    {/* Streak visualization */}
                    <div className="mt-6 flex gap-1.5">
                        {Array.from({ length: Math.min(stats.dailyCompletionStreak, 30) }, (_, i) => (
                            <motion.div
                                key={i}
                                className="h-2 flex-1 rounded-full bg-[var(--accent-primary)]"
                                initial={{ opacity: 0, scaleY: 0.4 }}
                                animate={{ opacity: Math.max(0.3, 1 - (i * 0.02)), scaleY: 1 }}
                                transition={{ duration: 0.3, delay: i * 0.02 }}
                            />
                        ))}
                    </div>

                    {stats.dailyCompletionStreak > 30 && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center font-medium tabular-nums">
                            +{stats.dailyCompletionStreak - 30} more days
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
