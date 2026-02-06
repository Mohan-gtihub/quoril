
import { create } from 'zustand'
import { supabase } from '@/services/supabase'

interface ProfileState {
    dailyGoalMinutes: number
    streak: number
    isLoading: boolean

    // Actions
    fetchProfile: (userId: string) => Promise<void>
    updateDailyGoal: (minutes: number) => Promise<void>
    fetchStreak: () => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
    dailyGoalMinutes: 360, // Default 6 hours
    streak: 0,
    isLoading: false,

    fetchProfile: async (userId: string) => {
        try {
            set({ isLoading: true })
            const { data, error } = await supabase
                .from('profiles')
                .select('daily_goal_minutes')
                .eq('id', userId)
                .single()

            if (error) {
                return
            }

            if (data) {
                set({ dailyGoalMinutes: (data as any).daily_goal_minutes ?? 360 })
            }
        } catch (err) {
            console.error(err)
        } finally {
            set({ isLoading: false })
            // Fetch streak when profile loads
            get().fetchStreak()
        }
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
