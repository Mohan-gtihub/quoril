
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
}

class SessionManager {
    private currentSession: SessionState | null = null
    private checkInterval: NodeJS.Timeout | null = null
    private lastPulseTime: number = Date.now()

    async start() {
        if (this.checkInterval) return

        // Immediate first check
        await this.pulse()

        this.checkInterval = setInterval(() => {
            this.pulse()
        }, 5000) // 5s budget as per senior level proposal
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval)
            this.checkInterval = null
        }
        this.endCurrentSession()
    }

    private async pulse() {
        const active = await getActiveWindow()
        const context = contextManager.getCurrentContext()

        if (!active || active.isIdle) {
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

        try {
            await dbOps.exec(`
                UPDATE app_sessions 
                SET end_time = ?, duration_seconds = ?
                WHERE id = ?
            `, [new Date(end).toISOString(), duration, this.currentSession.id])
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
            contextId
        }

        try {
            await this.ensureAppExists(active.appName)
            await dbOps.exec(`
                INSERT INTO app_sessions (id, app_id, context_id, start_time, end_time, window_title, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [id, active.appName, contextId, startISO, startISO, active.title, startISO])
            this.lastPulseTime = start
        } catch (e) {
            console.error('[SessionManager] Initial save failed:', e)
        }
    }

    private async endCurrentSession() {
        if (!this.currentSession) return

        const end = Date.now()
        const duration = Math.round((end - this.currentSession.start) / 1000)

        if (duration > 0) {
            const session = {
                id: this.currentSession.id,
                app_id: this.currentSession.appName,
                context_id: this.currentSession.contextId,
                start_time: new Date(this.currentSession.start).toISOString(),
                end_time: new Date(end).toISOString(),
                duration_seconds: duration,
                window_title: this.currentSession.title,
                created_at: new Date().toISOString()
            }

            try {
                // Ensure the app exists in the 'apps' table
                await this.ensureAppExists(this.currentSession.appName)

                // Save session
                // We'll need to add a specialized db method for this
                // For now, use raw exec through dbOps if available or we add it
                await dbOps.exec(`
                    INSERT INTO app_sessions (id, app_id, context_id, start_time, end_time, duration_seconds, window_title, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    session.id, session.app_id, session.context_id,
                    session.start_time, session.end_time, session.duration_seconds,
                    session.window_title, session.created_at
                ])
            } catch (e) {
                console.error('[SessionManager] Failed to save session:', e)
            }
        }

        this.currentSession = null
    }

    private async ensureAppExists(appName: string) {
        try {
            await dbOps.exec(`
                INSERT OR IGNORE INTO apps (id, name, created_at)
                VALUES (?, ?, ?)
            `, [appName, appName, new Date().toISOString()])
        } catch (e) { }
    }
}

export const sessionManager = new SessionManager()
