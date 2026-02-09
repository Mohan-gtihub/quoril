
import { dbOps } from '../db'
import { v4 as uuidv4 } from 'uuid'

export interface WindowInfo {
    owner: {
        name: string
        processId: number
        path: string
    }
    title: string
}

export interface TrackingSession {
    appId: string
    appName: string
    title: string
    startTime: number // monotonic or UTC? user suggested monotonic for sessions, UTC for DB.
    contextId: string
}

class ContextManager {
    private currentContextId: string = 'global'
    private contextType: string = 'global'
    private refId: string | null = null

    async setContext(type: string, refId: string | null = null) {
        this.contextType = type
        this.refId = refId
        this.currentContextId = refId || 'global'

        try {
            await dbOps.exec(`
                INSERT OR IGNORE INTO contexts (id, type, ref_id, created_at)
                VALUES (?, ?, ?, ?)
            `, [this.currentContextId, type, refId, new Date().toISOString()])
        } catch (e) {
            console.error('[ContextManager] Failed to persist context:', e)
        }
    }

    getCurrentContext() {
        return {
            id: this.currentContextId,
            type: this.contextType,
            refId: this.refId
        }
    }
}

export const contextManager = new ContextManager()
