import { useState } from 'react'
import type { Connection, ConditionTrigger, DownstreamAction, EdgeCondition } from '@/types/canvas'

const TRIGGERS: { value: ConditionTrigger; label: string; needsMinutes?: boolean; needsThreshold?: boolean }[] = [
    { value: 'task_completed', label: 'Upstream task completed' },
    { value: 'task_started', label: 'Upstream task started' },
    { value: 'focus_session_ended', label: 'Focus session ended ≥ N min', needsMinutes: true },
    { value: 'checklist_complete', label: 'Checklist 100% complete' },
    { value: 'checklist_threshold', label: 'Checklist ≥ N% complete', needsThreshold: true },
    { value: 'all_upstream_met', label: 'All upstream dependencies met' },
    { value: 'manual', label: 'Manual advance only' },
]

const ACTIONS: { value: DownstreamAction; label: string }[] = [
    { value: 'unlock', label: 'Unlock target block' },
    { value: 'auto_start_focus', label: 'Auto-start focus session' },
    { value: 'mark_ready', label: 'Pulse + notify' },
    { value: 'promote_idea_to_task', label: 'Promote idea → task' },
]

export function ConditionEditor({
    connection, onSave, onCancel,
}: {
    connection: Connection
    onSave: (c: EdgeCondition) => void
    onCancel: () => void
}) {
    const existing = connection.condition
    const [trigger, setTrigger] = useState<ConditionTrigger>(existing?.trigger ?? 'task_completed')
    const [action, setAction] = useState<DownstreamAction>(existing?.action ?? 'unlock')
    const [minMinutes, setMinMinutes] = useState<number>(existing?.params?.minMinutes ?? 25)
    const [thresholdPct, setThresholdPct] = useState<number>(existing?.params?.thresholdPct ?? 80)

    const trigMeta = TRIGGERS.find((t) => t.value === trigger)!

    return (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-[440px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-2xl p-5 space-y-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Edge condition</div>

                <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">When</div>
                    <select value={trigger} onChange={(e) => setTrigger(e.currentTarget.value as ConditionTrigger)}
                        className="w-full text-xs px-2 py-1.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)]">
                        {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>

                {trigMeta.needsMinutes && (
                    <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Minimum minutes</div>
                        <input type="number" min={1} value={minMinutes} onChange={(e) => setMinMinutes(Number(e.currentTarget.value))}
                            className="w-full text-xs px-2 py-1.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)]" />
                    </div>
                )}

                {trigMeta.needsThreshold && (
                    <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Threshold %</div>
                        <input type="number" min={1} max={100} value={thresholdPct} onChange={(e) => setThresholdPct(Number(e.currentTarget.value))}
                            className="w-full text-xs px-2 py-1.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)]" />
                    </div>
                )}

                <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Then</div>
                    <select value={action} onChange={(e) => setAction(e.currentTarget.value as DownstreamAction)}
                        className="w-full text-xs px-2 py-1.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)]">
                        {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                </div>

                <div className="text-[10px] text-[var(--text-muted)] p-2 bg-[var(--bg-elevated)] rounded">
                    Preview: <b className="text-[var(--text-primary)]">{trigMeta.label}</b> → {ACTIONS.find((a) => a.value === action)!.label}
                </div>

                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)]">Cancel</button>
                    <button
                        onClick={() => onSave({
                            trigger, action,
                            params: {
                                ...(trigMeta.needsMinutes ? { minMinutes } : {}),
                                ...(trigMeta.needsThreshold ? { thresholdPct } : {}),
                            },
                        })}
                        className="px-3 py-1.5 text-xs rounded bg-[var(--accent-primary)] text-white"
                    >Save</button>
                </div>
            </div>
        </div>
    )
}
