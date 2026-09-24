// Safe Automation store — owns persistence (rules, activity history, per-rule
// rate-limit stamps) and performs an accepted recommendation's side effect. The
// engine (services/automation/automationEngine) proposes; this store decides and
// records. It surfaces at most one recommendation at a time (`current`), never
// mutating the user's work on its own beyond the explicit action they accept.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
    DEFAULT_RULES,
    evaluateRules,
    type Rule,
    type Recommendation,
    type Activity,
    type ActivityOutcome,
    type AutomationContext,
    type CalendarCommitment,
} from '@/services/automation/automationEngine'

import { useTaskStore } from './taskStore'
import { useFocusStore } from './focusStore'
import { useAuthStore } from './authStore'
import { platform } from '@/services/platform'

const HISTORY_CAP = 100

/**
 * Merge persisted rules onto DEFAULT_RULES by id: new default rules appear for
 * existing users, while a user's on/off choice on a known rule survives. Order
 * follows DEFAULT_RULES (priority order the engine relies on).
 */
function mergeRules(persisted: Rule[] | undefined): Rule[] {
    const byId = new Map((persisted ?? []).map((r) => [r.id, r]))
    return DEFAULT_RULES.map((def) => {
        const saved = byId.get(def.id)
        // Take the latest copy/summary/title/action from defaults, keep the
        // user's isEnabled if we have a saved value for this rule.
        return saved ? { ...def, isEnabled: saved.isEnabled } : { ...def }
    })
}

interface AutomationState {
    /* Persisted */
    rules: Rule[]
    history: Activity[]
    lastShown: Record<string, number>

    /* Transient — never persisted */
    current: Recommendation | null

    /* Actions */
    setEnabled: (ruleId: string, enabled: boolean) => void
    evaluate: () => Promise<void>
    accept: () => Recommendation | null
    dismiss: () => void
    recordUndo: (ruleId: string, title: string, ref?: string) => void
}

export const useAutomationStore = create<AutomationState>()(
    persist(
        (set, get) => {
            /** Push an Activity, capping history to the most recent HISTORY_CAP. */
            const appendActivity = (
                ruleId: string,
                title: string,
                outcome: ActivityOutcome,
                undoReference?: string | null,
            ) => {
                const entry: Activity = {
                    id: crypto.randomUUID(),
                    ruleId,
                    title,
                    outcome,
                    at: new Date().toISOString(),
                    undoReference: undoReference ?? null,
                }
                set((s) => ({ history: [entry, ...s.history].slice(0, HISTORY_CAP) }))
            }

            return {
                rules: mergeRules(undefined),
                history: [],
                lastShown: {},
                current: null,

                setEnabled: (ruleId, enabled) => {
                    set((s) => ({
                        rules: s.rules.map((r) =>
                            r.id === ruleId ? { ...r, isEnabled: enabled } : r,
                        ),
                        // Disabling the rule behind the live suggestion retracts it.
                        current:
                            !enabled && s.current?.ruleId === ruleId ? null : s.current,
                    }))
                },

                evaluate: async () => {
                    // One recommendation at a time — never stack.
                    if (get().current) return

                    const now = new Date()

                    // Calendar commitments — best-effort. A missing/failed calendar
                    // must never break evaluation, so fall back to an empty window.
                    let calendar: CalendarCommitment[] = []
                    try {
                        const userId = useAuthStore.getState().user?.id
                        if (userId) {
                            const fromISO = new Date(now.getTime() - 20 * 60_000).toISOString()
                            const toISO = new Date(now.getTime() + 12 * 60 * 60_000).toISOString()
                            const rows = await platform.calendar.list(userId, fromISO, toISO)
                            calendar = (rows ?? []).map((row: any) => ({
                                title: row.title,
                                start: new Date(row.start_at),
                                end: new Date(row.end_at),
                            }))
                        }
                    } catch {
                        calendar = []
                    }

                    // Focused time today — the live focus store tracks accumulated
                    // seconds in `elapsed`; fall back to 0 if unavailable.
                    const focusedSecondsToday = useFocusStore.getState().elapsed ?? 0

                    const ctx: AutomationContext = {
                        now,
                        tasks: useTaskStore.getState().tasks,
                        calendar,
                        focusedSecondsToday,
                        // Screen-stretch tracking is best-effort and not wired yet.
                        uninterruptedScreenMinutes: 0,
                    }

                    const rec = evaluateRules(get().rules, ctx, get().lastShown)
                    if (!rec) return

                    set((s) => ({
                        current: rec,
                        lastShown: { ...s.lastShown, [rec.ruleId]: now.getTime() },
                    }))
                    appendActivity(rec.ruleId, rec.title, 'shown')
                },

                accept: () => {
                    const rec = get().current
                    if (!rec) return null

                    // Perform only the side effects a store can safely own. Actions
                    // that mean "go look at this screen" are navigation — the banner
                    // handles those using the returned recommendation.
                    const focus = useFocusStore.getState()
                    switch (rec.action) {
                        case 'startFocus':
                            if (rec.taskId) void focus.startFocus(rec.taskId)
                            break
                        case 'takeBreak':
                            void focus.startBreak()
                            break
                        // reviewCarryover | chooseNextTask | moveConflictingTask |
                        // prepareForMeeting → navigation, handled by the caller.
                        default:
                            break
                    }

                    appendActivity(rec.ruleId, rec.title, 'accepted')
                    set({ current: null })
                    return rec
                },

                dismiss: () => {
                    const rec = get().current
                    if (!rec) return
                    appendActivity(rec.ruleId, rec.title, 'dismissed')
                    set({ current: null })
                },

                recordUndo: (ruleId, title, ref) => {
                    appendActivity(ruleId, title, 'undone', ref)
                },
            }
        },
        {
            name: 'automation-storage',
            version: 1,
            // `current` is transient — never persist a live suggestion.
            partialize: (s) => ({
                rules: s.rules,
                history: s.history,
                lastShown: s.lastShown,
            }),
            // Re-merge persisted rules against DEFAULT_RULES so new built-in rules
            // appear for returning users while their toggles survive.
            merge: (persisted, current) => {
                const p = (persisted ?? {}) as Partial<AutomationState>
                return {
                    ...current,
                    ...p,
                    rules: mergeRules(p.rules),
                    history: p.history ?? [],
                    lastShown: p.lastShown ?? {},
                    current: null,
                }
            },
        },
    ),
)
