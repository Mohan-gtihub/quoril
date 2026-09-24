import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Link2, Trash2, X } from 'lucide-react'
import { useCalendarStore } from '@/store/calendarStore'
import type { CalendarEvent } from '@/types/calendar'

interface EventEditorProps {
    /** null → create a new event. */
    event: CalendarEvent | null
    onClose: () => void
}

/** ISO string → value for a <input type="datetime-local"> (local time). */
function isoToLocalInput(iso: string | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local value (local time) → ISO string. */
function localInputToIso(value: string): string {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString()
}

const ALARM_OPTIONS: { label: string; value: number | null }[] = [
    { label: 'None', value: null },
    { label: '5 minutes before', value: 5 },
    { label: '10 minutes before', value: 10 },
    { label: '15 minutes before', value: 15 },
    { label: '30 minutes before', value: 30 },
]

type RecurrenceScope = 'this' | 'future'

export function EventEditor({ event, onClose }: EventEditorProps) {
    const create = useCalendarStore((s) => s.create)
    const saveEdit = useCalendarStore((s) => s.saveEdit)
    const removeEvent = useCalendarStore((s) => s.remove)

    const isEditing = event !== null

    const [title, setTitle] = useState(event?.title ?? '')
    const [startAt, setStartAt] = useState(isoToLocalInput(event?.start_at))
    const [endAt, setEndAt] = useState(isoToLocalInput(event?.end_at))
    const [notes, setNotes] = useState(event?.notes ?? '')
    const [url, setUrl] = useState(event?.url ?? '')
    const [alarm, setAlarm] = useState<number | null>(event?.alarm_lead_minutes ?? null)
    const [recurrenceScope, setRecurrenceScope] = useState<RecurrenceScope>('this')
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    // Escape closes.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const error = useMemo(() => {
        if (!title.trim()) return 'Give the event a title.'
        const s = localInputToIso(startAt)
        const e = localInputToIso(endAt)
        if (!s || !e) return 'Set both a start and an end time.'
        if (new Date(e).getTime() <= new Date(s).getTime()) {
            return 'End time must be after the start time.'
        }
        return null
    }, [title, startAt, endAt])

    const canSave = error === null

    const handleSave = useCallback(async () => {
        if (!canSave) return
        const patch = {
            title: title.trim(),
            start_at: localInputToIso(startAt),
            end_at: localInputToIso(endAt),
            notes: notes.trim() ? notes.trim() : null,
            url: url.trim() ? url.trim() : null,
            alarm_lead_minutes: alarm,
        }
        if (isEditing && event) {
            // recurrenceScope is advisory for the local store — recorded here so
            // a future sync/recurrence engine can honour the user's intent.
            await saveEdit(event.id, patch)
        } else {
            await create(patch)
        }
        onClose()
    }, [canSave, title, startAt, endAt, notes, url, alarm, isEditing, event, saveEdit, create, onClose])

    const handleDelete = useCallback(async () => {
        if (!event) return
        if (!confirmingDelete) {
            setConfirmingDelete(true)
            return
        }
        await removeEvent(event.id)
        onClose()
    }, [event, confirmingDelete, removeEvent, onClose])

    const isExternal = event ? !event.isQuorilCreated : false
    const isRecurring = event?.is_recurring ?? false

    const fieldClass =
        'w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-hover)] transition-colors'
    const labelClass =
        'block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-1.5'

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />

                {/* Dialog */}
                <motion.div
                    className="relative w-full max-w-[440px] mx-4 max-h-[88vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl"
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ duration: 0.16 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-3">
                        <div className="flex items-center gap-2.5">
                            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                                {isEditing ? 'Edit event' : 'New event'}
                            </h3>
                            {isEditing && (
                                isExternal ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
                                        External
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--accent-lime-100)] text-[var(--accent-primary)]">
                                        Quoril
                                    </span>
                                )
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] flex items-center justify-center transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 pb-2 space-y-4">
                        <div>
                            <label className={labelClass}>Title</label>
                            <input
                                className={fieldClass}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What's happening?"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Starts</label>
                                <input
                                    type="datetime-local"
                                    className={fieldClass}
                                    value={startAt}
                                    onChange={(e) => setStartAt(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Ends</label>
                                <input
                                    type="datetime-local"
                                    className={fieldClass}
                                    value={endAt}
                                    onChange={(e) => setEndAt(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Notes</label>
                            <textarea
                                className={`${fieldClass} resize-none`}
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add details…"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>
                                <span className="inline-flex items-center gap-1.5">
                                    <Link2 className="w-3 h-3" /> Link
                                </span>
                            </label>
                            <input
                                className={fieldClass}
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://…"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>
                                <span className="inline-flex items-center gap-1.5">
                                    <Bell className="w-3 h-3" /> Reminder
                                </span>
                            </label>
                            <select
                                className={fieldClass}
                                value={alarm === null ? 'null' : String(alarm)}
                                onChange={(e) =>
                                    setAlarm(e.target.value === 'null' ? null : Number(e.target.value))
                                }
                            >
                                {ALARM_OPTIONS.map((o) => (
                                    <option key={o.label} value={o.value === null ? 'null' : String(o.value)}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isRecurring && (
                            <div>
                                <label className={labelClass}>Recurring event</label>
                                <select
                                    className={fieldClass}
                                    value={recurrenceScope}
                                    onChange={(e) => setRecurrenceScope(e.target.value as RecurrenceScope)}
                                >
                                    <option value="this">This event</option>
                                    <option value="future">This and future events</option>
                                </select>
                                <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                                    Scope is advisory for the local calendar.
                                </p>
                            </div>
                        )}

                        {error && (
                            <p className="text-[12px] text-[var(--error)] font-medium">{error}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5 px-6 py-5">
                        {isEditing && (
                            <button
                                onClick={handleDelete}
                                className={`py-2.5 px-4 rounded-xl text-[13px] font-bold transition-all inline-flex items-center gap-1.5 ${
                                    confirmingDelete
                                        ? 'bg-[var(--error)] text-white hover:brightness-110'
                                        : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)]'
                                }`}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {confirmingDelete ? 'Confirm' : 'Delete'}
                            </button>
                        )}
                        <div className="flex-1" />
                        <button
                            onClick={onClose}
                            className="py-2.5 px-4 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-[13px] font-bold text-[var(--text-secondary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!canSave}
                            className="py-2.5 px-5 rounded-xl text-[13px] font-bold transition-all bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isEditing ? 'Save' : 'Create'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
