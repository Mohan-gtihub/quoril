import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
    hideEstDoneTimes: boolean
    theme: 'system' | 'daylight' | 'dark' | 'light' | 'blue' | 'red' | 'nebula'
    timezone: string

    // AI — Generate Insights on the Reports page (can be turned off entirely).
    aiInsightsEnabled: boolean

    // Blitz mode / Focus Settings
    pomodorosEnabled: boolean
    pomodoroLength: number // minutes
    defaultBreakLength: number // minutes
    longBreakLength: number // minutes
    pomodorosUntilLongBreak: number // count of focus pomodoros before a long break
    scrollingTitle: boolean
    dailyFocusGoalMinutes: number // minutes
    superFocusMode: boolean

    // Alerts
    timedAlertsEnabled: boolean
    alertInterval: number // minutes
    alertSound: string
    animatedFlash: boolean

    notificationAlertsEnabled: boolean
    notificationSound: string

    // Completion
    showSuccessScreen: boolean
    funGifEnabled: boolean
    successSound: string
    successSoundEnabled: boolean

    // Actions
    updateSettings: (settings: Partial<SettingsState>) => void
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            hideEstDoneTimes: false,
            theme: 'daylight',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

            aiInsightsEnabled: true,

            pomodorosEnabled: false,
            pomodoroLength: 25,
            defaultBreakLength: 10,
            longBreakLength: 20,
            pomodorosUntilLongBreak: 4,
            scrollingTitle: true,
            dailyFocusGoalMinutes: 240,
            superFocusMode: false,

            timedAlertsEnabled: true,
            alertInterval: 10,
            alertSound: 'ping',
            animatedFlash: true,

            notificationAlertsEnabled: true,
            notificationSound: 'Futuristic',

            showSuccessScreen: true,
            funGifEnabled: true,
            successSound: 'Victory Bell',
            successSoundEnabled: true,

            updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
        }),
        {
            name: 'settings-storage',
            version: 1,
            // v1: Daylight (monochrome) becomes the primary theme. Flip the
            // old persisted 'dark' default over so the redesign actually shows.
            migrate: (persisted: any, version) => {
                if (version < 1 && persisted && persisted.theme === 'dark') {
                    persisted.theme = 'daylight'
                }
                return persisted
            },
        }
    )
)
