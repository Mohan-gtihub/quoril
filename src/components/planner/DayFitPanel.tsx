import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Sparkles, CalendarClock } from 'lucide-react'
import { usePlanningStore } from '@/store/planningStore'
import type { TaskPriority } from '@/types/database'

interface DayFitPanelProps {
    day: Date
}

/** "1h 20m" / "45m" / "0m" */
function formatMinutes(total: number): string {
    const m = Math.max(0, Math.round(total))
    if (m === 0) return '0m'
    const hours = Math.floor(m / 60)
    const mins = m % 60
    if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    return `${mins}m`
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
    critical: 'var(--break)',
    high: 'var(--break)',
    medium: 'var(--accent-primary)',
    low: 'var(--text-muted)',
}

export function DayFitPanel({ day }: DayFitPanelProps) {
    const {
        analysis,
        explanation,
        loading,
        undoToken,
        selectedIds,
        analyzeForDay,
        toggleProposal,
        applyProposals,
        undoApply,
    } = usePlanningStore()

    // Re-analyse whenever the day changes. Keyed on the day-string so a new Date
    // object for the same calendar day doesn't retrigger.
    const dayKey = day.toDateString()
    useEffect(() => {
        analyzeForDay(day)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dayKey])

    const capacity = analysis?.capacityMinutes ?? 0
    const planned = analysis?.plannedMinutes ?? 0
    const remaining = analysis?.remainingMinutes ?? 0
    const isOverloaded = analysis?.isOverloaded ?? false
    const proposals = analysis?.proposals ?? []
    const freeWindowCount = analysis?.freeWindows.length ?? 0

    const fillPct = useMemo(() => {
        if (capacity <= 0) return planned > 0 ? 100 : 0
        return Math.min(100, Math.round((planned / capacity) * 100))
    }, [planned, capacity])

    // Comfortable fit (well within capacity) → wellbeing; overloaded → break/red.
    const fillColor = isOverloaded
        ? 'var(--break)'
        : capacity > 0 && planned <= capacity * 0.85
            ? 'var(--wellbeing)'
            : 'var(--accent-primary)'

    const selectedCount = proposals.filter((p) => selectedIds.has(p.id)).length

    return (
        <div
            className="flex flex-col gap-5 p-5 border border-[var(--border-default)] bg-[var(--bg-card)]"
            style={{ borderRadius: 'var(--radius-card)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--wellbeing-100)', color: 'var(--wellbeing)' }}
                    >
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold leading-none tracking-tight text-[var(--text-primary)]">
                            Can this day fit?
                        </h3>
                        <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1.5">
                            Planning intelligence
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => analyzeForDay(day)}
                    disabled={loading}
                    className="w-7 h-7 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                    title="Re-analyse"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Capacity bar */}
            <div className="flex flex-col gap-2">
                <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--bg-hover)]">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: fillColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${fillPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                </div>

                <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-medium tabular-nums text-[var(--text-secondary)]">
                        {formatMinutes(planned)} planned · {formatMinutes(capacity)} open
                    </span>

                    <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full tabular-nums"
                        style={
                            isOverloaded
                                ? { backgroundColor: 'var(--break-100)', color: 'var(--break)' }
                                : { backgroundColor: 'var(--wellbeing-100)', color: 'var(--wellbeing)' }
                        }
                    >
                        {isOverloaded
                            ? `${formatMinutes(Math.abs(remaining))} over`
                            : `${formatMinutes(remaining)} free`}
                    </span>
                </div>
            </div>

            {/* Explanation */}
            {explanation && (
                <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                    {explanation}
                </p>
            )}

            {/* Free-window chip */}
            <div className="flex items-center gap-2">
                <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full text-[var(--text-secondary)] bg-[var(--bg-hover)]"
                >
                    <CalendarClock className="w-3 h-3" />
                    {freeWindowCount} open {freeWindowCount === 1 ? 'window' : 'windows'}
                </span>
            </div>

            {/* Proposals */}
            <div className="flex flex-col gap-1">
                {proposals.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-[13px] text-[var(--text-muted)]">
                            {loading
                                ? 'Looking at your day…'
                                : 'Nothing to schedule right now. Your day is clear.'}
                        </p>
                    </div>
                ) : (
                    proposals.map((proposal) => {
                        const checked = selectedIds.has(proposal.id)
                        return (
                            <label
                                key={proposal.id}
                                className="flex items-center gap-3 px-2 py-2.5 rounded-[12px] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleProposal(proposal.id)}
                                    className="w-4 h-4 rounded accent-[var(--accent-primary)] flex-shrink-0 cursor-pointer"
                                />

                                <span className="text-[12px] font-semibold tabular-nums text-[var(--text-secondary)] w-[92px] flex-shrink-0">
                                    {formatTime(proposal.start)}–{formatTime(proposal.end)}
                                </span>

                                <span
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: PRIORITY_COLOR[proposal.task.priority] ?? 'var(--text-muted)' }}
                                />

                                <span className="text-[13px] font-medium text-[var(--text-primary)] truncate flex-1 min-w-0">
                                    {proposal.task.title}
                                </span>

                                <span className="text-[11px] font-medium tabular-nums text-[var(--text-muted)] flex-shrink-0">
                                    {formatMinutes(proposal.adjustedMinutes)}
                                </span>
                            </label>
                        )
                    })
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-1">
                <button
                    onClick={applyProposals}
                    disabled={selectedCount === 0 || loading}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-full flex items-center justify-center gap-2 transition-all bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                    Plan My Blocks
                    {selectedCount > 0 && (
                        <span className="tabular-nums opacity-80">({selectedCount})</span>
                    )}
                </button>

                {undoToken && undoToken.length > 0 && (
                    <button
                        onClick={undoApply}
                        disabled={loading}
                        className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
                    >
                        Undo
                    </button>
                )}
            </div>
        </div>
    )
}
