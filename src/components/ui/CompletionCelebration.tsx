import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { CheckCircle2, Trophy, Zap } from 'lucide-react'

interface CompletionCelebrationProps {
    taskTitle: string
    timeSpent: number // in seconds
    onClose: () => void
}

const CELEBRATION_MESSAGES = [
    "🎉 Awesome work!",
    "💪 Crushed it!",
    "🚀 Task conquered!",
    "⭐ You're on fire!",
    "🎯 Nailed it!",
    "✨ Fantastic!",
    "🔥 Keep it up!",
    "🏆 Victory!",
]

export function CompletionCelebration({ taskTitle, timeSpent, onClose }: CompletionCelebrationProps) {
    useEffect(() => {
        // Fire confetti on mount
        const duration = 3000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min
        }

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
                return clearInterval(interval)
            }

            const particleCount = 50 * (timeLeft / duration)

            // Confetti from left
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            })

            // Confetti from right
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            })
        }, 250)

        // Auto-close after 3 seconds
        const closeTimer = setTimeout(() => {
            onClose()
        }, 3000)

        return () => {
            clearInterval(interval)
            clearTimeout(closeTimer)
        }
    }, [onClose])

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60

        if (h > 0) return `${h}h ${m}m`
        if (m > 0) return `${m}m ${s}s`
        return `${s}s`
    }

    const randomMessage = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)]

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-[9998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-12 max-w-md w-full mx-4 shadow-2xl transform animate-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-white/30 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative bg-white rounded-full p-6">
                            <Trophy className="w-16 h-16 text-green-600" />
                        </div>
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-4xl font-bold text-white text-center mb-3 animate-in slide-in-from-bottom-4 duration-500">
                    {randomMessage}
                </h2>

                {/* Task Title */}
                <p className="text-white/90 text-center text-lg mb-6 font-medium line-clamp-2">
                    {taskTitle}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 mb-8">
                    <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                        <Zap className="w-5 h-5 text-yellow-300" />
                        <span className="text-white font-bold">{formatTime(timeSpent)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <span className="text-white font-bold">Done!</span>
                    </div>
                </div>

                {/* Close hint */}
                <p className="text-white/60 text-center text-sm">
                    Click anywhere to continue
                </p>
            </div>
        </div>
    )
}
