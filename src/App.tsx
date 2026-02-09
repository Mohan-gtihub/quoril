import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryProvider } from '@/providers/QueryProvider'
import { useAuthStore } from '@/store/authStore'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { Planner } from '@/components/planner/Planner'
import { FocusPopup } from '@/components/focus/FocusPopup'
import { FocusMode } from '@/components/focus/FocusMode'
import { Settings } from '@/components/focus/Settings'
import { Reports } from '@/components/reports/Reports'
import { TitleBar } from '@/components/layout/TitleBar'
import { useFocusStore } from '@/store/focusStore'
import { useSettingsStore } from '@/store/settingsStore'
import { SuperFocusPill } from '@/components/focus/SuperFocusPill'
import { cn } from '@/utils/helpers'

import { dataSyncService } from '@/services/dataSyncService'

function App() {
    const { initialize, initialized, user } = useAuthStore()
    const { isActive, isPaused, isBreak } = useFocusStore()
    const settings = useSettingsStore()

    useEffect(() => {
        if (!initialized) {
            initialize()
        }
    }, [initialize, initialized])

    // Start background sync when user is logged in
    useEffect(() => {
        if (user) {
            dataSyncService.start()
        } else {
            dataSyncService.stop()
        }
        return () => dataSyncService.stop()
    }, [user])

    // Hydrate timer state on app load (fix for production builds)
    useEffect(() => {
        const focus = useFocusStore.getState()
        // If we have an active session but no startTime (loaded from localStorage),
        // initialize it properly
        if (focus.isActive && !focus.startTime) {
            // Set startTime to now and pause the session
            // User can click resume to continue
            useFocusStore.setState({
                startTime: Date.now(),
                isPaused: true
            })
        }
    }, [])

    // Keep store elapsed in sync for persistence and endSession; use getState() so effect doesn't re-run
    useEffect(() => {
        if (!isActive || (isPaused && !isBreak)) return
        const sync = () => useFocusStore.getState().syncTimer()
        sync()
        const interval = setInterval(sync, 1000)
        return () => clearInterval(interval)
    }, [isActive, isPaused, isBreak])

    // TRICK: Force HTML/BODY background to transparent in Super Focus Mode
    useEffect(() => {
        if (settings.superFocusMode) {
            document.documentElement.classList.add('super-focus-mode')
        } else {
            document.documentElement.classList.remove('super-focus-mode')
        }
    }, [settings.superFocusMode])

    // When user comes back to the app, sync store elapsed from real time
    useEffect(() => {
        const onVisible = () => useFocusStore.getState().syncTimer()
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', onVisible)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('focus', onVisible)
        }
    }, [])

    if (!initialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)] mx-auto shadow-[0_0_15px_var(--accent-glow)]"></div>
                    <p className="mt-6 text-[var(--text-muted)] font-mono text-xs uppercase tracking-widest animate-pulse">Initializing System...</p>
                </div>
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <QueryProvider>
                <HashRouter>
                    <div className={cn(
                        "flex flex-col h-screen overflow-hidden transition-all duration-500",
                        settings.theme === 'light' && "theme-light",
                        settings.theme === 'blue' && "theme-blue",
                        settings.theme === 'red' && "theme-red",
                        !settings.superFocusMode ? "bg-[var(--bg-primary)]" : "bg-transparent",
                        "text-[var(--text-primary)]"
                    )}>
                        {!settings.superFocusMode && <TitleBar />}
                        <div className="flex-1 overflow-hidden">
                            {user ? (
                                settings.superFocusMode ? (
                                    <SuperFocusPill />
                                ) : (
                                    <Routes>
                                        <Route path="/focus-popup" element={<FocusPopup />} />
                                        <Route path="*" element={
                                            <Layout>
                                                <Routes>
                                                    <Route path="/dashboard" element={<Dashboard />} />
                                                    <Route path="/planner" element={<Planner />} />
                                                    <Route path="/focus" element={<FocusMode />} />
                                                    <Route path="/settings" element={<Settings />} />
                                                    <Route path="/reports" element={<Reports />} />
                                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                                </Routes>
                                            </Layout>
                                        } />
                                    </Routes>
                                )
                            ) : (
                                <LoginScreen />
                            )}
                            <Toaster
                                position="top-right"
                                toastOptions={{
                                    style: {
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-default)',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                                    },
                                    success: {
                                        iconTheme: {
                                            primary: 'var(--success)',
                                            secondary: '#fff',
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </HashRouter>
            </QueryProvider>
        </ErrorBoundary>
    )
}

export default App
