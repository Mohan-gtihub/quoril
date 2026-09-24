// The /insights page — the Electron port of Swift's InsightsView.
//
// Two rules govern it. Every claim cites a number the user can check, because an
// uncheckable claim is a horoscope (enforced in the validator, restated here as
// the evidence pill). And the page never waits on the network: it renders the
// cached briefing instantly and refreshes behind the user.

import { useEffect, useState } from 'react'
import { Sparkles, Activity, Crosshair, Lightbulb, FlaskConical, RotateCw, Clock, AlertTriangle } from 'lucide-react'
import { useInsightStore } from '@/store/insightStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { InsightBriefing } from '@/services/insights/insightBriefing'

const INSIGHT_ICONS = [Activity, Crosshair, Lightbulb]

function generatedText(briefing: InsightBriefing): string {
    const elapsed = Date.now() - new Date(briefing.generatedAt).getTime()
    const m = Math.floor(elapsed / 60000)
    if (elapsed < 120000) return 'Generated just now'
    if (elapsed < 3600000) return `Generated ${m} minutes ago`
    if (elapsed < 86400000) return `Generated ${Math.floor(elapsed / 3600000)} hours ago`
    return `Generated ${Math.floor(elapsed / 86400000)} days ago`
}

export function InsightsScreen() {
    const briefing = useInsightStore(s => s.briefing)
    const state = useInsightStore(s => s.state)
    const load = useInsightStore(s => s.load)
    const refresh = useInsightStore(s => s.refresh)
    const cooldownRemaining = useInsightStore(s => s.cooldownRemaining)
    const shareActivityPatterns = useSettingsStore(s => s.shareActivityPatterns)

    // Tick once a minute so the cooldown label and "N minutes ago" stay honest.
    const [, setTick] = useState(0)
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 60000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => { void load() }, [load])

    const generating = state === 'generating'
    const remainingMs = cooldownRemaining()
    const remainingMin = Math.floor(remainingMs / 60000) + 1
    const refreshFailed = typeof state === 'object' && 'refreshFailed' in state ? state.refreshFailed : null

    let refreshLabel = 'Refresh'
    let RefreshIcon = RotateCw
    if (generating) { refreshLabel = 'Thinking…'; RefreshIcon = Sparkles }
    else if (remainingMs > 0) { refreshLabel = `Refresh in ${remainingMin}m`; RefreshIcon = Clock }

    return (
        <div className="h-full overflow-y-auto bg-[var(--bg-primary)]">
            {/* Header */}
            <div className="flex items-center justify-between px-8 h-[58px] border-b border-[var(--border-default)]">
                <div className="flex flex-col leading-tight">
                    <h1 className="text-[17px] font-semibold text-[var(--text-primary)]">Insights</h1>
                    <p className="text-xs text-[var(--text-tertiary)]">What your numbers add up to</p>
                </div>
                <button
                    onClick={() => void refresh(true)}
                    disabled={generating || remainingMs > 0}
                    className="flex items-center gap-1.5 px-3.5 h-8 rounded-[10px] text-[13px] font-medium
                        border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)]
                        hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <RefreshIcon size={13} className={generating ? 'animate-pulse' : ''} />
                    {refreshLabel}
                </button>
            </div>

            {/* Body */}
            <div className="max-w-[1120px] mx-auto px-8 py-8 flex flex-col gap-6">
                {briefing ? (
                    <>
                        <Insights briefing={briefing} />
                        {briefing.experiment && <Experiment briefing={briefing} />}
                        <Footer briefing={briefing} sharesActivity={shareActivityPatterns} refreshFailed={refreshFailed} />
                    </>
                ) : generating ? (
                    <StateCard
                        icon={<Sparkles size={20} className="text-[var(--text-muted)]" />}
                        title="Reading your last 30 days"
                        message="This takes a few seconds. You can leave this page — it will be here when you come back."
                    />
                ) : (
                    <EmptyState refreshFailed={refreshFailed} />
                )}
            </div>
        </div>
    )
}

/* ── WHAT WE NOTICED ─────────────────────────────────────────── */

