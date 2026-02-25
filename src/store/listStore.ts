import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { localService } from '@/services/localStorage'
import type { List } from '@/types/database'
import type { Task } from '@/types/database'
import { supabase } from '@/services/supabase'
import toast from 'react-hot-toast'

/* ================= TYPES ================= */

interface ListState {

    /* State */

    lists: List[]
    archived: List[]
    archivedLists: List[]

    selectedListId: string | null

    loading: boolean
    error: string | null


    /* Core */

    load: () => Promise<void>
    loadArchived: () => Promise<void>
    syncFromCloud: () => Promise<void>


    /* Aliases (UI compatibility) */

    fetchLists: () => Promise<void>
    fetchArchivedLists: () => Promise<void>

    setSelectedList: (id: string | null) => void

    duplicateList: (id: string) => Promise<void>
    deleteList: (id: string) => Promise<void>
    restoreList: (id: string) => Promise<void>
    permanentDeleteList: (id: string) => Promise<void>

    getListStats: (id: string) => Promise<any | null>

    createList: (data: Partial<List>) => Promise<List | null>
    updateList: (id: string, data: Partial<List>) => Promise<void>


    /* New API */

    create: (data: Partial<List>) => Promise<List | null>
    update: (id: string, data: Partial<List>) => Promise<void>

    archive: (id: string) => Promise<void>
    restore: (id: string) => Promise<void>

    duplicate: (id: string) => Promise<void>

    reorderLists: (updates: { id: string; sort_order: number }[]) => Promise<void>
    select: (id: string | null) => void
    moveListToWorkspace: (listId: string, workspaceId: string | null) => Promise<void>
}

/* ================= STORE ================= */

