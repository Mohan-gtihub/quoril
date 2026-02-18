import { ReactNode, useEffect } from 'react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
    children: ReactNode
}

import { useFocusStore } from '@/store/focusStore'
import { FocusTimerPanel } from '../focus/FocusTimerPanel'
import { BottomNav } from './BottomNav'

export function Layout({ children }: LayoutProps) {
    const { showFocusPanel } = useFocusStore()

    // Resize window when focus panel state changes
    useEffect(() => {
        if (showFocusPanel) {
            // Resize to compact widget (Sidebar Mode)
            const height = window.screen.availHeight - 40
            window.electron?.resizeWindow(340, height, 20, 20)
        } else {
            // Restore to normal size
            window.electron?.restoreWindow()
        }
    }, [showFocusPanel])

    // When focus panel is active, show only the focus panel (window is resized)
    if (showFocusPanel) {
        return (
            <div className="h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <FocusTimerPanel />
            </div>
        )
    }

    // Normal view
    return (
        <div className="flex flex-col h-full bg-transparent transition-colors duration-500">
            <div className="flex flex-1 min-h-0 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto custom-scrollbar">
                    {children}
                </main>
            </div>
            <BottomNav />
        </div>
    )
}