function Insights({ briefing }: { briefing: InsightBriefing }) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.7px] text-[var(--text-muted)]">
                    What we noticed
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                    {briefing.insights.length} patterns in your last 30 days
                </span>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${briefing.insights.length}, minmax(0, 1fr))` }}>
                {briefing.insights.map((ins, i) => {
                    const Icon = INSIGHT_ICONS[i % INSIGHT_ICONS.length]
                    return (
                        <div
                            key={i}
                            className="flex flex-col gap-2.5 p-5 min-h-[188px] rounded-[var(--radius-card)]
                                bg-[var(--bg-card)] border border-[var(--border-default)]"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[var(--focus-100)]">
                                    <Icon size={14} className="text-[var(--focus)]" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-[13px] font-bold text-[var(--text-primary)]">{ins.title}</h3>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">{ins.body}</p>
                            <p className="text-[10px] font-medium text-[var(--text-muted)] px-2 py-1.5 rounded-[7px] bg-[var(--bg-secondary)]">
                                {ins.evidence}
                            </p>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

/* ── TRY THIS WEEK ───────────────────────────────────────────── */

function Experiment({ briefing }: { briefing: InsightBriefing }) {
    return (
        <div
            className="flex items-start gap-5 p-5 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--success)_30%,transparent)]"
            style={{ background: 'linear-gradient(to right, color-mix(in srgb, var(--success) 10%, var(--bg-card)), var(--bg-card))' }}
        >
            <div className="flex items-center justify-center w-[46px] h-[46px] rounded-full shrink-0"
                style={{ background: 'color-mix(in srgb, var(--success) 16%, transparent)' }}>
                <FlaskConical size={19} className="text-[var(--success)]" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="self-start text-[9.5px] font-black tracking-[1.1px] uppercase text-white px-2 py-1 rounded-full bg-[var(--success)]">
                    Try this week
                </span>
                <p className="text-[17px] font-semibold text-[var(--text-primary)]">{briefing.experiment?.suggestion}</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{briefing.experiment?.why}</p>
            </div>
        </div>
    )
}

/* ── Footer ──────────────────────────────────────────────────── */

function Footer({ briefing, sharesActivity, refreshFailed }: {
    briefing: InsightBriefing; sharesActivity: boolean; refreshFailed: string | null
}) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <span>{generatedText(briefing)}</span>
                {!sharesActivity && <span>· Based on your focus and task numbers only</span>}
            </div>
            {refreshFailed && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <AlertTriangle size={12} />
                    <span>{refreshFailed}</span>
                </div>
            )}
        </div>
    )
}

/* ── Empty / working states ──────────────────────────────────── */

function StateCard({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
    return (
        <div className="flex items-start gap-5 p-5 rounded-[var(--radius-card)] bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="pt-0.5">{icon}</div>
            <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{message}</p>
            </div>
        </div>
    )
}

function EmptyState({ refreshFailed }: { refreshFailed: string | null }) {
    // The empty state must tell the truth about *why* it is empty. We approximate
    // "sessions so far" from the cached-none case via a lightweight payload read.
    const [sessionsInRange, setSessionsInRange] = useState<number | null>(null)
    const shareActivityPatterns = useSettingsStore(s => s.shareActivityPatterns)

    useEffect(() => {
        let cancelled = false
        // Best-effort: build the same payload to learn the session count. Cheap
        // relative to a model call, and only runs on the empty path.
        import('@/services/insights/insightPayloadSource').then(async ({ buildInsightPayloadFor }) => {
            const payload = await buildInsightPayloadFor(30, shareActivityPatterns)
            if (!cancelled) setSessionsInRange(payload?.focus.sessions ?? 0)
        })
        return () => { cancelled = true }
    }, [shareActivityPatterns])

    let title = 'Ready when you are'
    let message =
        'Quoril reads your last 30 days — focus sessions, attention span and estimate accuracy — and tells you what they add up to. Press Refresh to build your first briefing.'

    if (refreshFailed) {
        title = "Couldn't build your briefing"
        message = refreshFailed
    } else if (sessionsInRange != null && sessionsInRange < 5) {
        title = 'Still gathering your pattern'
        const remaining = 5 - sessionsInRange
        message = `${sessionsInRange} of 5 focus sessions so far. ${remaining} more and Quoril can find a pattern worth reporting.`
    }

    return (
        <StateCard icon={<Sparkles size={20} className="text-[var(--text-muted)]" />} title={title} message={message} />
    )
}
