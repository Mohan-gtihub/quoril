export const BACKUP_KEY = 'quoril_time_backup'

/**
 * OPTIMIZED BACKUP SERVICE
 * No longer uses a separate table. Persists "hot" time updates directly 
 * to the tasks table for maximum efficiency and single-source-of-truth.
 */
export const backupService = {
    getAll: (): Record<string, number> => {
        try {
            const raw = localStorage.getItem(BACKUP_KEY)
            return raw ? JSON.parse(raw) : {}
        } catch (e) {
            console.error('Backup read failed', e)
            return {}
        }
    },

    get: (taskId: string): number | null => {
        const all = backupService.getAll()
        return typeof all[taskId] === 'number' ? all[taskId] : null
    },

    /**
     * SAVES TO LOCAL STORAGE AND DB
     */
    save: (taskId: string, seconds: number) => {
        try {
            // 1. Memory/LS Cache
            const all = backupService.getAll()
            all[taskId] = seconds
            localStorage.setItem(BACKUP_KEY, JSON.stringify(all))

            // 2. Direct Task Update (Efficient)
            if (window.electronAPI?.db) {
                window.electronAPI.db.updateTask(taskId, {
                    spent_s: seconds,
                    updated_at: new Date().toISOString()
                }).catch((err: unknown) => {
                    console.error("Failed to backup to DB", err)
                })
            }
        } catch (e) {
            console.error('Backup save failed', e)
        }
    },

    remove: (taskId: string) => {
        try {
            const all = backupService.getAll()
            delete all[taskId]
            localStorage.setItem(BACKUP_KEY, JSON.stringify(all))
        } catch (e) {
            console.error('Backup remove failed', e)
        }
    },

    hydrate: async () => {
        // Hydration from tasks table happens naturally through task loading
    }
}
