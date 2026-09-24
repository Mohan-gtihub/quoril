// Natural-language task capture — type one line, get a structured task.
// A faithful port of Swift's QuickAdd: `!priority`, `~estimate`, and relative
// day words ("tomorrow", "friday", "next week") are parsed out of the title and
// surfaced as a live hint. Deterministic and dependency-free.
//
//   "Draft report friday !high ~90m"
//     → title "Draft report", priority high, due next Friday 23:59, estimate 90m

import type { TaskPriority } from '@/types/database'

export interface ParsedQuickAdd {
    title: string
    priority: TaskPriority | null
    /** ISO string for end-of-day of the resolved date, or null. */
    dueAt: string | null
    estimateMinutes: number | null
}

interface Match {
    start: number
    end: number
}

function endOfDay(base: Date, dayOffset: number): Date {
    const d = new Date(base)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(23, 59, 0, 0)
    return d
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** Parse a quick-add line. `now` is injectable for deterministic tests. */
export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
    let priority: TaskPriority | null = null
    let dueAt: string | null = null
    let estimate: number | null = null
    const ranges: Match[] = []

    // Priority: !high / !crit / !medium / !low
    const priorityMatch = input.match(/!(critical|crit|high|medium|med|low)\b/i)
    if (priorityMatch && priorityMatch.index !== undefined) {
        const token = priorityMatch[1].toLowerCase()
        priority =
            token === 'critical' || token === 'crit' ? 'critical'
            : token === 'high' ? 'high'
            : token === 'medium' || token === 'med' ? 'medium'
            : token === 'low' ? 'low'
            : null
        if (priority) ranges.push({ start: priorityMatch.index, end: priorityMatch.index + priorityMatch[0].length })
    }

    // Estimate: ~90m / ~2h / ~45
    const estimateMatch = input.match(/~(\d+)\s*(m|min|mins|h|hr|hrs)?\b/i)
    if (estimateMatch && estimateMatch.index !== undefined) {
        const value = parseInt(estimateMatch[1], 10)
        if (!Number.isNaN(value)) {
            const unit = (estimateMatch[2] ?? '').toLowerCase()
            estimate = unit.startsWith('h') ? value * 60 : value
            ranges.push({ start: estimateMatch.index, end: estimateMatch.index + estimateMatch[0].length })
        }
    }

    // Relative day words (checked longest-first so "day after tomorrow" wins).
    const dayPhrases: [RegExp, number][] = [
        [/\bday after tomorrow\b/i, 2],
        [/\bnext week\b/i, 7],
        [/\btomorrow\b/i, 1],
        [/\btonight\b/i, 0],
        [/\btoday\b/i, 0],
    ]
    for (const [regex, offset] of dayPhrases) {
        const m = input.match(regex)
        if (m && m.index !== undefined) {
            dueAt = endOfDay(now, offset).toISOString()
            ranges.push({ start: m.index, end: m.index + m[0].length })
            break
        }
    }

    // Weekday names → the NEXT occurrence (never today).
    if (!dueAt) {
        for (let i = 0; i < WEEKDAYS.length; i++) {
            const m = input.match(new RegExp(`\\b${WEEKDAYS[i]}\\b`, 'i'))
            if (m && m.index !== undefined) {
                const current = now.getDay()
                let delta = i - current
                if (delta <= 0) delta += 7
                dueAt = endOfDay(now, delta).toISOString()
                ranges.push({ start: m.index, end: m.index + m[0].length })
                break
            }
        }
    }

    // Strip tokens from the title, right-to-left so indices stay valid.
    let title = input
    for (const range of ranges.sort((a, b) => b.start - a.start)) {
        title = title.slice(0, range.start) + title.slice(range.end)
    }

    return {
        title: title.replace(/\s{2,}/g, ' ').trim(),
        priority,
        dueAt,
        estimateMinutes: estimate,
    }
}

function formatEstimate(minutes: number): string {
    if (minutes >= 60) {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return m ? `${h}h ${m}m` : `${h}h`
    }
    return `${minutes}m`
}

function formatRelativeDay(iso: string, now: Date): string {
    const due = new Date(iso)
    const days = Math.round((endOfDay(due, 0).getTime() - endOfDay(now, 0).getTime()) / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'tomorrow'
    return due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** The "High · tomorrow · 90m" line shown under the field as the user types. */
export function quickAddHint(parsed: ParsedQuickAdd, now: Date = new Date()): string | null {
    const parts: string[] = []
    if (parsed.priority) parts.push(parsed.priority.charAt(0).toUpperCase() + parsed.priority.slice(1))
    if (parsed.dueAt) parts.push(formatRelativeDay(parsed.dueAt, now))
    if (parsed.estimateMinutes) parts.push(formatEstimate(parsed.estimateMinutes))
    return parts.length ? parts.join(' · ') : null
}
