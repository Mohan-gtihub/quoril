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

    async setTaskContext(taskId: string | null) {
        if (taskId) {
            await contextManager.setContext('task', taskId)
        } else {
            await contextManager.setContext('global')
        }
    }

    setUserId(userId: string) {
        syncManager.setUserId(userId)
    }
}

export const trackingEngine = new TrackingEngine()
