
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { app } from 'electron'

dotenv.config({ path: path.join(app.getAppPath(), '.env') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

class SyncManager {
    private supabase: SupabaseClient | null = null
    // Retained for the sync paths the renderer will hand back. A suppression
    // comment used to sit here; it was suppressing nothing and has been removed.
    private userId: string | null = null

    constructor() {
        if (SUPABASE_URL && SUPABASE_KEY) {
            this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
        }
    }

    // accessToken is still passed by callers but unused: main-process sync is
    // disabled and the renderer owns the session. Prefixed with _ to keep the
    // signature stable without tripping no-unused-vars.
    async setUserId(id: string | null, _accessToken?: string | null) {
        this.userId = id
        // Note: We no longer set the session here because main process sync is disabled.
        // The renderer process (dataSyncService.ts) handles all synchronization.
    }

    start() {
        // DISABLED: Sync is now handled by renderer's dataSyncService.ts
        // This main process sync was causing duplicate attempts and session conflicts
    }

    stop() {
        // No-op
    }
}

export const syncManager = new SyncManager()
