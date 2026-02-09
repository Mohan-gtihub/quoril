
import { sessionManager } from './session'
import { contextManager } from './context'

class TrackingEngine {
    async start() {
        console.log('[TrackingEngine] Initializing System Agent...')
        await sessionManager.start()
        console.log('[TrackingEngine] Running.')
    }

    async stop() {
        console.log('[TrackingEngine] Stopping...')
        await sessionManager.stop()
    }

    setTaskContext(taskId: string | null) {
        if (taskId) {
            contextManager.setContext('task', taskId)
        } else {
            contextManager.setContext('global')
        }
    }
}

export const trackingEngine = new TrackingEngine()
