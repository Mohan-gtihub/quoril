import { describe, it, expect, vi, beforeEach } from 'vitest'

/* ---- Hoist mock so it is available when vi.mock factory runs ---- */

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/services/supabase', () => ({
    supabase: {
        from: mockFrom,
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
    },
}))

/* ---- Mock authStore so getUserId() returns a test user ---- */

vi.mock('@/store/authStore', () => ({
    useAuthStore: {
        getState: vi.fn(() => ({ user: { id: 'test-user-id' } })),
    },
}))

/* ---- Mock dataSyncService (only used in electron path) ---- */

vi.mock('@/services/dataSyncService', () => ({
    dataSyncService: { trigger: vi.fn() },
}))

/* ---- Mock react-hot-toast ---- */

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

/* ---- Ensure no electronAPI on window (web environment) ---- */

beforeEach(() => {
    delete (window as any).electronAPI
    vi.clearAllMocks()

    // Default: supabase.from returns a chainable object resolving to empty data
    mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
    })
})

import { useWorkspaceStore } from '@/store/workspaceStore'

describe('workspaceStore — web (no electron)', () => {
    it('loadWorkspaces calls supabase.from("workspaces") when electronAPI is absent', async () => {
        // Confirm no electron
        expect((window as any).electronAPI).toBeUndefined()

        await useWorkspaceStore.getState().loadWorkspaces()

        expect(mockFrom).toHaveBeenCalledWith('workspaces')
    })

    it('loadWorkspaces sets workspaces from supabase data', async () => {
        const fakeWorkspace = {
            id: 'ws-1',
            user_id: 'test-user-id',
            name: 'My Workspace',
            color: '#6366f1',
            icon: 'briefcase',
            sort_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            synced: 1,
        }

        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [fakeWorkspace], error: null }),
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockReturnThis(),
        })

        // Reset store state
        useWorkspaceStore.setState({ workspaces: [], loading: false })

        await useWorkspaceStore.getState().loadWorkspaces()

        const { workspaces } = useWorkspaceStore.getState()
        expect(workspaces).toHaveLength(1)
        expect(workspaces[0].id).toBe('ws-1')
        expect(workspaces[0].name).toBe('My Workspace')
    })
})
