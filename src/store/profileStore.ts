
import { create } from 'zustand'
import { supabase } from '@/services/supabase'

interface ProfileState {
    dailyGoalMinutes: number
    fullName: string
    avatarUrl: string | null
    streak: number
    isLoading: boolean

    // Actions
    fetchProfile: (userId: string) => Promise<void>
    updateDailyGoal: (minutes: number) => Promise<void>
    updateProfile: (data: { fullName?: string; avatarUrl?: string | null }) => Promise<{ success: boolean; error?: string }>
    fetchStreak: () => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
    dailyGoalMinutes: 360, // Default 6 hours
    fullName: '',
    avatarUrl: null,
    streak: 0,
    isLoading: false,

    fetchProfile: async (userId: string) => {
        try {
            set({ isLoading: true })
            const { data, error } = await supabase
                .from('profiles')
                .select('daily_goal_minutes, full_name, avatar_url')
                .eq('id', userId)
                .single()

            if (error) {
                return
            }

            if (data) {
                set({
                    dailyGoalMinutes: (data as any).daily_goal_minutes ?? 360,
                    fullName: (data as any).full_name ?? '',
                    avatarUrl: (data as any).avatar_url ?? null,
                })
            }
        } catch (err) {
            console.error(err)
        } finally {
            set({ isLoading: false })
            // Fetch streak when profile loads
            get().fetchStreak()
        }
    },

    updateProfile: async ({ fullName, avatarUrl }) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not signed in' }

        const patch: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString() }
        if (fullName !== undefined) patch.full_name = fullName.trim()
        if (avatarUrl !== undefined) patch.avatar_url = avatarUrl

        // Optimistic
        const prev = { fullName: get().fullName, avatarUrl: get().avatarUrl }
        set(state => ({
            fullName: fullName !== undefined ? fullName.trim() : state.fullName,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : state.avatarUrl,
        }))

        const { error } = await supabase.from('profiles').upsert(patch as any)
        if (error) {
            set(prev) // revert
            return { success: false, error: error.message }
        }
        return { success: true }
    },

    updateDailyGoal: async (minutes: number) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        set({ dailyGoalMinutes: minutes }) // Optimistic update

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                daily_goal_minutes: minutes,
                updated_at: new Date().toISOString()
            } as any)

        if (error) {
            console.error('Failed to update profile:', error)
        }
    },

    fetchStreak: async () => {
        try {
            const { localService } = await import('@/services/localStorage')
            const { data } = await localService.focus.list()

            if (!data || data.length === 0) {
                set({ streak: 0 })
                return
            }

            // Get unique dates YYYY-MM-DD sorted descending (newest first)
            const uniqueDates = Array.from(new Set(
                (data as any[]).map((s: any) => s.start_time.split('T')[0])
            )).sort((a: any, b: any) => (b as string).localeCompare(a as string))

            if (uniqueDates.length === 0) {
                set({ streak: 0 })
                return
            }

            const today = new Date().toISOString().split('T')[0]
            const yesterdayDate = new Date(Date.now() - 86400000)
            const yesterday = yesterdayDate.toISOString().split('T')[0]

            // Check if streak is active (activity today or yesterday)
            const lastActive = uniqueDates[0]
            if (lastActive !== today && lastActive !== yesterday) {
                set({ streak: 0 })
                return
            }

            let streak = 0
            const currentStr = uniqueDates[0]

            // Verify start point
            if (currentStr !== today && currentStr !== yesterday) {
                set({ streak: 0 })
                return
            }

            streak = 1 // We have at least today or yesterday

            // Iterate remaining dates
            let prevDateToCompare = new Date(currentStr)

            for (let i = 1; i < uniqueDates.length; i++) {
                const thisDateStr = uniqueDates[i]
                const expectedDate = new Date(prevDateToCompare)
                expectedDate.setDate(prevDateToCompare.getDate() - 1)
                const expectedStr = expectedDate.toISOString().split('T')[0]

                if (thisDateStr === expectedStr) {
                    streak++
                    prevDateToCompare = new Date(thisDateStr)
                } else {
                    break // formatting gap = streak broken
                }
            }

            set({ streak })

        } catch (error) {
            console.error("Streak calc error:", error)
        }
    }
}))
