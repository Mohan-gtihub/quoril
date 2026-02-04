import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'
type ViewMode = 'list' | 'board' | 'calendar'

interface UIState {
    theme: Theme
    sidebarCollapsed: boolean
    activeView: ViewMode

    setTheme: (theme: Theme) => void
    toggleSidebar: () => void
    setActiveView: (view: ViewMode) => void
}

export const useUIStore = create<UIState>((set) => {

    return {
        theme: 'system',
        sidebarCollapsed: false,
        activeView: 'list',

        setTheme: (theme) => {
            set({ theme })

            // Apply theme to document
            const root = window.document.documentElement
            root.classList.remove('light', 'dark')

            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
                root.classList.add(systemTheme)
            } else {
                root.classList.add(theme)
            }
        },

        toggleSidebar: () => {
            set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
        },

        setActiveView: (view) => {
            set({ activeView: view })
        },
    }
})

// Initialize theme on load
const initialTheme = useUIStore.getState().theme
useUIStore.getState().setTheme(initialTheme)
