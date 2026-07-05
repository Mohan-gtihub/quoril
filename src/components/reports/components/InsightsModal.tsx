import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, Copy, Check, Lightbulb, CalendarCheck, ShieldCheck, AlertCircle, Lock } from 'lucide-react'
import { getPlatform } from '@/services/platform'
import type { ReportInsightSummary, InsightsResult } from '@/services/insights/types'
import { loadInsights, saveInsights, isRegenEligible, msUntilRegenEligible, formatCooldown } from '@/services/insights/insightsCache'
import { InsightsVisuals } from './InsightsVisuals'

type Status = 'idle' | 'loading' | 'done' | 'error'

function normalizeInsightsResult(raw: unknown): InsightsResult {
    const r = raw as Partial<InsightsResult> | null | undefined
    return {
        summary: typeof r?.summary === 'string' ? r.summary : '',
        insights: Array.isArray(r?.insights)
            ? r.insights.filter((i): i is InsightsResult['insights'][number] =>
                !!i &&
                typeof i.title === 'string' &&
                typeof i.detail === 'string' &&
                typeof i.suggestion === 'string'
            )
            : [],
        tomorrow_plan: Array.isArray(r?.tomorrow_plan)
            ? r.tomorrow_plan.filter((p): p is string => typeof p === 'string')
            : [],
    }
}

function summaryToText(s: InsightsResult): string {
    const lines = [s.summary, '']
    s.insights.forEach(i => lines.push(`• ${i.title}\n  ${i.detail}\n  → ${i.suggestion}`, ''))
    if (s.tomorrow_plan.length) {
        lines.push('Tomorrow:')
        s.tomorrow_plan.forEach(p => lines.push(`- ${p}`))
    }
    return lines.join('\n')
}

