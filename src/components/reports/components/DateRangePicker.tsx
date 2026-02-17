import { useState, useRef, useEffect } from 'react'
import { format, subDays, startOfMonth, endOfMonth, startOfToday, endOfToday, endOfDay } from 'date-fns'
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/utils/helpers'

export type DateRange = {
    start: Date
    end: Date
    label: string
}

interface DateRangePickerProps {
    value: DateRange
    onChange: (range: DateRange) => void
}

const PRESETS = [
    { label: 'Today', getValue: () => ({ start: startOfToday(), end: endOfToday() }) },
    { label: 'Yesterday', getValue: () => ({ start: subDays(startOfToday(), 1), end: endOfDay(subDays(startOfToday(), 1)) }) },
    { label: 'Last 7 Days', getValue: () => ({ start: subDays(startOfToday(), 6), end: endOfToday() }) },
    { label: 'Last 30 Days', getValue: () => ({ start: subDays(startOfToday(), 29), end: endOfToday() }) },
    { label: 'This Month', getValue: () => ({ start: startOfMonth(startOfToday()), end: endOfMonth(startOfToday()) }) },
]

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-xl transition-all group shadow-sm hover:shadow-md active:scale-95"
            >
                <div className="p-1.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors">
                    <CalendarIcon size={14} />
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-0.5">
                        Period
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)] leading-none">
                        {value.label === 'Custom'
                            ? `${format(value.start, 'MMM d')} - ${format(value.end, 'MMM d')}`
                            : value.label
                        }
                    </span>
                </div>
                <ChevronDown
                    size={14}
                    className={cn(
                        "text-[var(--text-tertiary)] transition-transform duration-300 ml-2",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1.5 space-y-0.5">
                        {PRESETS.map((preset) => {
                            const isSelected = value.label === preset.label
                            return (
                                <button
                                    key={preset.label}
                                    onClick={() => {
                                        const range = preset.getValue()
                                        onChange({ ...range, label: preset.label })
                                        setIsOpen(false)
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all",
                                        isSelected
                                            ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold"
                                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                                    )}
                                >
                                    {preset.label}
                                    {isSelected && <Check size={14} />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
