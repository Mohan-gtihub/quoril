
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

    setContext(type: string, refId: string | null = null) {
        this.contextType = type
        this.refId = refId
        this.currentContextId = refId || 'global'
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
