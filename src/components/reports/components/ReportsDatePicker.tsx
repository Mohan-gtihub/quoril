import { useState, useRef, useEffect } from 'react'
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    addMonths, subMonths, isSameDay, isBefore,
    isWithinInterval, startOfDay, endOfDay,
    startOfWeek, endOfWeek, startOfMonth as som, endOfMonth as eom,
    subDays, startOfYear, endOfYear, subYears,
} from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */

export interface DateRange {
    startDate: Date
    endDate: Date
    label: string
}

interface Props {
    value: DateRange
    onChange: (range: DateRange) => void
}

/* ─── Presets ───────────────────────────────────────────────── */

function getPresets(): { label: string; range: () => DateRange }[] {
    const today = new Date()
    return [
        { label: 'Today', range: () => ({ startDate: startOfDay(today), endDate: endOfDay(today), label: 'Today' }) },
        { label: 'Yesterday', range: () => { const y = subDays(today, 1); return { startDate: startOfDay(y), endDate: endOfDay(y), label: 'Yesterday' } } },
        { label: 'This week', range: () => ({ startDate: startOfWeek(today, { weekStartsOn: 1 }), endDate: endOfWeek(today, { weekStartsOn: 1 }), label: 'This week' }) },
        { label: 'Last week', range: () => { const s = startOfWeek(subDays(today, 7), { weekStartsOn: 1 }); return { startDate: s, endDate: endOfWeek(s, { weekStartsOn: 1 }), label: 'Last week' } } },
        { label: 'This month', range: () => ({ startDate: som(today), endDate: eom(today), label: 'This month' }) },
        { label: 'Last month', range: () => { const lm = subMonths(today, 1); return { startDate: som(lm), endDate: eom(lm), label: 'Last month' } } },
        { label: 'This year', range: () => ({ startDate: startOfYear(today), endDate: endOfYear(today), label: 'This year' }) },
        { label: 'Last year', range: () => { const ly = subYears(today, 1); return { startDate: startOfYear(ly), endDate: endOfYear(ly), label: 'Last year' } } },
        { label: 'Last 7 days', range: () => ({ startDate: startOfDay(subDays(today, 6)), endDate: endOfDay(today), label: 'Last 7 days' }) },
        { label: 'Last 30 days', range: () => ({ startDate: startOfDay(subDays(today, 29)), endDate: endOfDay(today), label: 'Last 30 days' }) },
    ]
}

/* ─── Mini Calendar ─────────────────────────────────────────── */

