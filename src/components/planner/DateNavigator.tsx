import { usePlannerStore } from '@/store/plannerStore'
import { format, isSameDay, startOfToday } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'

export function DateNavigator() {
    const { selectedDate, setSelectedDate, goToToday, goToNextDay, goToPrevDay } = usePlannerStore()
    const inputRef = useRef<HTMLInputElement>(null)
    const today = startOfToday()

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setSelectedDate(new Date(e.target.value))
        }
    }

    return (
        <div className="flex items-center gap-6 select-none">
            {/* Legend / Date Display */}
            <div className="flex flex-col">
                <h2 className="text-sm font-black text-[var(--text-primary)] leading-none tracking-tight">
                    {isSameDay(selectedDate, today) ? 'Today' : format(selectedDate, 'EEEE')}
                </h2>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                    {format(selectedDate, 'MMM d, yyyy')}
                </p>
            </div>

            {/* Simple Chevron Navigation */}
            <div className="flex items-center gap-3 bg-[var(--bg-hover)] p-1 rounded-lg border border-[var(--border-default)]">
                <button
                    onClick={goToPrevDay}
                    className="p-1 px-2 hover:text-[var(--text-primary)] text-[var(--text-tertiary)] transition-colors rounded-md hover:bg-[var(--bg-tertiary)]"
                >
                    <ChevronLeft size={14} />
                </button>

                <div
                    onClick={() => inputRef.current?.showPicker()}
                    className="flex items-center gap-2 px-2 cursor-pointer group"
                >
                    <CalendarIcon size={12} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                    <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                        {format(selectedDate, 'MMM yyyy')}
                    </span>
                    <input
                        ref={inputRef}
                        type="date"
                        className="fixed opacity-0 pointer-events-none"
                        onChange={handleDateChange}
                        value={format(selectedDate, 'yyyy-MM-dd')}
                    />
                </div>

                <button
                    onClick={goToNextDay}
                    className="p-1 px-2 hover:text-[var(--text-primary)] text-[var(--text-tertiary)] transition-colors rounded-md hover:bg-[var(--bg-tertiary)]"
                >
                    <ChevronRight size={14} />
                </button>
            </div>

            {!isSameDay(selectedDate, today) && (
                <button
                    onClick={goToToday}
                    className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] hover:text-white transition-colors"
                >
                    Jump Today
                </button>
            )}
        </div>
    )
}
