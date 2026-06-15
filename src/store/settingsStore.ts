import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
    hideEstDoneTimes: boolean
    theme: 'system' | 'dark' | 'light' | 'blue' | 'red' | 'nebula'
    timezone: string

    // Blitz mode / Focus Settings
    pomodorosEnabled: boolean
    pomodoroLength: number // minutes
    defaultBreakLength: number // minutes
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
            theme: 'dark',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

            pomodorosEnabled: false,
            pomodoroLength: 25,
            defaultBreakLength: 10,
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
            partialize: (s) => ({
                hideEstDoneTimes: s.hideEstDoneTimes,
                theme: s.theme,
                timezone: s.timezone,
                pomodorosEnabled: s.pomodorosEnabled,
                pomodoroLength: s.pomodoroLength,
                defaultBreakLength: s.defaultBreakLength,
                scrollingTitle: s.scrollingTitle,
                dailyFocusGoalMinutes: s.dailyFocusGoalMinutes,
                timedAlertsEnabled: s.timedAlertsEnabled,
                alertInterval: s.alertInterval,
                alertSound: s.alertSound,
                animatedFlash: s.animatedFlash,
                notificationAlertsEnabled: s.notificationAlertsEnabled,
                notificationSound: s.notificationSound,
                showSuccessScreen: s.showSuccessScreen,
                funGifEnabled: s.funGifEnabled,
                successSound: s.successSound,
                successSoundEnabled: s.successSoundEnabled,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.superFocusMode = false
                }
            },
        }
    )
)
