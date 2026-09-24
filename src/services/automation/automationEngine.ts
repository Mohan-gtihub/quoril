// Safe automation engine — a deterministic port of Swift's SafeAutomationEngine.
// It PROPOSES; it never writes. Every rule is opt-in (off by default), the engine
// surfaces at most one recommendation at a time, and each rule is rate-limited to
// once per hour. The store owns persistence (rules, history) and performing an
// accepted action; this module is pure logic over an immutable Context snapshot.

import type { Task } from '@/types/database'

export type Trigger =
    | 'calendarChanged'
    | 'taskChanged'
    | 'focusChanged'
    | 'screenTimeChanged'
    | 'dayBoundary'

export type Condition =
    | 'meetingSoon'
    | 'meetingJustEnded'
    | 'dueTimeIsBusy'
    | 'activeTaskWithoutFocus'
    | 'overdueCarryover'
    | 'longScreenStretch'

export type SuggestedAction =
    | 'prepareForMeeting'
    | 'chooseNextTask'
    | 'moveConflictingTask'
    | 'startFocus'
    | 'reviewCarryover'
    | 'takeBreak'

export interface Rule {
    id: string
    title: string
    summary: string
    trigger: Trigger
    condition: Condition
    action: SuggestedAction
    isEnabled: boolean
}

export interface CalendarCommitment {
    title: string
    start: Date
    end: Date
}

export interface AutomationContext {
    now: Date
    tasks: Task[]
    calendar: CalendarCommitment[]
    focusedSecondsToday: number
    uninterruptedScreenMinutes: number
}

export interface Recommendation {
    id: string
    ruleId: string
    title: string
    reason: string
    actionLabel: string
    action: SuggestedAction
    /** The task the action should operate on, when the condition names one. */
    taskId?: string
}

export type ActivityOutcome = 'shown' | 'accepted' | 'dismissed' | 'undone'

export interface Activity {
    id: string
    ruleId: string
    title: string
    outcome: ActivityOutcome
    at: string
    undoReference?: string | null
}

/** The six built-in rules. All ship disabled — assistance is strictly opt-in. */
export const DEFAULT_RULES: Rule[] = [
    { id: 'meeting-prep', title: 'Meeting preparation', summary: 'Offer a prep block shortly before a meeting.', trigger: 'calendarChanged', condition: 'meetingSoon', action: 'prepareForMeeting', isEnabled: false },
    { id: 'post-meeting', title: 'Post-meeting next step', summary: 'Help choose the next task after a meeting ends.', trigger: 'calendarChanged', condition: 'meetingJustEnded', action: 'chooseNextTask', isEnabled: false },
    { id: 'due-conflict', title: 'Due-time conflicts', summary: 'Flag a task whose due time is occupied.', trigger: 'taskChanged', condition: 'dueTimeIsBusy', action: 'moveConflictingTask', isEnabled: false },
    { id: 'forgotten-focus', title: 'Forgotten focus', summary: 'Offer focus when an active task has no captured time.', trigger: 'focusChanged', condition: 'activeTaskWithoutFocus', action: 'startFocus', isEnabled: false },
    { id: 'carryover', title: 'End-of-day carryover', summary: 'Surface one overdue commitment instead of the whole backlog.', trigger: 'dayBoundary', condition: 'overdueCarryover', action: 'reviewCarryover', isEnabled: false },
    { id: 'break-coach', title: 'Break coaching', summary: 'Suggest a short break after a long unbroken screen stretch.', trigger: 'screenTimeChanged', condition: 'longScreenStretch', action: 'takeBreak', isEnabled: false },
]

const RATE_LIMIT_MS = 3_600_000 // one recommendation per rule per hour

const isOpen = (t: Task) => t.status !== 'done'
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

function make(rule: Rule, title: string, reason: string, actionLabel: string, taskId?: string): Recommendation {
    return { id: `${rule.id}-${title}`, ruleId: rule.id, title, reason, actionLabel, action: rule.action, taskId }
}

/** Derive a recommendation for one rule, or null when its condition isn't met. */
export function recommendationFor(rule: Rule, ctx: AutomationContext): Recommendation | null {
    const open = ctx.tasks.filter(isOpen)
    const nowMs = ctx.now.getTime()

    switch (rule.condition) {
        case 'meetingSoon': {
            const event = ctx.calendar
                .filter((e) => e.start.getTime() > nowMs && e.start.getTime() - nowMs <= 30 * 60000)
                .sort((a, b) => a.start.getTime() - b.start.getTime())[0]
            if (!event) return null
            const mins = Math.max(Math.floor((event.start.getTime() - nowMs) / 60000), 1)
            return make(rule, `Prepare for ${event.title}`, `It starts in ${mins} minutes.`, 'Make a Prep Block')
        }
        case 'meetingJustEnded': {
            const event = ctx.calendar.find((e) => e.end.getTime() <= nowMs && nowMs - e.end.getTime() <= 15 * 60000)
            if (!event) return null
            return make(rule, `Choose what follows ${event.title}`, 'A deliberate next step prevents the post-meeting drift.', 'Choose Next Task')
        }
        case 'dueTimeIsBusy': {
            const task = open.find((t) => {
                if (!t.due_at) return false
                const due = Date.parse(t.due_at)
                return ctx.calendar.some((e) => e.start.getTime() <= due && e.end.getTime() >= due)
            })
            if (!task) return null
            return make(rule, `${task.title} collides with your calendar`, 'Its due time is already occupied.', 'Find Another Opening', task.id)
        }
        case 'activeTaskWithoutFocus': {
            if (ctx.focusedSecondsToday >= 60) return null
            const task = open.find((t) => t.status === 'active')
            if (!task) return null
            return make(rule, `Already working on ${task.title}?`, 'It is active, but no focus time has been captured today.', 'Start Focus', task.id)
        }
        case 'overdueCarryover': {
            const start = startOfDay(ctx.now).getTime()
            const overdue = open.filter((t) => (t.due_at ? Date.parse(t.due_at) : Infinity) < start)
            if (!overdue.length) return null
            return make(rule, 'Clear one carryover', `${overdue.length} overdue ${overdue.length === 1 ? 'task is' : 'tasks are'} competing for attention.`, 'Review Carryover')
        }
        case 'longScreenStretch': {
            if (ctx.uninterruptedScreenMinutes < 50) return null
            return make(rule, 'Step away for three minutes', `You have been continuously at the screen for ${ctx.uninterruptedScreenMinutes} minutes.`, 'Take a Break')
        }
        default:
            return null
    }
}

/**
 * Evaluate all enabled rules against the context and return the single most
 * time-sensitive recommendation (rules are in priority order), respecting the
 * per-rule hourly rate limit. `lastShown` maps ruleId → epoch-ms last surfaced.
 * Pure: returns the pick and the ruleId to stamp; the store mutates state.
 */
export function evaluateRules(
    rules: Rule[],
    ctx: AutomationContext,
    lastShown: Record<string, number>,
): Recommendation | null {
    for (const rule of rules) {
        if (!rule.isEnabled) continue
        const last = lastShown[rule.id]
        if (last !== undefined && ctx.now.getTime() - last <= RATE_LIMIT_MS) continue
        const rec = recommendationFor(rule, ctx)
        if (rec) return rec
    }
    return null
}
