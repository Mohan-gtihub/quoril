import { usePlannerStore } from '@/store/plannerStore'
import { format, isSameDay, startOfToday } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'

export function DateNavigator() {
    const { selectedDate, setSelectedDate, goToToday, goToNextDay, goToPrevDay } = usePlannerStore()
    const inputRef = useRef<HTMLInputElement>(null)
    const today = startOfToday()
    const isToday = isSameDay(selectedDate, today)

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setSelectedDate(new Date(e.target.value))
        }
    }

    return (
        <div className="flex items-center gap-4 select-none">
            {/* Date Display */}
            <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-none tracking-tight">
                    {isToday ? 'Today' : format(selectedDate, 'EEEE')}
                </h2>
                <p className="text-xs font-medium text-[var(--text-tertiary)] tabular-nums mt-1">
                    {format(selectedDate, 'MMM d, yyyy')}
                </p>
            </div>

            {/* Chevron Navigation pill */}
            <div className="flex items-center gap-1 bg-[var(--bg-hover)] p-1 rounded-full border border-[var(--border-default)]">
                <button
                    onClick={goToPrevDay}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors active:scale-95"
                >
                    <ChevronLeft size={15} />
                </button>

                <button
                    onClick={() => inputRef.current?.showPicker()}
                    className="flex items-center gap-2 px-3 h-7 rounded-full cursor-pointer group hover:bg-[var(--bg-card)] transition-colors"
                >
                    <CalendarIcon size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                    <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
                        {format(selectedDate, 'MMM yyyy')}
                    </span>
                    <input
                        ref={inputRef}
                        type="date"
                        className="fixed opacity-0 pointer-events-none"
                        onChange={handleDateChange}
                        value={format(selectedDate, 'yyyy-MM-dd')}
                    />
                </button>

                <button
                    onClick={goToNextDay}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors active:scale-95"
                >
                    <ChevronRight size={15} />
                </button>
            </div>

            {!isToday && (
                <button
                    onClick={goToToday}
                    className="px-3 py-1.5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:brightness-105 active:scale-95 transition-all"
                >
                    Jump to today
                </button>
            )}
        </div>
    )
}
