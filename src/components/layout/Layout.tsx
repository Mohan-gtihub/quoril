import { ReactNode, useEffect } from 'react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
    children: ReactNode
}

import { useFocusStore } from '@/store/focusStore'
import { FocusTimerPanel } from '../focus/FocusTimerPanel'
import { BottomNav } from './BottomNav'
import { NavToolbar } from './NavToolbar'
import { platform } from '@/services/platform'

export function Layout({ children }: LayoutProps) {
    const { showFocusPanel } = useFocusStore()

    // Resize window when focus panel state changes
    useEffect(() => {
        if (!platform.capabilities.nativeOverlay) return
        if (showFocusPanel) {
            // Resize to compact widget (Sidebar Mode)
            const height = window.screen.availHeight - 40
            platform.focusWindow.resize(340, height, 20, 20)
        } else {
            // Restore to normal size
            platform.focusWindow.restore()
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
                <main className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <NavToolbar />
                    <div className="flex-1 overflow-hidden min-h-0">
                        {children}
                    </div>
                </main>
            </div>
            <BottomNav />
        </div>
    )
}
