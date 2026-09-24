import { useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCalendarStore } from '@/store/calendarStore'
import { EventEditor } from './EventEditor'
import { DayTimeline } from './DayTimeline'

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

export function CalendarScreen() {
    const selectedDate = useCalendarStore((s) => s.selectedDate)
    const editingId = useCalendarStore((s) => s.editingId)
    const events = useCalendarStore((s) => s.events)
    const goToToday = useCalendarStore((s) => s.goToToday)
    const prevDay = useCalendarStore((s) => s.prevDay)
    const nextDay = useCalendarStore((s) => s.nextDay)
    const openEditor = useCalendarStore((s) => s.openEditor)
    const closeEditor = useCalendarStore((s) => s.closeEditor)

    // Load today on mount.
    useEffect(() => {
        void goToToday()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const showingToday = isSameDay(new Date(), selectedDate)

    const dateLabel = useMemo(
        () =>
            selectedDate.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
            }),
        [selectedDate],
    )

    // Resolve the event under edit. '__new__' → create (null event).
    const editingEvent = useMemo(() => {
        if (!editingId) return undefined
        if (editingId === '__new__') return null
        return events.find((e) => e.id === editingId) ?? null
    }, [editingId, events])

    return (
        <div className="flex flex-col h-full px-8 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
                        Calendar
                    </h1>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{dateLabel}</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Date navigator */}
                    <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-1">
                        <button
                            onClick={() => void prevDay()}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                            aria-label="Previous day"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => void goToToday()}
                            disabled={showingToday}
                            className="px-3 h-8 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => void nextDay()}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                            aria-label="Next day"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => openEditor(null)}
                        className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-[13px] font-bold hover:brightness-110 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        New event
                    </button>
                </div>
            </div>

            {/* Timeline */}
            <DayTimeline />

            {/* Editor */}
            {editingEvent !== undefined && (
                <EventEditor event={editingEvent} onClose={closeEditor} />
            )}
        </div>
    )
}
