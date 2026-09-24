// Owns the cached briefing, the staleness policy and the refresh cooldown —
// the Electron port of Swift's InsightStore.
//
// The single rule this store exists to enforce: the page never waits on the
// network. It renders whatever is cached, immediately, and refreshes behind the
// user. The hosted model has been measured taking tens of seconds, so a
// synchronous design would show someone a very long spinner.

import { create } from 'zustand'
import { platform } from '@/services/platform'
import { useSettingsStore } from '@/store/settingsStore'
import { buildInsightPayloadFor } from '@/services/insights/insightPayloadSource'
import {
    validateBriefing,
    BriefingValidationError,
    type InsightBriefing,
} from '@/services/insights/insightBriefing'
import { numbersPresent } from '@/services/insights/insightPayload'

/** Regenerate at most daily — advice that changes every glance reads as noise. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000
/** Manual-refresh cooldown: long enough not to burn shared quota. */
const COOLDOWN_MS = 60 * 60 * 1000
const CACHE_KEY = 'insight_briefing_v1'

/** `.idle` | `.generating` | `{ refreshFailed }`. */
export type InsightState = 'idle' | 'generating' | { refreshFailed: string }

interface InsightStoreState {
    briefing: InsightBriefing | null
    state: InsightState
    lastAttempt: number | null
    /** Guards against concurrent refreshes. Not persisted, not for the view. */
    inFlight: boolean

    /** Milliseconds until the manual refresh cooldown expires (0 when ready). */
    cooldownRemaining: () => number
    /** True when there is no briefing or it is older than staleAfter. */
    isStale: () => boolean

    /** Called when the page appears: render cache, refresh only if stale. */
    load: () => Promise<void>
    /** `force` = the user pressed Refresh (still respects the cooldown). */
    refresh: (force: boolean) => Promise<void>
}

function friendlyError(err: unknown): string {
    if (err instanceof BriefingValidationError) {
        // The user cannot act on "the model invented 47"; it is our problem.
        return "Couldn't read the response. We'll try again later."
    }
    return "Couldn't refresh right now."
}

export const useInsightStore = create<InsightStoreState>((set, get) => ({
    briefing: null,
    state: 'idle',
    lastAttempt: null,
    inFlight: false,

    cooldownRemaining: () => {
        const { lastAttempt } = get()
        if (lastAttempt == null) return 0
        return Math.max(COOLDOWN_MS - (Date.now() - lastAttempt), 0)
    },

    isStale: () => {
        const { briefing } = get()
        if (!briefing) return true
        return Date.now() - new Date(briefing.generatedAt).getTime() > STALE_AFTER_MS
    },

    load: async () => {
        // Render the cache immediately if we don't already have a briefing in memory.
        if (!get().briefing) {
            try {
                const cached = await platform.store.get<InsightBriefing>(CACHE_KEY)
                if (cached && !get().briefing) set({ briefing: cached })
            } catch (err) {
                console.error('[Insights] cache unreadable', err)
            }
        }
        // Refresh behind the user only when the briefing is a day old (or absent).
        if (get().isStale()) void get().refresh(false)
    },

    refresh: async (force: boolean) => {
        const s = get()
        if (s.inFlight) return
        if (force && s.cooldownRemaining() > 0) return
        // A background (non-forced) refresh only fires when actually stale.
        if (!force && !s.isStale()) return

        set({ inFlight: true, lastAttempt: Date.now(), state: 'generating' })
        try {
            // Consent is read at call time, never cached — turning it off takes
            // effect on the very next generation.
            const shares = useSettingsStore.getState().shareActivityPatterns
            const payload = await buildInsightPayloadFor(30, shares)
            if (!payload) {
                // A null payload means the read failed — our problem, not "no data".
                set({ state: { refreshFailed: "Couldn't read your data just now." } })
                return
            }

            const response = await platform.insights.generate(payload)
            if (!response.ok) {
                set({ state: { refreshFailed: response.error || "Couldn't refresh right now." } })
                return
            }

            // The backend returns `result` as a parsed object (the briefing). The
            // validator wants text, so stringify objects; pass strings through.
            const text = typeof response.result === 'string'
                ? response.result
                : JSON.stringify(response.result)

            const validated = validateBriefing(text, numbersPresent(payload))
            validated.generatedAt = new Date().toISOString()

            set({ briefing: validated, state: 'idle' })
            try {
                await platform.store.set(CACHE_KEY, validated)
            } catch (err) {
                console.error('[Insights] cache unwritable', err)
            }
        } catch (err) {
            // Keep the last good briefing on screen; only note why it didn't update.
            console.error('[Insights] refresh failed', err)
            set({ state: { refreshFailed: friendlyError(err) } })
        } finally {
            set({ inFlight: false })
        }
    },
}))
