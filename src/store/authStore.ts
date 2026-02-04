import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'

interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
    initialized: boolean

    // Actions
    initialize: () => Promise<void>
    signIn: (email: string, password: string) => Promise<boolean>
    signUp: (email: string, password: string) => Promise<boolean>
    signOut: () => Promise<void>
    setUser: (user: User | null) => void
    setSession: (session: Session | null) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    loading: false,
    initialized: false,

    initialize: async () => {
        const state = get()
        if (state.initialized) {
            return
        }

        try {
            set({ loading: true })

            // 1. Get initial session
            const { data: { session } } = await supabase.auth.getSession()

            set({
                session,
                user: session?.user ?? null,
                initialized: true,
                loading: false
            })

            // 2. Listen for changes
            supabase.auth.onAuthStateChange((_event, session) => {
                set({
                    session,
                    user: session?.user ?? null,
                    loading: false
                })
            })

        } catch (error) {
            console.error('[Auth] Initialization error:', error)
            set({ loading: false, initialized: true })
        }
    },

    signIn: async (email, password) => {
        try {
            set({ loading: true })
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error

            set({
                session: data.session,
                user: data.user,
                loading: false
            })
            return true
        } catch (error) {
            console.error('Sign in failed:', error)
            set({ loading: false })
            return false
        }
    },

    signUp: async (email, password) => {
        try {
            set({ loading: true })
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            })

            if (error) throw error

            set({
                session: data.session,
                user: data.user,
                loading: false
            })
            return true
        } catch (error) {
            console.error('Sign up failed:', error)
            set({ loading: false })
            return false
        }
    },

    signOut: async () => {
        try {
            set({ loading: true })
            await supabase.auth.signOut()
            set({
                user: null,
                session: null,
                loading: false
            })
            // Clear app state so next user doesn't see stale data
            const { useFocusStore } = await import('@/store/focusStore')
            const { useTaskStore } = await import('@/store/taskStore')
            const { useListStore } = await import('@/store/listStore')
            useFocusStore.getState().reset()
            useTaskStore.setState({ tasks: [], selectedTaskId: null })
            useListStore.setState({ lists: [], selectedListId: null })
        } catch (error) {
            console.error('Sign out failed:', error)
            set({ loading: false })
        }
    },

    setUser: (user) => set({ user }),
    setSession: (session) => set({ session })
}))
