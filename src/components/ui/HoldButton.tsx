
import { useState, useRef } from 'react'

interface HoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onTrigger: () => void
    duration?: number // ms
    fillClassName?: string
    children: React.ReactNode
}

export function HoldButton({ onTrigger, duration = 1000, fillClassName = "bg-white/20", children, className, ...props }: HoldButtonProps) {
    const [isHolding, setIsHolding] = useState(false)
    const [progress, setProgress] = useState(0)
    const startTimeRef = useRef<number | null>(null)
    const animationFrameRef = useRef<number | null>(null)

    const startHold = () => {
        setIsHolding(true)
        startTimeRef.current = Date.now()

        const animate = () => {
            const now = Date.now()
            const elapsed = now - (startTimeRef.current || now)
            const p = Math.min(100, (elapsed / duration) * 100)

            setProgress(p)

            if (p < 100) {
                animationFrameRef.current = requestAnimationFrame(animate)
            } else {
                onTrigger()
                resetHold()
            }
        }
        animationFrameRef.current = requestAnimationFrame(animate)
    }

    const resetHold = () => {
        setIsHolding(false)
        setProgress(0)
        startTimeRef.current = null
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }

    return (
        <button
            onMouseDown={startHold}
            onMouseUp={resetHold}
            onMouseLeave={resetHold}
            onTouchStart={startHold}
            onTouchEnd={resetHold}
            className={`relative overflow-hidden select-none active:scale-95 transition-transform ${className}`}
            data-holding={isHolding}
            {...props}
        >
            {/* Progress Fill Background */}
            <div
                className={`absolute inset-y-0 left-0 transition-all duration-75 ease-linear pointer-events-none ${fillClassName}`}
                style={{ width: `${progress}%` }}
            />
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
        </button>
    )
}
