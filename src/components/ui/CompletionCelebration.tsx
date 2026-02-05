import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { CheckCircle2, Trophy, Zap } from 'lucide-react'
import { soundService } from '@/services/soundService'
import { useSettingsStore } from '@/store/settingsStore'

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

const GIFS = [
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJmZGR3ZGR6ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/kyLYXonQpkUsmsLKM9/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJmZGR3ZGR6ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKVUn7iM8FMEU24/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJmZGR3ZGR6ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5ZGR5JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l3q2XhfQ8oCkm1Ts4/giphy.gif"
]

export function CompletionCelebration({ taskTitle, timeSpent, onClose }: CompletionCelebrationProps) {
    const settings = useSettingsStore()
    const [gifUrl] = useState(() => GIFS[Math.floor(Math.random() * GIFS.length)])

    useEffect(() => {
        // Play success sound
        if (settings.successSoundEnabled) {
            soundService.playSuccess(settings.successSound)
        }

        // Fire confetti on mount
        const duration = 3000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min
        }

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now()
            if (timeLeft <= 0) return clearInterval(interval)
            const particleCount = 50 * (timeLeft / duration)

            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
        }, 250)

        // Increased auto-close for GIF enjoyment
        const closeTimer = setTimeout(() => onClose(), 5000)

        return () => {
            clearInterval(interval)
            clearTimeout(closeTimer)
        }
    }, [onClose, settings.successSoundEnabled, settings.successSound])

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
            className="fixed inset-0 flex items-center justify-center z-[9998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-[#12141c] border border-green-500/20 rounded-[32px] p-8 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(34,197,94,0.1)] transform animate-in zoom-in duration-500 overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-green-500/10 rounded-full blur-[60px]" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-[60px]" />

                {/* Gif Reveal */}
                {settings.funGifEnabled && (
                    <div className="w-full h-40 mb-6 rounded-2xl overflow-hidden border border-white/5 bg-black/20">
                        <img src={gifUrl} alt="Celebration" className="w-full h-full object-cover opacity-80" />
                    </div>
                )}

                {!settings.funGifEnabled && (
                    <div className="flex justify-center mb-6">
                        <div className="bg-green-500/10 p-5 rounded-full ring-1 ring-green-500/20">
                            <Trophy className="w-12 h-12 text-green-500" />
                        </div>
                    </div>
                )}

                <h2 className="text-3xl font-black text-white text-center mb-2 uppercase tracking-tighter">
                    {randomMessage}
                </h2>

                <p className="text-white/40 text-center text-sm mb-8 font-bold uppercase tracking-[0.2em] line-clamp-1">
                    {taskTitle}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <Zap className="w-5 h-5 text-amber-500 mb-1" />
                        <span className="text-white font-black text-lg tabular-nums">{formatTime(timeSpent)}</span>
                        <span className="text-[10px] text-white/30 uppercase font-bold">Invested</span>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500 mb-1" />
                        <span className="text-white font-black text-lg uppercase tabular-nums">1.0</span>
                        <span className="text-[10px] text-white/30 uppercase font-bold">Fulfill Score</span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-gray-200 transition-all active:scale-95"
                >Continue Sequence</button>
            </div>
        </div>
    )
}
