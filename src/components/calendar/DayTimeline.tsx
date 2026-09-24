import { useEffect, useMemo, useRef, useState } from 'react'
import { useCalendarStore } from '@/store/calendarStore'
import type { CalendarEvent } from '@/types/calendar'

const DEFAULT_START_HOUR = 6
const DEFAULT_END_HOUR = 23 // inclusive last labelled hour
const PX_PER_HOUR = 64

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

/** Minutes from local midnight for a given ISO timestamp, clamped to [0, 1440]. */
function minutesIntoDay(iso: string, day: Date): number {
    const d = new Date(iso)
    const start = new Date(day)
    start.setHours(0, 0, 0, 0)
    const mins = (d.getTime() - start.getTime()) / 60000
    return Math.max(0, Math.min(1440, mins))
}

function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function DayTimeline() {
    const events = useCalendarStore((s) => s.events)
    const selectedDate = useCalendarStore((s) => s.selectedDate)
    const openEditor = useCalendarStore((s) => s.openEditor)
    const create = useCalendarStore((s) => s.create)

    const [now, setNow] = useState(() => new Date())
    const scrollRef = useRef<HTMLDivElement>(null)

    // Tick the "now" line each minute.
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(id)
    }, [])

    const isToday = isSameDay(now, selectedDate)

    // Expand the visible hour range to include any event outside 6–23.
    const [startHour, endHour] = useMemo(() => {
        let lo = DEFAULT_START_HOUR
        let hi = DEFAULT_END_HOUR
        for (const ev of events) {
            const s = Math.floor(minutesIntoDay(ev.start_at, selectedDate) / 60)
            const e = Math.ceil(minutesIntoDay(ev.end_at, selectedDate) / 60)
            if (s < lo) lo = Math.max(0, s)
            if (e > hi) hi = Math.min(24, e)
        }
        return [lo, hi]
    }, [events, selectedDate])

    const hours = useMemo(() => {
        const arr: number[] = []
        for (let h = startHour; h <= endHour; h++) arr.push(h)
        return arr
    }, [startHour, endHour])

    const gridHeight = (endHour - startHour + 1) * PX_PER_HOUR
    const topOffsetMin = startHour * 60

    // Scroll to 8am (or the now-line) on mount / day change.
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        const target = isToday
            ? (now.getHours() - startHour) * PX_PER_HOUR - PX_PER_HOUR
            : (8 - startHour) * PX_PER_HOUR
        el.scrollTop = Math.max(0, target)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate])

    const blockFor = (ev: CalendarEvent) => {
        const startMin = minutesIntoDay(ev.start_at, selectedDate)
        const endMin = minutesIntoDay(ev.end_at, selectedDate)
        const top = ((startMin - topOffsetMin) / 60) * PX_PER_HOUR
        const height = Math.max(22, ((endMin - startMin) / 60) * PX_PER_HOUR - 2)
        return { top, height }
    }

    const nowTop = isToday
        ? ((minutesIntoDay(now.toISOString(), selectedDate) - topOffsetMin) / 60) * PX_PER_HOUR
        : -1

    const handleEmptyClick = (hour: number) => {
        const start = new Date(selectedDate)
        start.setHours(hour, 0, 0, 0)
        const end = new Date(start)
        end.setHours(hour + 1)
        void create({
            title: 'New event',
            start_at: start.toISOString(),
            end_at: end.toISOString(),
        })
    }

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]"
        >
            <div className="relative" style={{ height: gridHeight }}>
                {/* Hour rows (gutter + clickable empty slots) */}
                {hours.map((h, i) => (
                    <div
                        key={h}
                        className="absolute left-0 right-0 flex"
                        style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }}
                    >
                        <div className="w-16 flex-shrink-0 pr-3 pt-1.5 text-right">
                            <span className="text-[11px] font-medium text-[var(--text-tertiary)] tabular-nums">
                                {new Date(0, 0, 0, h).toLocaleTimeString([], {
                                    hour: 'numeric',
                                })}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleEmptyClick(h)}
                            className="flex-1 border-t border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                            aria-label={`Add event at ${h}:00`}
                        />
                    </div>
                ))}

                {/* Event blocks */}
                <div className="absolute left-16 right-2 top-0 bottom-0 pointer-events-none">
                    {events.map((ev) => {
                        const { top, height } = blockFor(ev)
                        const quoril = ev.isQuorilCreated
                        return (
                            <button
                                key={ev.id}
                                type="button"
                                onClick={() => openEditor(ev.id)}
                                className="absolute left-0 right-0 pointer-events-auto text-left rounded-lg px-2.5 py-1.5 overflow-hidden transition-all hover:brightness-110 hover:z-10"
                                style={{
                                    top,
                                    height,
                                    background: quoril
                                        ? 'var(--accent-lime-100)'
                                        : 'var(--bg-hover-strong)',
                                    borderLeft: `3px solid ${
                                        quoril ? 'var(--accent-primary)' : 'var(--text-tertiary)'
                                    }`,
                                }}
                            >
                                <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate leading-tight">
                                    {ev.title}
                                </div>
                                {height > 34 && (
                                    <div className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                                        {fmtTime(ev.start_at)} – {fmtTime(ev.end_at)}
                                    </div>
                                )}
                            </button>
                        )
                    })}

                    {/* Now line */}
                    {nowTop >= 0 && nowTop <= gridHeight && (
                        <div
                            className="absolute left-0 right-0 pointer-events-none z-20 flex items-center"
                            style={{ top: nowTop }}
                        >
                            <span className="w-2 h-2 rounded-full bg-[var(--focus)] -ml-1" />
                            <span className="flex-1 h-px bg-[var(--focus)]" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
