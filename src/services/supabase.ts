import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'Missing Supabase environment variables. Please check your .env file contains:\nVITE_SUPABASE_URL=your_url\nVITE_SUPABASE_ANON_KEY=your_key'
    console.error('[Supabase]', errorMsg)
    throw new Error(errorMsg)
}

// In Electron the OAuth callback arrives via the quoril:// deep link and is
// exchanged manually (see App.tsx), so URL detection must stay OFF there.
// In a normal browser the callback comes back as ?code=... on this origin and
// Supabase must auto-detect & exchange it, otherwise Google login never lands.
const isElectronEnv = typeof window !== 'undefined' && !!(window as any).electronAPI

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: !isElectronEnv,
        flowType: 'pkce',
    },
})

// Auth helpers
export const auth = {
    signUp: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        })
        if (error) throw error
        return data
    },

    signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) throw error
        return data
    },

    signOut: async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    },

    resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'quoril://auth/callback',
        })
        if (error) throw error
    },

    updatePassword: async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        })
        if (error) throw error
    },

    getSession: async () => {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        return data.session
    },

    getUser: async () => {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        return data.user
    },
}

export default supabase
