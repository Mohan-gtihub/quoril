import { useMemo } from 'react'
import { cn } from '@/utils/helpers'

interface DailyGoalRingProps {
    currentMinutes: number
    goalMinutes: number
    size?: number
    strokeWidth?: number
}

export function DailyGoalRing({
    currentMinutes,
    goalMinutes,
    size = 140,
    strokeWidth = 10
}: DailyGoalRingProps) {
    const percentage = Math.min(100, Math.max(0, (currentMinutes / goalMinutes) * 100))
    const isCompleted = percentage >= 100

    // SVG Calc
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (percentage / 100) * circumference

    const timeLabel = useMemo(() => {
        const h = Math.floor(currentMinutes / 60)
        const m = currentMinutes % 60
        return `${h}h ${m}m`
    }, [currentMinutes])

    const goalLabel = useMemo(() => {
        const h = Math.floor(goalMinutes / 60)
        const m = goalMinutes % 60
        return `/ ${h}h ${m > 0 ? `${m}m` : ''}`
    }, [goalMinutes])

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Glow / Background Effect */}
            {isCompleted && (
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
            )}

            <svg width={size} height={size} className="transform -rotate-90 relative z-10">
                {/* Background Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-white/5"
                />

                {/* Progress Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={isCompleted ? '#10b981' : '#6366f1'}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={cn(
                        "transition-all duration-1000 ease-out",
                        isCompleted ? "drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                    )}
                />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span className={cn(
                    "text-2xl font-black tracking-tighter",
                    isCompleted ? "text-emerald-400" : "text-white"
                )}>
                    {timeLabel}
                </span>
                <span className="text-xs font-bold text-white/30 uppercase tracking-wider mt-0.5">
                    {goalLabel}
                </span>
                {isCompleted && (
                    <span className="absolute -bottom-8 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded border border-emerald-500/20 animate-in fade-in slide-in-from-bottom-2">
                        Goal Met!
                    </span>
                )}
            </div>
        </div>
    )
}
