import { sessionManager } from './session'
import { contextManager } from './context'
import { syncManager } from './sync'

class TrackingEngine {
    async start() {
        console.log('[TrackingEngine] Initializing System Agent...')
        await sessionManager.start()
        syncManager.start()
        console.log('[TrackingEngine] Running.')
    }

    async stop() {
        console.log('[TrackingEngine] Stopping...')
        await sessionManager.stop()
        syncManager.stop()
    }

    getLiveSession() {
        return sessionManager.getCurrentSession()
    }

    async setTaskContext(taskId: string | null) {
        if (taskId) {
            await contextManager.setContext('task', taskId)
        } else {
            await contextManager.setContext('global')
        }
    }

    setUserId(userId: string | null, accessToken?: string | null) {
        sessionManager.setUserId(userId)
        syncManager.setUserId(userId, accessToken)
    }
}

export const trackingEngine = new TrackingEngine()
