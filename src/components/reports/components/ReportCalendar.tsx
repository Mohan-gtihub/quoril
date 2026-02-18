import { useState } from 'react'
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface ReportCalendarProps {
    selectedDate: Date | null
    onSelectDate: (date: Date) => void
    onSelectMonth: (date: Date) => void
    selectionType: 'day' | 'month'
}

export function ReportCalendar({ selectedDate, onSelectDate, onSelectMonth, selectionType }: ReportCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth))
    })

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

    return (
        <div className="glass-panel rounded-2xl p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <CalendarIcon size={18} />
                    </div>
                    <span className="font-bold text-[var(--text-primary)] text-sm">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={handlePrevMonth}
                        className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((day, i) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate) && selectionType === 'day'
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isTodayDate = isToday(day)

                    return (
                        <button
                            key={i}
                            onClick={() => onSelectDate(day)}
                            className={`
                                h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all relative
                                ${!isCurrentMonth ? 'text-[var(--text-muted)] opacity-50' : 'text-[var(--text-secondary)]'}
                                ${isSelected
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 z-10 scale-110 font-bold'
                                    : 'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                                }
                                ${isTodayDate && !isSelected ? 'text-indigo-400 font-bold border border-indigo-500/30' : ''}
                            `}
                        >
                            {format(day, 'd')}
                            {isTodayDate && (
                                <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Month Report Button */}
            <div className="mt-6 pt-4 border-t border-white/5">
                <button
                    onClick={() => onSelectMonth(currentMonth)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all
                        ${selectionType === 'month' && isSameMonth(currentMonth, selectedDate || new Date())
                            ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-lg'
                            : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                        }
                    `}
                >
                    View Monthly Report
                </button>
            </div>
        </div>
    )
}
