import { Sunrise, Sunset } from 'lucide-react'
import type { ReportInsightSummary } from '@/services/insights/types'

// Visual layer for the Quoril Suggestions modal. Built purely from the
// privacy-safe ReportInsightSummary already sent to the model — no extra data,
// no extra model calls. Colors use existing theme roles (focus/break/wellbeing/
// error); text stays in ink tokens so identity is carried by the marks.

const fmtMin = (m: number) => (m >= 60 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`)
const pct = (n: number) => `${Math.round(n)}%`

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
    return (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2.5">
            <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] truncate">{label}</p>
            </div>
            <p className="text-[17px] font-semibold text-[var(--text-primary)] mt-1 leading-none tabular-nums">{value}</p>
        </div>
    )
}

// SVG donut: primary arc = completion_rate, faint outer label = focus-linked %.
function CompletionRing({ completion, focusLinked }: { completion: number; focusLinked: number }) {
    const r = 26
    const c = 2 * Math.PI * r
    const dash = Math.max(0, Math.min(100, completion)) / 100 * c
    return (
        <div className="flex items-center gap-3.5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3">
            <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0" role="img" aria-label={`Task completion ${pct(completion)}`}>
                <circle cx="32" cy="32" r={r} fill="none" stroke="var(--track)" strokeWidth="7" />
                <circle
                    cx="32" cy="32" r={r} fill="none" stroke="var(--wellbeing)" strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={`${dash} ${c - dash}`} transform="rotate(-90 32 32)"
                />
                <text x="32" y="32" textAnchor="middle" dominantBaseline="central"
                    className="tabular-nums" style={{ fontSize: '14px', fontWeight: 600, fill: 'var(--text-primary)' }}>
                    {pct(completion)}
                </text>
            </svg>
            <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[var(--text-primary)]">Tasks completed</p>
                <p className="text-[11.5px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    <span style={{ color: 'var(--focus)' }}>{pct(focusLinked)}</span> of focus time linked to tasks
                </p>
            </div>
        </div>
    )
}

function BarList({ title, items, color }: {
    title: string
    items: { label: string; minutes: number }[]
    color: string
}) {
    if (items.length === 0) return null
    const max = Math.max(...items.map(i => i.minutes), 1)
    return (
        <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">{title}</p>
            <div className="space-y-1.5">
                {items.slice(0, 3).map((it, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                        <span className="text-[11.5px] text-[var(--text-secondary)] w-[92px] shrink-0 truncate" title={it.label}>{it.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-[var(--track)] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(it.minutes / max) * 100}%`, background: color }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-[var(--text-muted)] w-9 text-right shrink-0">{fmtMin(it.minutes)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function FocusWindows({ best, worst }: { best: string | null; worst: string | null }) {
    if (!best && !worst) return null
    return (
        <div className="flex flex-wrap gap-2">
            {best && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ background: 'color-mix(in srgb, var(--focus) 12%, transparent)', color: 'var(--focus)' }}>
                    <Sunrise className="w-3.5 h-3.5" /> Best focus · {best}
                </span>
            )}
            {worst && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ background: 'color-mix(in srgb, var(--error) 12%, transparent)', color: 'var(--error)' }}>
                    <Sunset className="w-3.5 h-3.5" /> Weakest · {worst}
                </span>
            )}
        </div>
    )
}

export function InsightsVisuals({ summary }: { summary: ReportInsightSummary }) {
    return (
        <div className="space-y-4">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-2">
                <StatTile label="Deep work" value={fmtMin(summary.deep_work_minutes)} accent="var(--focus)" />
                <StatTile label="Focus sessions" value={String(summary.focus_sessions)} accent="var(--break)" />
                <StatTile label="Completion" value={pct(summary.completion_rate)} accent="var(--wellbeing)" />
                <StatTile label="Distraction" value={pct(summary.distraction_percent)} accent="var(--error)" />
            </div>

            <CompletionRing completion={summary.completion_rate} focusLinked={summary.focus_linked_percent} />

            {(summary.top_categories.length > 0 || summary.top_attention_leaks.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                    <BarList title="Where focus went" color="var(--focus)"
                        items={summary.top_categories.map(c => ({ label: c.name, minutes: c.minutes }))} />
                    <BarList title="Attention leaks" color="var(--error)"
                        items={summary.top_attention_leaks.map(a => ({ label: a.source, minutes: a.minutes }))} />
                </div>
            )}

            <FocusWindows best={summary.best_focus_window} worst={summary.worst_focus_window} />
        </div>
    )
}
