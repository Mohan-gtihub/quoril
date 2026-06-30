import { useEffect, useRef } from 'react'

import { SuperFocusPill } from '@/components/focus/SuperFocusPill'
import { useFocusStore } from '@/store/focusStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTaskStore } from '@/store/taskStore'
import { platform } from '@/services/platform'

/**
 * Standalone renderer for the dedicated focus-pill window (loaded with `?pill=1`).
 *
 * The pill lives in its own panel window so it can travel across macOS Spaces and
 * float over fullscreen apps without turning the whole app into a roaming panel.
 * While it's open it is the SOLE owner of the focus session: it runs the timer
 * tick, the main window is hidden and dormant. State is shared with the main
 * window through the persisted stores (localStorage) + a one-shot rehydrate when
 * the main window comes back.
 */
export function PillRoot() {
    const theme = useSettingsStore(s => s.theme)
    const superFocusMode = useSettingsStore(s => s.superFocusMode)

    // Load tasks so the pill can resolve the active task title + subtasks.
    useEffect(() => {
        useTaskStore.getState().fetchTasks()
    }, [])

    // Apply theme + transparency classes (mirrors App.tsx) so the pill matches.
    useEffect(() => {
        document.documentElement.classList.add('super-focus-mode')
        const themeClasses = ['theme-daylight', 'theme-light', 'theme-blue', 'theme-red', 'theme-nebula']
        document.body.classList.remove(...themeClasses)
        const map: Record<string, string> = {
            daylight: 'theme-daylight',
            light: 'theme-light',
            blue: 'theme-blue',
            red: 'theme-red',
            nebula: 'theme-nebula',
        }
        const cls = map[theme]
        if (cls) document.body.classList.add(cls)
        return () => document.documentElement.classList.remove('super-focus-mode')
    }, [theme])

    // This window owns the authoritative timer tick while it is open (the main
    // window's ticker is gated off during super-focus). Mirrors App.tsx.
    const isActive = useFocusStore(s => s.isActive)
    const isPaused = useFocusStore(s => s.isPaused)
    const isBreak = useFocusStore(s => s.isBreak)
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval> | null = null
        const sync = () => {
            const state = useFocusStore.getState()
            if (!state.isActive || state.isPaused || !state.startTime) {
                if (intervalId) { clearInterval(intervalId); intervalId = null }
                return
            }
            state.syncTimer()
        }
        intervalId = setInterval(sync, 1000)
        return () => { if (intervalId) clearInterval(intervalId) }
    }, [isActive, isPaused, isBreak])

    // When the user exits super-focus from the pill, close this window and bring
    // the main app back. (The main window rehydrates its stores on return.)
    // Guard against the very first render reading a transient `false` during
    // store hydration, which would slam the pill shut as soon as it opened.
    const sawActiveFocus = useRef(false)
    useEffect(() => {
        if (superFocusMode) {
            sawActiveFocus.current = true
        } else if (sawActiveFocus.current) {
            platform.focusWindow.exitPill()
        }
    }, [superFocusMode])

    return (
        <div className="h-screen w-screen bg-transparent super-focus text-[var(--text-primary)]">
            <SuperFocusPill />
        </div>
    )
}
