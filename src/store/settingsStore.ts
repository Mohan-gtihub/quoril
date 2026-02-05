import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
    hideEstDoneTimes: boolean
    theme: 'system' | 'dark' | 'light' | 'blue' | 'red'
    timezone: string

    // Blitz mode / Focus Settings
    pomodorosEnabled: boolean
    defaultBreakLength: number // minutes
    scrollingTitle: boolean
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
            defaultBreakLength: 10,
            scrollingTitle: true,
            superFocusMode: false,

            timedAlertsEnabled: true,
            alertInterval: 10,
            alertSound: 'Melodic',
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
        }
    )
)
