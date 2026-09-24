// "Assist" settings section — surfaces the Safe Automation rules as opt-in
// toggles and a read-only activity log. Assistance is optional: every rule is off
// until turned on, only one suggestion shows at a time, and nothing changes the
// user's work on its own. Visual language matches the Settings screen's Group /
// ToggleRow primitives (which are local to that file, so re-stated here).

import { useAutomationStore } from '@/store/automationStore'
import type { Activity, ActivityOutcome } from '@/services/automation/automationEngine'
import { cn } from '@/utils/helpers'

// A titled panel, mirroring the Settings screen's Group.
function Group({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div>
            {title && (
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    {title}
                </p>
            )}
            <div className="px-6 py-1.5 rounded-[var(--radius-tile,var(--radius-card))] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)]">
                {children}
            </div>
        </div>
    )
}

// Rule row with a toggle, matching the Settings ToggleRow switch style.
function RuleRow({
    label,
    description,
    value,
    onChange,
}: {
    label: string
    description?: string
    value: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <label className="flex items-center justify-between gap-6 cursor-pointer group py-5 border-b border-[var(--border-default)] last:border-0">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                {description && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed max-w-md">
                        {description}
                    </p>
                )}
            </div>
            <input
                type="checkbox"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only"
            />
            <div
                className={cn(
                    'relative w-[44px] h-6 rounded-full transition-colors duration-300 ease-in-out shrink-0',
                    value
                        ? 'bg-[var(--accent-primary)]'
                        : 'bg-[var(--bg-tertiary)] group-hover:bg-[var(--bg-hover-strong)]',
                )}
            >
                <div
                    className={cn(
                        'absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform duration-300 ease-in-out shadow-sm',
                        value ? 'left-[23px]' : 'left-[3px]',
                    )}
                />
            </div>
        </label>
    )
}

const OUTCOME_META: Record<
    ActivityOutcome,
    { label: string; color: string }
> = {
    shown: { label: 'Shown', color: 'var(--text-muted)' },
    accepted: { label: 'Accepted', color: 'var(--wellbeing)' },
    dismissed: { label: 'Dismissed', color: 'var(--text-muted)' },
    undone: { label: 'Undone', color: 'var(--break)' },
}

function relativeTime(iso: string): string {
    const then = new Date(iso).getTime()
    const diff = Date.now() - then
    if (!Number.isFinite(then)) return ''
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString()
}

function ActivityItem({ activity }: { activity: Activity }) {
    const meta = OUTCOME_META[activity.outcome]
    return (
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[var(--border-default)] last:border-0">
            <div className="min-w-0 flex items-center gap-3">
                <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
                    style={{ color: meta.color, background: 'var(--bg-tertiary)' }}
                >
                    {meta.label}
                </span>
                <span className="text-sm text-[var(--text-secondary)] truncate">
                    {activity.title}
                </span>
            </div>
            <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
                {relativeTime(activity.at)}
            </span>
        </div>
    )
}

export function AssistSettings() {
    const rules = useAutomationStore((s) => s.rules)
    const history = useAutomationStore((s) => s.history)
    const setEnabled = useAutomationStore((s) => s.setEnabled)

    return (
        <div className="flex flex-col gap-7">
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed max-w-lg">
                Assistance is optional. Each rule is off until you turn it on, surfaces
                one suggestion at a time, and never changes your work on its own.
            </p>

            <Group title="Rules">
                {rules.map((rule) => (
                    <RuleRow
                        key={rule.id}
                        label={rule.title}
                        description={rule.summary}
                        value={rule.isEnabled}
                        onChange={(v) => setEnabled(rule.id, v)}
                    />
                ))}
            </Group>

            <Group title="Activity">
                {history.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="text-sm font-semibold text-[var(--text-secondary)]">
                            Nothing yet
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1 leading-relaxed">
                            When a suggestion appears or you act on one, it shows up here.
                        </p>
                    </div>
                ) : (
                    history.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                    ))
                )}
            </Group>
        </div>
    )
}
