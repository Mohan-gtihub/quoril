
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { dbOps } from '../db'
import dotenv from 'dotenv'
import path from 'path'
import { app } from 'electron'

dotenv.config({ path: path.join(app.getAppPath(), '.env') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

class SyncManager {
    private supabase: SupabaseClient | null = null
    private userId: string | null = null
    private interval: NodeJS.Timeout | null = null
    private isSyncing: boolean = false

    constructor() {
        if (SUPABASE_URL && SUPABASE_KEY) {
            this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
        }
    }

    setUserId(id: string | null) {
        this.userId = id
        if (!id) {
            console.log('[SyncManager] User logged out, stopping sync.')
            this.stop()
        } else {
            console.log('[SyncManager] User set:', id)
            this.start()
        }
    }

    start() {
        if (this.interval) return

        // Run sync every 30 seconds
        this.interval = setInterval(() => this.performSync(), 30000)
        this.performSync() // Initial run
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
    }

    async performSync() {
        if (!this.supabase || !this.userId || this.isSyncing) return
        this.isSyncing = true

        console.log('[SyncManager] Starting background sync...')

        try {
            await this.syncTable('lists')
            await this.syncTable('tasks')
            await this.syncTable('subtasks')
            await this.syncTable('focus_sessions')
            await this.syncTable('app_sessions')

            console.log('[SyncManager] Sync cycle complete.')
        } catch (e) {
            console.error('[SyncManager] Sync cycle failed:', e)
        } finally {
            this.isSyncing = false
        }
    }

    private async syncTable(table: string) {
        if (!this.supabase || !this.userId) return

        const unsynced = dbOps.getPending(table) as any[]
        if (!unsynced || unsynced.length === 0) return

        console.log(`[SyncManager] Syncing ${unsynced.length} records from ${table}...`)

        // Prepare data for Supabase (clean up local-only fields if necessary)
        const data = unsynced.map((row: any) => {
            const { synced, ...rest } = row
            return {
                ...rest,
                user_id: this.userId // Ensure user_id is set
            }
        })

        const { error } = await this.supabase
            .from(table)
            .upsert(data, { onConflict: 'id' })

        if (error) {
            console.error(`[SyncManager] Failed to sync ${table}:`, error.message)
            return
        }

        // Mark as synced locally
        for (const row of unsynced) {
            dbOps.markSynced(table, row.id)
        }
    }
}

export const syncManager = new SyncManager()