export function InsightsModal({ open, onClose, summary, cacheKey }: {
    open: boolean
    onClose: () => void
    summary: ReportInsightSummary | null
    cacheKey: string
}) {
    const [status, setStatus] = useState<Status>('idle')
    const [result, setResult] = useState<InsightsResult | null>(null)
    const [error, setError] = useState<string>('')
    const [copied, setCopied] = useState(false)
    // When this cache entry was generated — backs the per-range 6h regen cooldown.
    const [generatedAt, setGeneratedAt] = useState<number | null>(null)
    // Ticks every minute while open so the cooldown countdown label stays live.
    const [now, setNow] = useState(() => Date.now())

    const run = useCallback(async (force = false) => {
        if (!summary) return
        if (!force) {
            const cached = loadInsights(cacheKey)
            if (cached) {
                setResult(normalizeInsightsResult(cached.result))
                setGeneratedAt(cached.generatedAt)
                setStatus('done')
                return
            }
        }
        setStatus('loading'); setError('')
        const resp = await getPlatform().insights.generate(summary)
        if (resp.ok) {
            const normalized = normalizeInsightsResult(resp.result)
            const at = Date.now()
            saveInsights(cacheKey, { result: normalized, model: resp.model, generatedAt: at })
            setResult(normalized)
            setGeneratedAt(at)
            setStatus('done')
        } else {
            setError(resp.error)
            setStatus('error')
        }
    }, [summary, cacheKey])

    // Generate (or restore from cache) whenever the modal opens.
    useEffect(() => {
        if (open) { setCopied(false); setNow(Date.now()); run(false) }
    }, [open, run])

    // Keep the cooldown countdown current while the modal is open.
    useEffect(() => {
        if (!open) return
        const id = setInterval(() => setNow(Date.now()), 60_000)
        return () => clearInterval(id)
    }, [open])

    // Close on Escape.
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    const copy = async () => {
        if (!result) return
        try { await navigator.clipboard.writeText(summaryToText(result)); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* ignore */ }
    }

    const regenEligible = isRegenEligible(generatedAt, now)
    const cooldownLabel = formatCooldown(msUntilRegenEligible(generatedAt, now))

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                    onMouseDown={onClose}
                    style={{ background: 'color-mix(in srgb, var(--bg-primary) 65%, transparent)', backdropFilter: 'blur(6px)' }}
                >
                    <motion.div
                        role="dialog" aria-modal="true" aria-label="Quoril Suggestions"
                        onMouseDown={e => e.stopPropagation()}
                        initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="w-full max-w-[560px] max-h-[85vh] flex flex-col rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[0_24px_64px_-24px_rgba(15,23,42,0.5)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--border-default)]">
                            <span
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                                style={{ background: 'color-mix(in srgb, var(--focus) 12%, transparent)' }}
                            >
                                <img src={`${import.meta.env.BASE_URL}brand-mark.png`} alt="Quoril" className="w-[22px] h-[22px] object-contain" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">Quoril Suggestions</h2>
                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Based on your report · {cacheKey}</p>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors">
                                <X className="w-4 h-4 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
                            {status === 'loading' && (
                                <div className="py-10 flex flex-col items-center justify-center gap-4 text-center">
                                    <div className="relative w-10 h-10">
                                        <span className="absolute inset-0 rounded-full border-2 border-[var(--track)]" />
                                        <motion.span className="absolute inset-0 rounded-full border-2 border-transparent"
                                            style={{ borderTopColor: 'var(--focus)' }}
                                            animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                                    </div>
                                    <p className="text-[13px] text-[var(--text-secondary)]">Analyzing your focus patterns…</p>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                                    <AlertCircle className="w-6 h-6 text-[var(--error)]" />
                                    <p className="text-[13px] text-[var(--text-secondary)] max-w-[320px]">{error}</p>
                                    <button onClick={() => run(true)}
                                        className="mt-1 text-[12px] font-medium text-[var(--focus)] flex items-center gap-1.5 hover:opacity-80 transition">
                                        <RefreshCw className="w-3.5 h-3.5" /> Try again
                                    </button>
                                </div>
                            )}

                            {status === 'done' && result && (
                                <div className="space-y-5">
                                    {/* Visualizations — from the aggregated summary already sent to the model */}
                                    {summary && <InsightsVisuals summary={summary} />}

                                    {/* Summary */}
                                    <p className="text-[14px] leading-relaxed text-[var(--text-primary)]">{result.summary}</p>

                                    {/* Insights */}
                                    <div className="space-y-3">
                                        {result.insights.map((ins, i) => (
                                            <div key={i} className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                                                <div className="flex items-start gap-2.5">
                                                    <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--break)' }} />
                                                    <div className="min-w-0">
                                                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{ins.title}</p>
                                                        <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 leading-relaxed">{ins.detail}</p>
                                                        <p className="text-[12.5px] mt-2 leading-relaxed" style={{ color: 'var(--focus)' }}>→ {ins.suggestion}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Tomorrow plan */}
                                    {result.tomorrow_plan.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <CalendarCheck className="w-4 h-4" style={{ color: 'var(--wellbeing)' }} />
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Plan for tomorrow</p>
                                            </div>
                                            <ul className="space-y-2">
                                                {result.tomorrow_plan.map((p, i) => (
                                                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--wellbeing)' }} />
                                                        <span className="leading-relaxed">{p}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-[var(--border-default)] px-6 py-4">
                            <div className="flex items-center gap-2 text-[10.5px] text-[var(--text-muted)] mb-3">
                                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                <span>Quoril sends only summarized report metrics, not your raw screen history.</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => run(true)} disabled={status === 'loading' || !regenEligible}
                                    title={!regenEligible ? `You can regenerate again in ${cooldownLabel}` : undefined}
                                    className="flex-1 h-9 rounded-[var(--radius-card)] border border-[var(--border-default)] text-[12.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {regenEligible
                                        ? <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
                                        : <><Lock className="w-3.5 h-3.5" /> Regenerate in {cooldownLabel}</>}
                                </button>
                                <button onClick={copy} disabled={status !== 'done'}
                                    className="flex-1 h-9 rounded-[var(--radius-card)] border border-[var(--border-default)] text-[12.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
