import { format } from 'date-fns'
import { cn } from '@/utils/helpers'

interface HabitConsistencyCardProps {
    dates: { date: Date; minutes: number; goalMet: boolean }[]
    streak: number
    consistencyScore: number
    title?: string
}

export function HabitConsistencyCard({
    dates,
    streak,
    consistencyScore,
    title = "Focus Habit"
}: HabitConsistencyCardProps) {

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 flex flex-col justify-between h-full">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-1">{title}</h3>
                    <div className="flex items-end gap-1.5">
                        <span className="text-4xl font-semibold text-[var(--text-primary)] tracking-tighter leading-none">
                            {streak}
                        </span>
                        <span className="text-sm font-bold text-[var(--text-tertiary)] mb-1.5">day streak</span>
                    </div>
                </div>
            </div>

            {/* Mini Heatmap / Grid */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Recent Activity</span>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] font-mono">{consistencyScore}% Consistency</span>
                </div>

                <div className="flex gap-2 justify-between">
                    {dates.slice(-7).map((d, i) => {
                        const dayLabel = format(d.date, 'EEEEEE') // 'Mo', 'Tu', etc.
                        return (
                            <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">{dayLabel}</span>
                                <div
                                    className={cn(
                                        "w-full aspect-[4/5] rounded-md",
                                        d.goalMet
                                            ? "bg-[var(--accent-primary)]"
                                            : d.minutes > 0
                                                ? "bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/20"
                                                : "bg-[var(--bg-hover)] border border-[var(--border-default)]"
                                    )}
                                    title={`${format(d.date, 'MMM d')}: ${d.minutes}m`}
                                />
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
