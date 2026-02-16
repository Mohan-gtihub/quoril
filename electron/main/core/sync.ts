
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { app } from 'electron'

dotenv.config({ path: path.join(app.getAppPath(), '.env') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

class SyncManager {
    private supabase: SupabaseClient | null = null
    // @ts-ignore
    private userId: string | null = null

    constructor() {
        if (SUPABASE_URL && SUPABASE_KEY) {
            this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
        }
    }

    async setUserId(id: string | null, accessToken?: string | null) {
        this.userId = id
        // Note: We no longer set the session here because main process sync is disabled.
        // The renderer process (dataSyncService.ts) handles all synchronization.
        if (id) {
            console.log('[SyncManager] User set (Sync managed by renderer)')
        }
    }

    start() {
        // DISABLED: Sync is now handled by renderer's dataSyncService.ts
        // This main process sync was causing duplicate attempts and session conflicts
        console.log('[SyncManager] Sync handled by renderer process (dataSyncService.ts)')
    }

    stop() {
        // No-op
    }
}

export const syncManager = new SyncManager()