interface CalProps {
    month: Date
    selecting: boolean
    start: Date | null
    end: Date | null
    hover: Date | null
    onDay: (d: Date) => void
    onHover: (d: Date | null) => void
}

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function MiniCal({ month, selecting, start, end, hover, onDay, onHover }: CalProps) {
    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })

    // Pad to Monday start
    const firstDow = (startOfMonth(month).getDay() + 6) % 7 // 0=Mon
    const leading = Array(firstDow).fill(null)

    const rangeEnd = selecting && hover ? hover : end

    function inRange(d: Date) {
        if (!start || !rangeEnd) return false
        const lo = isBefore(start, rangeEnd) ? start : rangeEnd
        const hi = isBefore(start, rangeEnd) ? rangeEnd : start
        return isWithinInterval(d, { start: lo, end: hi })
    }

    return (
        <div className="flex-1 min-w-[220px]">
            {/* Month title */}
            <p className="text-sm font-bold text-[var(--text-secondary)] text-center mb-3">
                {format(month, 'MMMM yyyy')}
            </p>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
                {WEEK_DAYS.map(d => (
                    <div key={d} className="text-center text-[11px] font-bold text-[var(--text-muted)] py-1">{d}</div>
                ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7">
                {leading.map((_, i) => <div key={`l${i}`} />)}
                {days.map(day => {
                    const isStart = start && isSameDay(day, start)
                    const isEnd = end && isSameDay(day, end)
                    const isToday = isSameDay(day, new Date())
                    const inR = inRange(day)
                    const isEdge = isStart || isEnd

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => onDay(day)}
                            onMouseEnter={() => onHover(day)}
                            onMouseLeave={() => onHover(null)}
                            className={`
                                relative h-8 w-full text-xs font-semibold transition-all
                                ${inR && !isEdge ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-none' : ''}
                                ${isEdge ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-lg z-10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg'}
                            `}
                        >
                            {format(day, 'd')}
                            {isToday && !isEdge && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/* ─── Main Component ─────────────────────────────────────────── */

export function DateRangePicker({ value, onChange }: Props) {
    const [open, setOpen] = useState(false)
    const [leftMonth, setLeftMonth] = useState(() => startOfMonth(value.startDate))
    const [rightMonth, setRightMonth] = useState(() => startOfMonth(addMonths(value.startDate, 1)))
    const [tempStart, setTempStart] = useState<Date | null>(value.startDate)
    const [tempEnd, setTempEnd] = useState<Date | null>(value.endDate)
    const [hover, setHover] = useState<Date | null>(null)
    const [selecting, setSelecting] = useState(false)
    const [activePreset, setActivePreset] = useState(value.label)
    const ref = useRef<HTMLDivElement>(null)

    const presets = getPresets()

    // Close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    function handleDay(day: Date) {
        if (!selecting || !tempStart) {
            // First click — set start
            setTempStart(startOfDay(day))
            setTempEnd(null)
            setSelecting(true)
            setActivePreset('Custom')
        } else {
            // Second click — set end
            const s = isBefore(day, tempStart) ? startOfDay(day) : tempStart
            const e = isBefore(day, tempStart) ? tempStart : endOfDay(day)
            setTempStart(s)
            setTempEnd(e)
            setSelecting(false)
            setActivePreset('Custom')
        }
    }

    function applyPreset(preset: { label: string; range: () => DateRange }) {
        const r = preset.range()
        setTempStart(r.startDate)
        setTempEnd(r.endDate)
        setSelecting(false)
        setActivePreset(preset.label)
        setLeftMonth(startOfMonth(r.startDate))
        setRightMonth(startOfMonth(addMonths(r.startDate, 1)))
    }

    function apply() {
        if (!tempStart || !tempEnd) return
        onChange({ startDate: tempStart, endDate: tempEnd, label: activePreset })
        setOpen(false)
    }

    function cancel() {
        setTempStart(value.startDate)
        setTempEnd(value.endDate)
        setSelecting(false)
        setActivePreset(value.label)
        setOpen(false)
    }

    function shiftMonths(dir: -1 | 1) {
        setLeftMonth(m => dir === 1 ? addMonths(m, 1) : subMonths(m, 1))
        setRightMonth(m => dir === 1 ? addMonths(m, 1) : subMonths(m, 1))
    }

    const displayLabel = value.label !== 'Custom'
        ? value.label
        : `${format(value.startDate, 'MMM d, yyyy')} – ${format(value.endDate, 'MMM d, yyyy')}`

    return (
        <div className="relative" ref={ref}>
            {/* Trigger */}
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] transition-all text-sm font-semibold text-[var(--text-secondary)]"
            >
                <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                <span className="text-[13px]">{displayLabel}</span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-max rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
                    <div className="flex">
                        {/* ── Preset sidebar ── */}
                        <div className="w-36 border-r border-[var(--border-default)] py-3 flex flex-col gap-0.5">
                            {presets.map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => applyPreset(p)}
                                    className={`w-full text-left text-xs px-4 py-2 font-medium transition-all hover:text-[var(--text-primary)] ${activePreset === p.label
                                        ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold'
                                        : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <button
                                onClick={() => setActivePreset('Custom')}
                                className={`w-full text-left text-xs px-4 py-2 font-medium transition-all hover:text-[var(--text-primary)] ${activePreset === 'Custom'
                                    ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold border-t border-[var(--border-default)] mt-0.5'
                                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] border-t border-[var(--border-default)] mt-0.5'
                                    }`}
                            >
                                Custom
                            </button>
                        </div>

                        {/* ── Calendar area ── */}
                        <div className="flex flex-col">
                            <div className="flex gap-4 p-5">
                                {/* Left month nav */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <button onClick={() => shiftMonths(-1)}
                                            className="w-7 h-7 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors">
                                            <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                        </button>
                                        <span />
                                    </div>
                                    <MiniCal
                                        month={leftMonth}
                                        selecting={selecting}
                                        start={tempStart}
                                        end={tempEnd}
                                        hover={hover}
                                        onDay={handleDay}
                                        onHover={setHover}
                                    />
                                </div>

                                {/* Divider */}
                                <div className="w-px bg-[var(--border-default)] mx-1" />

                                {/* Right month nav */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-end mb-1">
                                        <span />
                                        <button onClick={() => shiftMonths(1)}
                                            className="w-7 h-7 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors">
                                            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                        </button>
                                    </div>
                                    <MiniCal
                                        month={rightMonth}
                                        selecting={selecting}
                                        start={tempStart}
                                        end={tempEnd}
                                        hover={hover}
                                        onDay={handleDay}
                                        onHover={setHover}
                                    />
                                </div>
                            </div>

                            {/* ── Footer ── */}
                            <div className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
                                {/* Selected range display */}
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] font-mono">
                                        {tempStart ? format(tempStart, 'MMM d, yyyy') : '—'}
                                    </div>
                                    <span className="text-[var(--text-muted)] text-sm">–</span>
                                    <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] font-mono">
                                        {tempEnd ? format(tempEnd, 'MMM d, yyyy') : selecting ? 'pick end…' : '—'}
                                    </div>
                                </div>
                                <button onClick={cancel}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={apply}
                                    disabled={!tempStart || !tempEnd}
                                    className="px-5 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)] disabled:opacity-30 text-[var(--accent-contrast)] text-xs font-bold transition-all shadow-sm"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
