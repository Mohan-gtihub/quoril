import { format } from 'date-fns'
import { cn } from '@/utils/helpers'
import { Flame } from 'lucide-react'

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
        <div className="bg-[#111111] border border-white/[0.05] rounded-2xl p-6 flex flex-col justify-between group hover:border-white/10 transition-colors h-full relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)]/5 blur-[50px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">{title}</h3>
                    <div className="flex items-end gap-1.5">
                        <span className="text-4xl font-black text-white tracking-tighter leading-none">
                            {streak}
                        </span>
                        <span className="text-sm font-bold text-white/40 mb-1.5">day streak</span>
                    </div>
                </div>
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                    streak > 0
                        ? "bg-orange-500/10 border-orange-500/20 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                        : "bg-white/5 border-white/5 text-white/20"
                )}>
                    <Flame size={20} className={cn(streak > 0 && "fill-orange-500 animate-pulse")} />
                </div>
            </div>

            {/* Mini Heatmap / Grid */}
            <div className="mt-8 relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Recent Activity</span>
                    <span className="text-[10px] font-bold text-white/60 font-mono">{consistencyScore}% Consistency</span>
                </div>

                <div className="flex gap-1.5 overflow-hidden">
                    {dates.slice(-14).map((d, i) => ( // Show last 14 days max for this condensed view
                        <div
                            key={i}
                            className={cn(
                                "flex-1 h-8 rounded-md transition-all duration-500",
                                d.goalMet
                                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                    : d.minutes > 0
                                        ? "bg-emerald-500/20"
                                        : "bg-white/5"
                            )}
                            title={`${format(d.date, 'MMM d')}: ${d.minutes}m`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
