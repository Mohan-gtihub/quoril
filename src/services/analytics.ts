/**
 * Product analytics — batched, fire-and-forget event capture into
 * public.product_events.
 *
 * ============================ PRIVACY CONTRACT ============================
 * `props` may contain ONLY:
 *   - opaque ids (task ids, canvas ids, list ids)
 *   - in-app route paths (e.g. '/planner')
 *   - enum values (priority, session type)
 *   - counts (numbers)
 *   - booleans
 *
 * `props` must NEVER contain:
 *   - task titles, note bodies, canvas/whiteboard content, list names
 *   - OS window titles or app names from screen-time tracking
 *   - URLs the user visits outside Quoril, or any page/document text
 *   - email addresses, names, or any other free-form user-authored string
 *
 * If you are adding a call site and are unsure whether a value is allowed:
 * it is not allowed. Send a boolean or a count derived from it instead.
 * =========================================================================
 *
 * Analytics is strictly best-effort. Every network path is wrapped so a
 * failure can never surface to the user or break a product flow, and the
 * whole service no-ops when there is no authenticated user (product_events
 * rows require a user_id).
 */

import { supabase } from '@/services/supabase'
import { logger } from '@/services/logger'
import { platform } from '@/services/platform'

const FLUSH_INTERVAL_MS = 15_000
const MAX_BATCH = 20
const HEARTBEAT_INTERVAL_MS = 60_000

interface ProductEventRow {
    user_id: string
    session_id: string
    event: string
    props: Record<string, unknown>
    app_version: string
    platform: string
    created_at: string
}

// Vite inlines package.json's version as __APP_VERSION__ (see vite.config).
// Same guarded read as services/feedbackService — under vitest the define is
// absent and a bare reference would be a ReferenceError.
declare const __APP_VERSION__: string
const APP_VERSION: string = (() => {
    try { return __APP_VERSION__ } catch { return '0.0.0' }
})()

// The electron platform is the only one advertising native overlay + local db;
// getPlatform() in services/platform/index.ts picks it from VITE_TARGET plus the
// presence of the preload bridge. Read the capability rather than the global so
// this file stays inside the platform-ports contract.
const PLATFORM_NAME: string = platform.capabilities.nativeOverlay ? 'electron' : 'web'

class Analytics {
    private sessionId: string | null = null
    private userId: string | null = null
    private buffer: ProductEventRow[] = []
    private flushTimer: ReturnType<typeof setInterval> | null = null
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null
    private started = false

    /** Begin a run. Generates the per-app-run session id. Idempotent. */
    init(): void {
        if (this.started) return
        this.started = true

        try {
            this.sessionId = crypto.randomUUID()
        } catch {
            // Non-secure contexts can lack randomUUID; a run without a session
            // id is still worth having for counts.
            this.sessionId = `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`
        }

        this.flushTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS)

        if (typeof window !== 'undefined') {
            const flushNow = () => void this.flush()
            window.addEventListener('beforeunload', flushNow)
            window.addEventListener('pagehide', flushNow)
            window.addEventListener('focus', () => this.startHeartbeat())
            window.addEventListener('blur', () => this.stopHeartbeat())
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') this.startHeartbeat()
                else this.stopHeartbeat()
            })

            if (document.visibilityState === 'visible') this.startHeartbeat()
        }

        logger.debug('analytics.initialized', { sessionId: this.sessionId })
    }

    /** Attach events to a user. Called on SIGNED_IN. */
    identify(userId: string): void {
        this.userId = userId
    }

    /** Detach the user and drop anything still buffered. Called on SIGNED_OUT. */
    reset(): void {
        void this.flush()
        this.userId = null
        this.buffer = []
    }

    /**
     * Queue an event. See the PRIVACY CONTRACT above for what `props` may hold.
     * No-ops without an authenticated user. Never throws.
     */
    track(event: string, props: Record<string, unknown> = {}): void {
        try {
            if (!this.userId || !this.sessionId) return

            this.buffer.push({
                user_id: this.userId,
                session_id: this.sessionId,
                event,
                props,
                app_version: APP_VERSION,
                platform: PLATFORM_NAME,
                created_at: new Date().toISOString(),
            })

            if (this.buffer.length >= MAX_BATCH) void this.flush()
        } catch (e) {
            logger.warn('analytics.track_failed', { event, error: String(e) })
        }
    }

    /** Send everything buffered. Never throws; drops the batch on failure. */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return

        const batch = this.buffer
        this.buffer = []

        try {
            const { error } = await supabase.from('product_events' as any).insert(batch as any)
            if (error) {
                logger.warn('analytics.flush_rejected', { count: batch.length, message: error.message })
            }
        } catch (e) {
            // Offline / DNS / aborted request. Deliberately dropped rather than
            // retried — analytics must never grow unbounded in memory.
            logger.warn('analytics.flush_failed', { count: batch.length, error: String(e) })
        }
    }

    private startHeartbeat(): void {
        if (this.heartbeatTimer) return
        this.heartbeatTimer = setInterval(() => {
            this.track('session.heartbeat')
        }, HEARTBEAT_INTERVAL_MS)
    }

    private stopHeartbeat(): void {
        if (!this.heartbeatTimer) return
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = null
    }

    /** Test-only teardown: stop timers and clear state. */
    _destroy(): void {
        if (this.flushTimer) clearInterval(this.flushTimer)
        this.flushTimer = null
        this.stopHeartbeat()
        this.buffer = []
        this.userId = null
        this.sessionId = null
        this.started = false
    }
}

export const analytics = new Analytics()
