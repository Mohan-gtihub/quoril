import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    from: vi.fn(),
    sync: {
        setSyncing: vi.fn(),
        setPending: vi.fn(),
        setLastSync: vi.fn(),
        setError: vi.fn(),
    },
}))

vi.mock('@/services/supabase', () => ({
    supabase: {
        auth: { getSession: mocks.getSession },
        from: mocks.from,
    },
}))

vi.mock('@/store/syncStore', () => ({
    useSyncStore: { getState: () => mocks.sync },
}))

import { DataSyncService } from '../dataSyncService'

const user = { id: 'user-1' }

function setOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

function installDb(rows: any[]) {
    const getPending = vi.fn((table: string) => table === 'tasks' ? rows : [])
    const countPending = vi.fn(async (table: string) => table === 'tasks' ? rows.length : 0)
    const markSynced = vi.fn((table: string, id: string) => {
        if (table !== 'tasks') return
        const index = rows.findIndex((row) => row.id === id)
        if (index >= 0) rows.splice(index, 1)
    })

    window.electronAPI = {
        db: {
            getPending,
            countPending,
            markSynced,
            taskExists: vi.fn().mockResolvedValue(true),
        },
    } as any

    return { getPending, countPending, markSynced }
}

function taskRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'task-1',
        user_id: user.id,
        title: 'Offline task',
        status: 'todo',
        priority: 'medium',
        created_at: '2026-07-10T00:00:00.000Z',
        updated_at: '2026-07-10T00:00:00.000Z',
        ...overrides,
    }
}

async function sync(service: DataSyncService) {
    await (service as any).syncPendings()
}

beforeEach(() => {
    vi.clearAllMocks()
    setOnline(true)
    mocks.getSession.mockResolvedValue({ data: { session: { user } } })
})

afterEach(() => {
    delete (window as any).electronAPI
    vi.useRealTimers()
})

describe('DataSyncService offline recovery', () => {
    it('keeps an offline mutation local until a later sync succeeds', async () => {
        const rows = [taskRow()]
        const db = installDb(rows)
        const upsert = vi.fn().mockResolvedValue({ error: null })
        mocks.from.mockReturnValue({ upsert })
        const service = new DataSyncService()

        setOnline(false)
        await sync(service)
        expect(upsert).not.toHaveBeenCalled()
        expect(db.markSynced).not.toHaveBeenCalled()
        expect(rows).toHaveLength(1)

        setOnline(true)
        await sync(service)
        expect(upsert).toHaveBeenCalledTimes(1)
        expect(db.markSynced).toHaveBeenCalledWith('tasks', 'task-1')
        expect(rows).toHaveLength(0)
    })

    it('pushes deletions as tombstones instead of dropping them', async () => {
        const deletedAt = '2026-07-10T01:00:00.000Z'
        const rows = [taskRow({ deleted_at: deletedAt })]
        installDb(rows)
        const upsert = vi.fn().mockResolvedValue({ error: null })
        mocks.from.mockReturnValue({ upsert })
        const service = new DataSyncService()

        await sync(service)

        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'task-1', deleted_at: deletedAt }),
            { onConflict: 'id' },
        )
        expect(rows).toHaveLength(0)
    })

    it('reports rejected rows as pending rather than claiming a completed sync', async () => {
        const rows = [taskRow()]
        installDb(rows)
        mocks.from.mockReturnValue({
            upsert: vi.fn().mockResolvedValue({ error: { code: '42501', message: 'permission denied' } }),
        })
        const service = new DataSyncService()

        await sync(service)

        expect(rows).toHaveLength(1)
        expect(mocks.sync.setPending).toHaveBeenLastCalledWith(1)
        expect(mocks.sync.setLastSync).not.toHaveBeenCalled()
        expect(mocks.sync.setError).toHaveBeenCalledWith('1 change pending sync')
    })

    it('starts a pull followed by a push as soon as the network reconnects', async () => {
        vi.useFakeTimers()
        installDb([])
        const service = new DataSyncService()
        const pull = vi.spyOn(service, 'pull').mockResolvedValue()
        const syncPendings = vi.spyOn(service as any, 'syncPendings').mockResolvedValue(undefined)

        service.start()
        await Promise.resolve()
        await Promise.resolve()
        pull.mockClear()
        syncPendings.mockClear()

        window.dispatchEvent(new Event('online'))
        await Promise.resolve()
        await Promise.resolve()

        expect(pull).toHaveBeenCalledWith(true)
        expect(syncPendings).toHaveBeenCalled()
        service.stop()
    })
})
