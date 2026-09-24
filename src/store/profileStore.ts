
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

            // Get unique dates YYYY-MM-DD sorted descending (newest first).
            // start_time can be null on partially-synced rows, so drop those
            // rather than letting one bad row throw out the whole streak.
            const uniqueDates = Array.from(new Set(
                (data as any[])
                    .map((s: any) => (typeof s?.start_time === 'string' ? s.start_time.split('T')[0] : null))
                    .filter((d): d is string => Boolean(d))
            )).sort((a, b) => b.localeCompare(a))

            if (uniqueDates.length === 0) {
                set({ streak: 0 })
                return
            }

            // Compare in local time. start_time is a local-clock timestamp, so
            // deriving "today" from toISOString() (UTC) rolls over at the wrong
            // moment for any non-UTC user and drops a day from the streak.
            const localDay = (d: Date) => {
                const pad = (n: number) => String(n).padStart(2, '0')
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            }
            const today = localDay(new Date())
            const yesterday = localDay(new Date(Date.now() - 86400000))

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

            // Iterate remaining dates. Parse as local midnight (new Date("YYYY-MM-DD")
            // parses as UTC, which then disagrees with the local getDate()/setDate()
            // arithmetic below).
            const parseLocalDay = (s: string) => {
                const [y, m, d] = s.split('-').map(Number)
                return new Date(y, m - 1, d)
            }
            let prevDateToCompare = parseLocalDay(currentStr)

            for (let i = 1; i < uniqueDates.length; i++) {
                const thisDateStr = uniqueDates[i]
                const expectedDate = new Date(prevDateToCompare)
                expectedDate.setDate(prevDateToCompare.getDate() - 1)
                const expectedStr = localDay(expectedDate)

                if (thisDateStr === expectedStr) {
                    streak++
                    prevDateToCompare = parseLocalDay(thisDateStr)
                } else {
                    break // gap = streak broken
                }
            }

            set({ streak })

        } catch (error) {
            // Leaving the previous value in place would show a stale streak
            // indefinitely; 0 is the honest fallback.
            console.error("Streak calc error:", error)
            set({ streak: 0 })
        }
    }
}))
