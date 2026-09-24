// The consent control for AI insights, and the button that proves it — the
// Electron port of Swift's InsightSharingSection.
//
// The toggle is off until chosen, and asked for here in Privacy settings rather
// than on the Insights page: prompting at the moment someone wants the feature
// is consent under pressure. "Show what would be sent" renders the literal JSON
// built from the user's own data, by the same code path that does the sending —
// nothing else in a privacy setting earns trust the way reading the bytes does.

import { useState } from 'react'
import { Lock, Hash } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useSettingsStore } from '@/store/settingsStore'
import { buildInsightPayloadFor } from '@/services/insights/insightPayloadSource'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={cn(
                'relative w-[44px] h-6 rounded-full transition-colors duration-300 shrink-0',
                value ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]',
            )}
        >
            <div className={cn(
                'absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform duration-300 shadow-sm',
                value ? 'left-[23px]' : 'left-[3px]',
            )} />
        </button>
    )
}

export function InsightSharingSection() {
    const shareActivityPatterns = useSettingsStore(s => s.shareActivityPatterns)
    const updateSettings = useSettingsStore(s => s.updateSettings)

    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function loadPreview() {
        setLoading(true)
        try {
            const payload = await buildInsightPayloadFor(30, shareActivityPatterns)
            if (!payload) {
                setPreview('Not enough data yet to build a briefing.')
            } else {
                // Re-encoded with indentation purely for reading; the bytes actually
                // sent are the compact form, but the content is identical.
                setPreview(JSON.stringify(payload, null, 2))
            }
        } catch {
            setPreview('Not enough data yet to build a briefing.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                AI insights
            </p>
            <div className="px-6 py-4 rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] flex flex-col gap-4">
                <label className="flex items-center justify-between gap-6 cursor-pointer">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                            Share anonymous activity patterns
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed max-w-md">
                            Lets Insights see how often you switch apps and how your time splits across
                            categories like Development or Communication.
                        </p>
                    </div>
                    <Toggle
                        value={shareActivityPatterns}
                        onChange={(v) => updateSettings({ shareActivityPatterns: v })}
                    />
                </label>

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--wellbeing)]">
                        <Lock size={12} />
                        <span>Window titles, app names and task names are never sent — at any setting</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                        <Hash size={12} />
                        <span>Counts and percentages only. “Communication” names a category, not an app.</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => (preview == null ? void loadPreview() : setPreview(null))}
                        disabled={loading}
                        className="px-3 h-8 rounded-[10px] text-[13px] font-medium border border-[var(--border-default)]
                            bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]
                            disabled:opacity-50 transition-colors"
                    >
                        {preview == null ? 'Show what would be sent' : 'Hide'}
                    </button>
                    {loading && <span className="text-xs text-[var(--text-muted)]">Building…</span>}
                </div>

                {preview != null && (
                    <pre className="max-h-[220px] overflow-auto text-[11px] font-mono text-[var(--text-secondary)]
                        p-3 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-default)]
                        whitespace-pre-wrap break-words select-text">
                        {preview}
                    </pre>
                )}

                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Sent to the hosted model to generate your briefing. Turning this off takes effect on the
                    next briefing.
                </p>
            </div>
        </div>
    )
}
