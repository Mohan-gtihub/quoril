import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { localService } from '@/services/localStorage'
import type { List, ListInsert, ListUpdate, ListWithStats } from '@/types/list'
import type { Task } from '@/types/database'
import { supabase } from '@/services/supabase'

interface ListState {
    lists: List[]
    selectedListId: string | null
    loading: boolean
    error: string | null

    // Actions
    syncFromSupabase: () => Promise<void>
    fetchLists: () => Promise<void>
    createList: (list: Omit<ListInsert, 'user_id'>) => Promise<List | null>
    updateList: (id: string, updates: ListUpdate) => Promise<void>
    deleteList: (id: string) => Promise<void>
    setSelectedList: (id: string | null) => void
    getListStats: (listId: string) => Promise<ListWithStats | null>
}

export const useListStore = create<ListState>()(
    persist(
        (set, get) => ({
            lists: [],
            selectedListId: null,
            loading: false,
            error: null,

            fetchLists: async () => {
                try {
                    set({ loading: true, error: null })

                    // Get current user
                    const { data: { user }, error: userError } = await localService.auth.getUser()
                    if (userError || !user) {
                        throw new Error('User not authenticated')
                    }

                    // 1. Load from local DB first (fast)
                    const { data, error } = await localService.lists.list()
                    if (error) throw error
                    set({ lists: data || [], loading: false })

                    // 2. Sync from Supabase in background
                    get().syncFromSupabase().catch(err => {
                        console.error('Background list sync failed:', err)
                    })
                } catch (error) {
                    console.error('Failed to fetch lists:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to fetch lists',
                        loading: false
                    })
                }
            },

            syncFromSupabase: async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session?.user) return

                    const { data: cloudLists, error } = await supabase
                        .from('lists')
                        .select('*')
                        .eq('user_id', session.user.id)
                        .is('deleted_at', null)

                    if (error) throw error
                    if (!cloudLists || cloudLists.length === 0) return

                    if (window.electronAPI?.db) {
                        const db = window.electronAPI.db;
                        for (const cloudList of (cloudLists as List[])) {
                            const [localList] = await db.exec('SELECT * FROM lists WHERE id = ?', [cloudList.id]);
                            if (!localList || new Date(cloudList.updated_at) > new Date(localList.updated_at)) {
                                await db.saveList(cloudList);
                            }
                        }
                    }

                    const { data: mergedLists } = await localService.lists.list()
                    set({ lists: mergedLists || [] })

                } catch (error) {
                    console.error('[Sync] Failed to sync lists from Supabase:', error)
                }
            },

            createList: async (list) => {
                try {
                    set({ error: null })


                    // Get current user
                    const { data: { user }, error: userError } = await localService.auth.getUser()
                    if (userError || !user) {
                        throw new Error('User not authenticated')
                    }


                    const insertData = { ...list, user_id: user.id }

                    const { data, error } = await localService.lists.create(insertData)

                    if (error) {
                        throw error
                    }


                    // Optimistic update
                    set((state) => ({
                        lists: [...state.lists, data as List]
                    }))

                    return data
                } catch (error) {
                    console.error('[ListStore] Failed to create list:', error)
                    set({ error: error instanceof Error ? error.message : 'Failed to create list' })
                    return null
                }
            },

            updateList: async (id, updates) => {
                try {
                    set({ error: null })

                    const { data, error } = await localService.lists.update(id, updates)

                    if (error) throw error

                    // Optimistic update
                    set((state) => ({
                        lists: state.lists.map((list) =>
                            list.id === id ? { ...list, ...data } : list
                        )
                    }))
                } catch (error) {
                    console.error('Failed to update list:', error)
                    set({ error: error instanceof Error ? error.message : 'Failed to update list' })
                }
            },

            deleteList: async (id) => {
                try {
                    set({ error: null })

                    const { error } = await localService.lists.delete(id)

                    if (error) throw error

                    // Remove from state
                    set((state) => ({
                        lists: state.lists.filter((list) => list.id !== id),
                        selectedListId: state.selectedListId === id ? null : state.selectedListId
                    }))
                } catch (error) {
                    console.error('Failed to delete list:', error)
                    set({ error: error instanceof Error ? error.message : 'Failed to delete list' })
                }
            },

            setSelectedList: (id) => {
                set({ selectedListId: id })
            },

            getListStats: async (listId) => {
                try {
                    const { data: { user }, error: userError } = await localService.auth.getUser()
                    if (userError || !user) {
                        throw new Error('User not authenticated')
                    }

                    // Get list
                    const list = get().lists.find(l => l.id === listId)
                    if (!list) return null

                    // Get tasks for this list
                    const { data: tasks, error } = await localService.tasks.list(listId)

                    if (error) throw error

                    const taskCount = tasks?.length || 0
                    const pendingCount = tasks?.filter((t: Task) => t.status !== 'done').length || 0
                    const estimatedMinutes = tasks?.reduce((sum: number, t: Task) => sum + (t.estimated_minutes || 0), 0) || 0

                    return {
                        ...list,
                        taskCount,
                        pendingCount,
                        estimatedMinutes
                    }
                } catch (error) {
                    console.error('Failed to get list stats:', error)
                    return null
                }
            }
        }),
        {
            name: 'list-storage',
            partialize: (state) => ({
                selectedListId: state.selectedListId,
                // We typically don't persist 'lists' to assume fresh fetch, 
                // but persisting lists makes specific UX faster ("stale-while-revalidate").
                // Let's persist basic stuff.
                lists: state.lists
            }),
        }
    )
)