export const useListStore = create<ListState>()(
    persist(

        (set, get) => ({

            /* ================= STATE ================= */

            lists: [],
            archived: [],
            archivedLists: [],

            selectedListId: null,

            loading: false,
            error: null,


            /* ================= LOAD ================= */

            load: async () => {
                try {
                    set({ loading: true, error: null })
                    const { data, error } = await localService.lists.list(false)

                    if (error) {
                        // If it's just "No session", don't treat it as a terminal error
                        if (error === 'No session') {
                            set({ loading: false })
                            return
                        }
                        throw new Error(error)
                    }

                    set({
                        lists: data || [],
                        loading: false
                    })
                } catch (err: any) {
                    console.error('[ListStore] load failed', err)
                    set({
                        error: err?.message || 'Failed to load lists',
                        loading: false
                    })
                }
            },


            loadArchived: async () => {
                try {
                    set({ loading: true, error: null })
                    const { data, error } = await localService.lists.list(true)

                    if (error) {
                        if (error === 'No session') {
                            set({ loading: false })
                            return
                        }
                        throw new Error(error)
                    }

                    set({
                        archived: data || [],
                        archivedLists: data || [],
                        loading: false
                    })
                } catch (err: any) {
                    console.error('[ListStore] loadArchived failed', err)
                    set({
                        error: err?.message || 'Failed to load archived',
                        loading: false
                    })
                }
            },


            /* ================= SYNC ================= */

            syncFromCloud: async () => {

                try {

                    const { data: { session } } =
                        await supabase.auth.getSession()

                    if (!session?.user) return


                    const { data, error } = await supabase
                        .from('lists')
                        .select('*')
                        .eq('user_id', session.user.id)

                    if (error || !data) return


                    if (window.electronAPI?.db) {

                        const db = window.electronAPI.db

                        for (const item of data as any[]) {
                            const [local] =
                                await db.exec(
                                    'SELECT * FROM lists WHERE id=?',
                                    [item.id]
                                )

                            // If Supabase doesn't have workspace_id yet (due to cache/missing column)
                            // DO NOT overwrite the local SQLite workspace_id with undefined/null.
                            // Preserve it so it can sync up later.
                            if (local && item.workspace_id === undefined) {
                                item.workspace_id = local.workspace_id
                            }

                            if (
                                !local ||
                                new Date(item.updated_at) >
                                new Date(local.updated_at)
                            ) {
                                await db.saveList(item)
                            }
                        }
                    }

                    // Refresh local state without re-triggering sync
                    await get().load()
                    await get().loadArchived()

                } catch (err) {
                    console.error('[ListStore] sync failed', err)
                }
            },


            /* ================= CRUD ================= */

            create: async (data) => {

                try {

                    const { data: res, error } =
                        await localService.lists.create(data)

                    if (error) throw error


                    set(state => ({
                        lists: [...state.lists, res as List]
                    }))


                    return res as List

                } catch (err: any) {

                    console.error('[ListStore] create failed', err)

                    set({ error: err?.message })

                    return null
                }
            },


            update: async (id, data) => {

                try {

                    const { data: res, error } =
                        await localService.lists.update(id, data)

                    if (error) throw error


                    set(state => ({
                        lists: state.lists.map(l =>
                            l.id === id ? { ...l, ...res } : l
                        )
                    }))

                } catch (err: any) {

                    console.error('[ListStore] update failed', err)

                    set({ error: err?.message })
                }
            },


            archive: async (id) => {
                const prevLists = get().lists
                const prevArchived = get().archived
                const prevSelected = get().selectedListId

                const list = prevLists.find(l => l.id === id)
                if (!list) return

                // 1. Optimistic Update
                set(state => ({
                    lists: state.lists.filter(l => l.id !== id),
                    archived: [...state.archived, list],
                    archivedLists: [...state.archivedLists, list],
                    selectedListId: state.selectedListId === id ? null : state.selectedListId
                }))

                try {
                    // 2. Perform Async Action
                    await localService.lists.archive(id)
                } catch (err: any) {
                    console.error('[ListStore] archive failed', err)
                    // 3. Revert on Error
                    set({
                        lists: prevLists,
                        archived: prevArchived,
                        archivedLists: prevArchived,
                        selectedListId: prevSelected,
                        error: 'Archive failed'
                    })
                    toast.error('Failed to archive list')
                }
            },


            restore: async (id) => {
                const prevLists = get().lists
                const prevArchived = get().archived

                const list = prevArchived.find(l => l.id === id)
                if (!list) return

                // 1. Optimistic Update
                set(state => ({
                    lists: [...state.lists, list],
                    archived: state.archived.filter(l => l.id !== id),
                    archivedLists: state.archivedLists.filter(l => l.id !== id)
                }))

                try {
                    // 2. Perform Async Action
                    await localService.lists.restore(id)
                } catch (err: any) {
                    console.error('[ListStore] restore failed', err)
                    // 3. Revert
                    set({
                        lists: prevLists,
                        archived: prevArchived,
                        archivedLists: prevArchived,
                        error: 'Restore failed'
                    })
                    toast.error('Failed to restore list')
                }
            },


            duplicate: async (id) => {

                try {

                    const list =
                        get().lists.find(l => l.id === id)

                    if (!list) return


                    const copy = await get().create({
                        name: list.name + ' (copy)',
                        color: list.color,
                        icon: list.icon,
                        sort_order: list.sort_order + 1,
                        is_system: false
                    })

                    if (!copy) return


                    const { data: tasks } =
                        await localService.tasks.list(id)


                    if (!tasks) return


                    for (const t of tasks as Task[]) {

                        if (t.status === 'done') continue

                        await localService.tasks.create({
                            list_id: copy.id,
                            title: t.title,
                            description: t.description,
                            status: t.status,
                            priority: t.priority,
                            estimated_minutes: t.estimated_minutes,
                            sort_order: t.sort_order
                        })
                    }


                    await get().load()

                } catch (err: any) {

                    console.error('[ListStore] duplicate failed', err)

                    set({ error: err?.message })
                }
            },


            /* ================= UI ================= */

            select: (id) => {
                set({ selectedListId: id })
            },

            reorderLists: async (updates) => {
                // 1. Optimistic update
                set(state => {
                    const newLists = [...state.lists]
                    updates.forEach(u => {
                        const list = newLists.find(l => l.id === u.id)
                        if (list) list.sort_order = u.sort_order
                    })
                    // Sort by new order
                    newLists.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    return { lists: newLists }
                })

                try {
                    // 2. Persist to DB
                    await Promise.all(updates.map(u =>
                        localService.lists.update(u.id, { sort_order: u.sort_order })
                    ))
                } catch (err: any) {
                    console.error('[ListStore] reorder failed', err)
                    // Revert is complex here, relying on reload for now if needed
                    toast.error('Failed to save list order')
                }
            },


            /* ================= ALIASES ================= */

            /* ================= ALIASES ================= */

            fetchLists: async () => {
                await get().load()
                get().syncFromCloud().catch(() => { })
            },

            fetchArchivedLists: async () => {
                await get().loadArchived()
            },

            setSelectedList: (id) => {
                get().select(id)
            },

            deleteList: async (id) => {
                await get().archive(id)
            },

            duplicateList: async (id) => {
                await get().duplicate(id)
            },

            restoreList: async (id: string) => {
                await get().restore(id)
            },

            permanentDeleteList: async (id: string) => {
                try {
                    const now = new Date().toISOString()
                    // 1. Soft Delete List to ensure sync works
                    await localService.lists.update(id, { deleted_at: now })

                    // 2. Cascade delete tasks
                    await localService.tasks.deleteByListId(id)

                    set(state => ({
                        archived: state.archived.filter(l => l.id !== id),
                        archivedLists: state.archivedLists.filter(l => l.id !== id)
                    }))
                    toast.success('List and its tasks deleted')
                } catch {
                    toast.error('Failed to delete list')
                }
            },

            /* 🔥 COMPATIBILITY FOR OLD UI */

            createList: async (data: Partial<List>) => {
                return await get().create(data)
            },

            updateList: async (id: string, data: Partial<List>) => {
                await get().update(id, data)
            },



            getListStats: async (listId) => {

                try {

                    const list =
                        get().lists.find(l => l.id === listId)

                    if (!list) return null


                    const { data: tasks } =
                        await localService.tasks.list(listId)


                    const activeTasks = (tasks || []).filter((t: Task) => !t.deleted_at)

                    const count = activeTasks.length

                    const pending =
                        activeTasks.filter(
                            (t: Task) => t.status !== 'done'
                        ).length || 0

                    const est =
                        activeTasks.reduce(
                            (s: number, t: Task) =>
                                s + (t.estimated_minutes || 0),
                            0
                        ) || 0


                    return {
                        ...list,
                        taskCount: count,
                        pendingCount: pending,
                        estimatedMinutes: est
                    }

                } catch {

                    return null
                }
            },

            moveListToWorkspace: async (listId: string, workspaceId: string | null) => {
                const prev = get().lists
                // Optimistic update
                set(state => ({
                    lists: state.lists.map(l =>
                        l.id === listId ? { ...l, workspace_id: workspaceId } as any : l
                    )
                }))
                try {
                    await localService.lists.update(listId, { workspace_id: workspaceId })
                } catch (err) {
                    set({ lists: prev })
                    console.error('[ListStore] moveListToWorkspace failed', err)
                }
            },

        }),

        {
            name: 'list-store',

            partialize: (state) => ({
                selectedListId: state.selectedListId,
                lists: state.lists
            })
        }
    )
)
