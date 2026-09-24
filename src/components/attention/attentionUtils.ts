import type { TimelineEntry } from '@/components/screentime/useScreenTimeData'

/* ═══════════════════════════════════════════════════════════════
   Attention — shared model + helpers

   Ports the Swift AttentionReplayView's data shaping to the web:
   app sessions and deliberate focus sessions laid on ONE time axis,
   plus the derived "story" numbers (longest stretch, switches, tops).
═══════════════════════════════════════════════════════════════ */

// Category palette kept in lock-step with ScreenTime.tsx so the whole
// Digital-Wellbeing surface reads as one system.
export const CATEGORY_COLORS: Record<string, string> = {
    Development: 'var(--focus)',
    Work: 'var(--focus)',
    Communication: 'var(--wellbeing)',
    Web: 'var(--break)',
    Entertainment: '#8b5cf6',
    Gaming: '#f08050',
    Other: '#94a3b8',
    Idle: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
}

export function getCategoryColor(cat: string): string {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other
}

export function fmtDuration(sec: number): string {
    if (!sec || sec <= 0) return '0m'
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
}

export function fmtClock(iso: string): string {
    const d = new Date(iso)
    let h = d.getHours()
    const m = d.getMinutes()
    const ampm = h < 12 ? 'AM' : 'PM'
    h = h % 12
    if (h === 0) h = 12
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function fmtHourLabel(h: number): string {
    if (h === 0) return '12a'
    if (h === 12) return '12p'
    return h < 12 ? `${h}a` : `${h - 12}p`
}

/* ─── Raw focus session (focus_sessions row: SELECT *) ─────── */

export interface RawFocusSession {
    id?: string
    type?: string        // 'focus' | 'break' | ...
    seconds?: number
    start_time?: string
    end_time?: string
    metadata?: string
}

/* ─── Normalised block on the shared timeline ──────────────── */

export interface AttentionBlock {
    id: string
    kind: 'app' | 'focus'
    title: string
    category: string
    startMs: number
    endMs: number
    seconds: number
    windowTitle?: string
}

export interface AttentionModel {
    appBlocks: AttentionBlock[]
    focusBlocks: AttentionBlock[]
    firstMs: number | null
    lastMs: number | null
    trackedSeconds: number
    focusSeconds: number
    contextSwitches: number
    longestStretch: AttentionBlock | null
    longestFocus: AttentionBlock | null
    categoryTotals: { category: string; seconds: number }[]
    hasData: boolean
}

const EMPTY: AttentionModel = {
    appBlocks: [], focusBlocks: [], firstMs: null, lastMs: null,
    trackedSeconds: 0, focusSeconds: 0, contextSwitches: 0,
    longestStretch: null, longestFocus: null, categoryTotals: [], hasData: false,
}

/**
 * Build the shared-axis model. App sessions come from screenTime.getData
 * (appTimeline); focus sessions from platform.data.listSessions filtered to
 * the selected day. Consecutive same-app slices are merged so the lane and the
 * "longest stretch" reflect continuous attention, not raw capture granularity.
 */
export function buildAttentionModel(
    timeline: TimelineEntry[],
    sessions: RawFocusSession[],
    dayISO: string,
): AttentionModel {
    const dayStart = new Date(dayISO + 'T00:00:00').getTime()
    const dayEnd = dayStart + 24 * 3600 * 1000

    // ── App blocks (merge consecutive same-app) ──
    const raw = [...timeline]
        .filter(e => e.startTime && e.endTime)
        .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))

    const appBlocks: AttentionBlock[] = []
    for (const e of raw) {
        const startMs = +new Date(e.startTime)
        const endMs = Math.max(startMs, +new Date(e.endTime))
        const last = appBlocks[appBlocks.length - 1]
        // Merge if same app and gap under 90s
        if (last && last.title === e.appName && startMs - last.endMs < 90_000) {
            last.endMs = endMs
            last.seconds += e.durationSeconds
            if (e.windowTitle) last.windowTitle = e.windowTitle
        } else {
            appBlocks.push({
                id: `app-${appBlocks.length}-${startMs}`,
                kind: 'app',
                title: e.appName,
                category: e.category || 'Other',
                startMs,
                endMs,
                seconds: e.durationSeconds,
                windowTitle: e.windowTitle,
            })
        }
    }

    // ── Focus blocks (clamp to day) ──
    const focusBlocks: AttentionBlock[] = []
    for (const s of sessions) {
        if (!s.start_time) continue
        if ((s.type || 'focus') === 'break') continue
        const startMs = +new Date(s.start_time)
        const endMs = s.end_time
            ? +new Date(s.end_time)
            : startMs + (s.seconds ?? 0) * 1000
        if (endMs <= dayStart || startMs >= dayEnd) continue // not this day
        const cs = Math.max(startMs, dayStart)
        const ce = Math.min(endMs, dayEnd)
        let title = 'Focus session'
        try {
            const meta = s.metadata ? JSON.parse(s.metadata) : null
            if (meta?.taskTitle) title = meta.taskTitle
            else if (meta?.label) title = meta.label
        } catch { /* metadata may be plain / absent */ }
        focusBlocks.push({
            id: s.id || `focus-${focusBlocks.length}-${startMs}`,
            kind: 'focus',
            title,
            category: 'Focus',
            startMs: cs,
            endMs: ce,
            seconds: s.seconds ?? Math.round((ce - cs) / 1000),
        })
    }

    if (appBlocks.length === 0 && focusBlocks.length === 0) return EMPTY

    const allStarts = [...appBlocks, ...focusBlocks].map(b => b.startMs)
    const allEnds = [...appBlocks, ...focusBlocks].map(b => b.endMs)
    const firstMs = allStarts.length ? Math.min(...allStarts) : null
    const lastMs = allEnds.length ? Math.max(...allEnds) : null

    const trackedSeconds = appBlocks.reduce((s, b) => s + b.seconds, 0)
    const focusSeconds = focusBlocks.reduce((s, b) => s + b.seconds, 0)

    // Context switches: an app block that differs from the one before it.
    let contextSwitches = 0
    for (let i = 1; i < appBlocks.length; i++) {
        if (appBlocks[i].title !== appBlocks[i - 1].title) contextSwitches++
    }

    const longestStretch = appBlocks.reduce<AttentionBlock | null>(
        (best, b) => (!best || b.seconds > best.seconds ? b : best), null,
    )
    const longestFocus = focusBlocks.reduce<AttentionBlock | null>(
        (best, b) => (!best || b.seconds > best.seconds ? b : best), null,
    )

    const catMap = new Map<string, number>()
    for (const b of appBlocks) catMap.set(b.category, (catMap.get(b.category) ?? 0) + b.seconds)
    const categoryTotals = [...catMap.entries()]
        .map(([category, seconds]) => ({ category, seconds }))
        .sort((a, b) => b.seconds - a.seconds)

    return {
        appBlocks, focusBlocks, firstMs, lastMs,
        trackedSeconds, focusSeconds, contextSwitches,
        longestStretch, longestFocus, categoryTotals, hasData: true,
    }
}

/** The app block in front at a given absolute timestamp (ms). */
export function blockAt(blocks: AttentionBlock[], ms: number): AttentionBlock | null {
    return blocks.find(b => ms >= b.startMs && ms < b.endMs) ?? null
}
