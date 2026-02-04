import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { Reports } from '@/components/reports/Reports'
import { TitleBar } from '@/components/layout/TitleBar'
import { useFocusStore } from '@/store/focusStore'

import { dataSyncService } from '@/services/dataSyncService'

function App() {
    const { initialize, initialized, user } = useAuthStore()
    const { isActive, isPaused } = useFocusStore()

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

    // Keep store elapsed in sync for persistence and endSession; use getState() so effect doesn't re-run
    useEffect(() => {
        if (!isActive || isPaused) return
        const sync = () => useFocusStore.getState().syncTimer()
        sync()
        const interval = setInterval(sync, 1000)
        return () => clearInterval(interval)
    }, [isActive, isPaused])

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
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Initializing...</p>
                </div>
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <QueryProvider>
                <BrowserRouter>
                    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                        <TitleBar />
                        <div className="flex-1 overflow-hidden">
                            {user ? (
                                <Routes>
                                    <Route path="/focus-popup" element={<FocusPopup />} />
                                    <Route path="*" element={
                                        <Layout>
                                            <Routes>
                                                <Route path="/dashboard" element={<Dashboard />} />
                                                <Route path="/planner" element={<Planner />} />
                                                <Route path="/focus" element={<FocusMode />} />
                                                <Route path="/reports" element={<Reports />} />
                                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                            </Routes>
                                        </Layout>
                                    } />
                                </Routes>
                            ) : (
                                <LoginScreen />
                            )}
                            <Toaster
                                position="top-right"
                                toastOptions={{
                                    style: {
                                        background: '#1f2937',
                                        color: '#fff',
                                        border: '1px solid #374151',
                                    },
                                    success: {
                                        iconTheme: {
                                            primary: '#10b981',
                                            secondary: '#fff',
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </BrowserRouter>
            </QueryProvider>
        </ErrorBoundary>
    )
}

export default App
