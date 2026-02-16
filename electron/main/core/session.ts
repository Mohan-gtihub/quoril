import { powerMonitor } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getActiveWindow, ActiveWindow } from './collector'
import { contextManager } from './context'
import { dbOps } from '../db'
import { stateMachine, TrackerState } from './state'

interface SessionState {
    id: string
    appName: string
    title: string
    start: number // timestamp
    contextId: string
    pulses: number // number of checks
    activePulses: number // number of checks where not idle
}

class SessionManager {
    private currentSession: SessionState | null = null
    private checkInterval: NodeJS.Timeout | null = null
    private lastPulseTime: number = Date.now()
    private isInitialized = false
    private userId: string | null = null

    setUserId(id: string | null) {
        this.userId = id
    }

    async start() {
        if (!this.isInitialized) {
            powerMonitor.on('suspend', () => {
                console.log('[SessionManager] System suspending, stopping tracking...')
                this.stop()
            })

            powerMonitor.on('resume', () => {
                console.log('[SessionManager] System resumed, restarting tracking...')
                this.start()
            })
            this.isInitialized = true
        }

        if (this.checkInterval) return

        // Immediate first check
        await this.pulse()

        this.checkInterval = setInterval(() => {
            this.pulse()
        }, 5000)
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval)
            this.checkInterval = null
        }
        this.endCurrentSession()
    }

    getCurrentSession() {
        return this.currentSession
    }

    private async pulse() {
        const active = await getActiveWindow()
        const context = contextManager.getCurrentContext()

        if (!active) {
            this.endCurrentSession()
            return
        }

        // Increment current session pulses
        if (this.currentSession) {
            this.currentSession.pulses++
            if (!active.isIdle) {
                this.currentSession.activePulses++
            }
        }

        if (active.isIdle) {
            stateMachine.transition(TrackerState.IDLE)
            this.endCurrentSession()
            return
        }

        // Logic: if context.type is 'task', then it's FOCUS mode
        if (context.type === 'task') {
            stateMachine.transition(TrackerState.FOCUS)
        } else {
            stateMachine.transition(TrackerState.ACTIVE)
        }

        const isDifferent = !this.currentSession ||
            this.currentSession.appName !== active.appName ||
            this.currentSession.title !== active.title ||
            this.currentSession.contextId !== context.id

        if (isDifferent) {
            await this.endCurrentSession()
            this.startNewSession(active, context.id)
        } else if (this.currentSession) {
            // Checkpoint every 30 seconds
            const now = Date.now()
            if (now - this.lastPulseTime > 30000) {
                await this.updateCurrentSessionCheckpoint()
                this.lastPulseTime = now
            }
        }
    }

    private async updateCurrentSessionCheckpoint() {
        if (!this.currentSession) return
        const end = Date.now()
        const duration = Math.round((end - this.currentSession.start) / 1000)
        const intensity = this.currentSession.pulses > 0
            ? Math.round((this.currentSession.activePulses / this.currentSession.pulses) * 100)
            : 0

        try {
            await dbOps.exec(`
                UPDATE app_sessions 
                SET end_time = ?, duration_seconds = ?, activity_level = ?
                WHERE id = ?
            `, [new Date(end).toISOString(), duration, intensity, this.currentSession.id])
        } catch (e) {
            console.error('[SessionManager] Checkpoint failed:', e)
        }
    }

    private async startNewSession(active: ActiveWindow, contextId: string) {
        const id = uuidv4()
        const start = Date.now()
        const startISO = new Date(start).toISOString()

        this.currentSession = {
            id,
            appName: active.appName,
            title: active.title,
            start,
            contextId,
            pulses: 1,
            activePulses: active.isIdle ? 0 : 1
        }

        try {
            await this.ensureAppExists(active.appName, active.category)
            await dbOps.exec(`
                INSERT INTO app_sessions (id, user_id, app_id, context_id, start_time, end_time, window_title, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, this.userId, active.appName, contextId, startISO, startISO, active.title, startISO])
            this.lastPulseTime = start
        } catch (e) {
            console.error('[SessionManager] Initial save failed:', e)
        }
    }

    private async endCurrentSession() {
        if (!this.currentSession) return

        const end = Date.now()
        const duration = Math.round((end - this.currentSession.start) / 1000)
        const intensity = this.currentSession.pulses > 0
            ? Math.round((this.currentSession.activePulses / this.currentSession.pulses) * 100)
            : 0

        if (duration > 0) {
            const session = {
                id: this.currentSession.id,
                user_id: this.userId,
                app_id: this.currentSession.appName,
                context_id: this.currentSession.contextId,
                start_time: new Date(this.currentSession.start).toISOString(),
                end_time: new Date(end).toISOString(),
                duration_seconds: duration,
                window_title: this.currentSession.title,
                activity_level: intensity,
                created_at: new Date().toISOString()
            }

            try {
                // Ensure the app exists in the 'apps' table
                // Note: We don't have the category here, so we hope it was added at start
                await this.ensureAppExists(this.currentSession.appName)

                // Save session (using REPLACE because it was already inserted at start)
                await dbOps.exec(`
                    INSERT OR REPLACE INTO app_sessions (id, user_id, app_id, context_id, start_time, end_time, duration_seconds, window_title, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    session.id, session.user_id, session.app_id, session.context_id,
                    session.start_time, session.end_time, session.duration_seconds,
                    session.window_title, session.created_at
                ])
            } catch (e) {
                console.error('[SessionManager] Failed to save session:', e)
            }
        }

        this.currentSession = null
    }

    private async ensureAppExists(appName: string, category: string = 'Other') {
        try {
            await dbOps.exec(`
                INSERT INTO apps (id, name, category, created_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    category = excluded.category,
                    name = excluded.name
            `, [appName, appName, category, new Date().toISOString()])
        } catch (e) { }
    }
}

export const sessionManager = new SessionManager()
