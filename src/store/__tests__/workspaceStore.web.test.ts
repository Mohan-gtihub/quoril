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
        getState: vi.fn(() => ({ user: { id: 'test-user-id', email: 'owner@example.com' } })),
    },
}))

/* ---- Mock dataSyncService (only used in electron path) ---- */

vi.mock('@/services/dataSyncService', () => ({
    dataSyncService: { trigger: vi.fn() },
}))

/* ---- Mock react-hot-toast ---- */

const { toastError, toastSuccess } = vi.hoisted(() => ({
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({ default: { error: toastError, success: toastSuccess } }))

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

    it('loadWorkspaces does not add a user_id filter so shared workspaces can pass RLS', async () => {
        const eq = vi.fn().mockReturnThis()
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq,
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockReturnThis(),
        })

        await useWorkspaceStore.getState().loadWorkspaces()

        expect(eq).not.toHaveBeenCalledWith('user_id', 'test-user-id')
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

    it('inviteToWorkspace grants access by email', async () => {
        const upsert = vi.fn().mockResolvedValue({ data: null, error: null })
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            upsert,
            update: vi.fn().mockReturnThis(),
        })

        useWorkspaceStore.setState({
            workspaces: [{
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
            }],
            membersByWorkspace: {},
        })

        const ok = await useWorkspaceStore.getState().inviteToWorkspace('ws-1', ' Teammate@Example.com ')

        expect(ok).toBe(true)
        expect(mockFrom).toHaveBeenCalledWith('workspace_members')
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                workspace_id: 'ws-1',
                email: 'teammate@example.com',
                role: 'editor',
                invited_by: 'test-user-id',
            }),
            { onConflict: 'workspace_id,email' }
        )
        expect(useWorkspaceStore.getState().membersByWorkspace['ws-1']).toHaveLength(1)
        expect(toastSuccess).toHaveBeenCalledWith('Workspace access granted')
    })

    it('inviteToWorkspace rejects invalid email without writing', async () => {
        const upsert = vi.fn().mockResolvedValue({ data: null, error: null })
        mockFrom.mockReturnValue({
            upsert,
        })

        useWorkspaceStore.setState({
            workspaces: [{
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
            }],
            membersByWorkspace: {},
        })

        const ok = await useWorkspaceStore.getState().inviteToWorkspace('ws-1', 'not-an-email')

        expect(ok).toBe(false)
        expect(upsert).not.toHaveBeenCalled()
        expect(toastError).toHaveBeenCalledWith('Enter a valid email address')
    })

    it('inviteToWorkspace rejects duplicate teammate emails', async () => {
        const upsert = vi.fn().mockResolvedValue({ data: null, error: null })
        mockFrom.mockReturnValue({ upsert })

        useWorkspaceStore.setState({
            workspaces: [{
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
            }],
            membersByWorkspace: {
                'ws-1': [{
                    id: 'member-1',
                    workspace_id: 'ws-1',
                    email: 'teammate@example.com',
                    role: 'editor',
                    invited_by: 'test-user-id',
                    accepted_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    deleted_at: null,
                }]
            },
        })

        const ok = await useWorkspaceStore.getState().inviteToWorkspace('ws-1', 'teammate@example.com')

        expect(ok).toBe(false)
        expect(upsert).not.toHaveBeenCalled()
        expect(toastError).toHaveBeenCalledWith('That teammate already has access')
    })
})
