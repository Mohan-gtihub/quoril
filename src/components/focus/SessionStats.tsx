import { useFocusStore } from '@/store/focusStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSessionDistraction } from '@/hooks/useSessionDistraction'
import { getTaskEstimate } from '@/utils/sessionUtils'
import type { Task } from '@/types/database'

// Live stats for the current focus sitting: how much the user actually focused,
// how much leaked to distractions, break, and away/paused time. Data comes from
// focusStore (focus/break) + a polled main-process query (distraction).

function fmt(sec: number): string {
    const s = Math.max(0, Math.round(sec))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m`
    return `${s}s`
}

const C = {
    focus: 'var(--focus)',
    distract: 'var(--error)',
    brk: 'var(--wellbeing)',
    away: 'var(--track)',
}

interface Segment { label: string; seconds: number; color: string }

function RatioBar({ segments, total }: { segments: Segment[]; total: number }) {
    const denom = Math.max(1, total)
    return (
        <div className="flex w-full h-2 rounded-full overflow-hidden bg-[var(--track)]">
            {segments.map((s, i) =>
                s.seconds > 0 ? (
                    <div key={i} title={`${s.label}: ${fmt(s.seconds)}`}
                        style={{ width: `${(s.seconds / denom) * 100}%`, background: s.color }} />
                ) : null,
            )}
        </div>
    )
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
    return (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2.5">
            <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] truncate">{label}</p>
            </div>
            <p className="text-[16px] font-semibold text-[var(--text-primary)] mt-1 leading-none tabular-nums">{value}</p>
            {sub && <p className="text-[10.5px] text-[var(--text-muted)] mt-1 truncate">{sub}</p>}
        </div>
    )
}

export function SessionStats({ activeTask, variant = 'full' }: { activeTask?: Task | null; variant?: 'full' | 'condensed' }) {
    const isActive = useFocusStore(s => s.isActive)
    const elapsed = useFocusStore(s => s.elapsed)
    const sessionBaseElapsed = useFocusStore(s => s.sessionBaseElapsed)
    const breakElapsed = useFocusStore(s => s.breakElapsed)
    const sessionStartedAt = useFocusStore(s => s.sessionStartedAt)
    const completedPomodoros = useFocusStore(s => s.completedPomodoros)
    const pomodorosEnabled = useSettingsStore(s => s.pomodorosEnabled)

    const distraction = useSessionDistraction(sessionStartedAt, isActive)

    if (!isActive || !sessionStartedAt) return null

    // Focus happens while the timer runs; distraction is a slice of that time spent
    // on distracting apps/sites. Away = wall-clock not spent focusing or on break
    // (paused / idle). elapsed is the live task total → this sitting = minus base.
    const focused = Math.max(0, elapsed - sessionBaseElapsed)
    const distracted = Math.min(focused, distraction.distractionSeconds)
    const cleanFocus = Math.max(0, focused - distracted)
    const brk = Math.max(0, breakElapsed)
    const wall = Math.max(focused + brk, (Date.now() - sessionStartedAt) / 1000)
    const away = Math.max(0, wall - focused - brk)

    const segments: Segment[] = [
        { label: 'Focused', seconds: cleanFocus, color: C.focus },
        { label: 'Distracted', seconds: distracted, color: C.distract },
        { label: 'Break', seconds: brk, color: C.brk },
        { label: 'Away', seconds: away, color: C.away },
    ]
    const focusPct = wall > 0 ? Math.round((cleanFocus / wall) * 100) : 0
    const distractPct = focused > 0 ? Math.round((distracted / focused) * 100) : 0

    if (variant === 'condensed') {
        return (
            <div className="space-y-2">
                <RatioBar segments={segments} total={wall} />
                <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">
                        <span className="font-semibold" style={{ color: C.focus }}>{focusPct}%</span> focused
                    </span>
                    <span className="text-[var(--text-muted)]">
                        <span style={{ color: C.distract }}>{fmt(distracted)}</span> distracted · {fmt(brk)} break
                    </span>
                </div>
            </div>
        )
    }

    const estimate = getTaskEstimate(activeTask)

    return (
        <div className="w-full space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">This session</p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                    <span className="font-semibold" style={{ color: C.focus }}>{focusPct}%</span> focused
                </p>
            </div>

            <RatioBar segments={segments} total={wall} />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[var(--text-muted)]">
                {segments.filter(s => s.seconds > 0).map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[3px]" style={{ background: s.color }} />
                        {s.label} {fmt(s.seconds)}
                    </span>
                ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <Tile label="Focused" value={fmt(focused)} accent={C.focus} />
                <Tile label="Distraction" value={distracted > 0 ? fmt(distracted) : '—'}
                    sub={distracted > 0 ? `${distractPct}% of focus` : 'none yet'} accent={C.distract} />
                <Tile label="This task" value={fmt(elapsed)}
                    sub={estimate > 0 ? `of ~${fmt(estimate)} est` : undefined} accent={C.brk} />
                {pomodorosEnabled
                    ? <Tile label="Pomodoros" value={String(completedPomodoros)} accent="var(--break)" />
                    : <Tile label="On break" value={fmt(brk)} accent="var(--break)" />}
            </div>
        </div>
    )
}
