import { useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
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
import { ActivityDashboard } from '@/components/dashboard/ActivityDashboard'
import { ScreenTime } from '@/components/screentime/ScreenTime'
import { TitleBar } from '@/components/layout/TitleBar'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useSettingsStore } from '@/store/settingsStore'
import { SuperFocusPill } from '@/components/focus/SuperFocusPill'
import { WorkspacesOverview } from '@/components/workspaces/WorkspacesOverview'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
// Excalidraw is large; load the whiteboard only when its route is opened.
const CanvasApp = lazy(() => import('@/components/canvas/CanvasApp').then((m) => ({ default: m.CanvasApp })))

import { cn } from '@/utils/helpers'
import { platform } from '@/services/platform'
import { NavHistoryTracker } from '@/hooks/useNavHistory'


import { dataSyncService } from '@/services/dataSyncService'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useListStore } from '@/store/listStore'
import { supabase } from '@/services/supabase'

function App() {
    const { initialize, initialized, user } = useAuthStore()
    const { isActive, isPaused, isBreak } = useFocusStore()
    const settings = useSettingsStore()

    useEffect(() => {
        if (!initialized) {
            initialize()
        }
    }, [initialize, initialized])

    // [DIAG] Visible pointer probe. If clicking a "dead" button flashes a toast,
    // the click reached the DOM (JS/handler issue). If clicking it shows NOTHING,
    // the OS swallowed it (drag-region / window-level issue). Remove after diag.
    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            const el = e.target as HTMLElement
            const label = el?.closest('button')?.getAttribute('title')
                || el?.closest('button')?.textContent?.trim().slice(0, 20)
                || el?.tagName
            toast(`click: ${label} @${Math.round(e.clientX)},${Math.round(e.clientY)}`, { duration: 1500 })
        }
        window.addEventListener('pointerdown', onDown, true)
        return () => window.removeEventListener('pointerdown', onDown, true)
    }, [])

    // Super-focus drives a dedicated pill OVERLAY WINDOW (electron only): when it
    // turns on, hide this window and open the pill window; when off, close the
    // pill window and bring this one back. Keeps the pill able to roam across
    // Spaces without the whole app window roaming with it.
    useEffect(() => {
        if (!platform.capabilities.nativeOverlay) return
        if (settings.superFocusMode) {
            platform.focusWindow.enterPill()
        } else {
            platform.focusWindow.exitPill()
        }
    }, [settings.superFocusMode])

    // When the pill window hands the session back, re-read the persisted stores
    // so this window reflects whatever happened while it was dormant.
    useEffect(() => {
        if (!platform.capabilities.nativeOverlay) return
        const off = platform.focusWindow.onRehydrate(() => {
            ;(useSettingsStore as any).persist?.rehydrate?.()
            ;(useFocusStore as any).persist?.rehydrate?.()
        })
        return typeof off === 'function' ? off : undefined
    }, [])

    // Start background sync + realtime subscriptions when user is logged in
    useEffect(() => {
        if (!user) {
            dataSyncService.stop()
            return
        }

        dataSyncService.start()

        // Load workspaces from local + cloud
        const { loadWorkspaces, subscribeRealtime } = useWorkspaceStore.getState()
        loadWorkspaces()
        const unsubWs = subscribeRealtime()

        // Realtime for lists (workspace_id changes from other devices)
        const listChannel = supabase
            .channel(`lists:${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'lists',
                filter: `user_id=eq.${user.id}`,
            }, () => {
                // Re-fetch lists when any change comes in from cloud
                useListStore.getState().fetchLists()
            })
            .subscribe()

        return () => {
            dataSyncService.stop()
            unsubWs()
            supabase.removeChannel(listChannel)
        }
    }, [user])

    // Hydrate timer state on app load (fix for production builds)
    useEffect(() => {
        const focus = useFocusStore.getState()
        // If we have an active session but no startTime (loaded from localStorage),
        // initialize it properly by forcing a pause state.
        if (focus.isActive && !focus.startTime) {
            useFocusStore.setState({
                startTime: null,
                isPaused: true
            })
        }
    }, [])

    // Inject super-focus-mode class into HTML root for transparency overrides.
    // Transparency only makes sense on a native transparent overlay window
    // (Electron). On the web there is no transparent OS window, so applying it
    // would blank the page — guard against that. (L: minimal-interface blank bug)
    useEffect(() => {
        const wantsTransparency = settings.superFocusMode && platform.capabilities.nativeOverlay
        if (wantsTransparency) {
            document.documentElement.classList.add('super-focus-mode')
        } else {
            document.documentElement.classList.remove('super-focus-mode')
        }
        return () => document.documentElement.classList.remove('super-focus-mode')
    }, [settings.superFocusMode])

    // Safety net: Escape always exits Super Focus Mode so the user can never get
    // stuck on a minimal/blank surface.
    useEffect(() => {
        if (!settings.superFocusMode) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') settings.updateSettings({ superFocusMode: false })
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [settings.superFocusMode])

    // Mirror the active theme class onto <body> so the page backdrop matches
    // the app surface (prevents a dark flash behind the light Daylight theme).
    useEffect(() => {
        const classes = ['theme-daylight', 'theme-light', 'theme-blue', 'theme-red', 'theme-nebula']
        document.body.classList.remove(...classes)
        const map: Record<string, string> = {
            daylight: 'theme-daylight',
            light: 'theme-light',
            blue: 'theme-blue',
            red: 'theme-red',
            nebula: 'theme-nebula',
        }
        const cls = map[settings.theme]
        if (cls) document.body.classList.add(cls)
    }, [settings.theme])

    // Keep store elapsed in sync for persistence and endSession; use getState() so effect doesn't re-run
    useEffect(() => {
        if (!isActive || (isPaused && !isBreak)) return
        // During super-focus the dedicated pill window owns the authoritative
        // tick (electron). Don't double-tick from this dormant window.
        if (platform.capabilities.nativeOverlay && settings.superFocusMode) return

        let intervalId: NodeJS.Timeout | null = null

        const sync = () => {
            const state = useFocusStore.getState()
            if (!state.isActive || state.isPaused || !state.startTime) {
                if (intervalId) {
                    clearInterval(intervalId)
                    intervalId = null
                }
                return
            }
            state.syncTimer()
        }

        intervalId = setInterval(sync, 1000)
        return () => {
            if (intervalId) {
                clearInterval(intervalId)
                intervalId = null
            }
        }
    }, [isActive, isPaused, isBreak, settings.superFocusMode])

    // When user comes back to the app, sync store elapsed from real time
    useEffect(() => {
        const onVisible = () => {
            useFocusStore.getState().syncTimer()
            // Also sync recurring tasks if day has changed
            useTaskStore.getState().syncRecurringTasks().catch(() => { })
        }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', onVisible)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('focus', onVisible)
        }
    }, [])

    // DEEP LINK HANDLING (Email Verification + Password Reset + OAuth callback)
    useEffect(() => {
        const handleDeepLink = async (url: string) => {
            console.log('[DeepLink] Received:', url)

            try {
                // RESUME LOGIC — quoril://resume or quoril://focus
                if (url.includes('resume') || url.includes('focus')) {
                    const store = useFocusStore.getState()
                    if (store.isActive && store.isPaused) {
                        toast("Resuming Mission...")
                        store.resumeSession()
                    }
                    return
                }

                // AUTH LOGIC
                // Re-parse as a proper URL so URL() can parse query params correctly
                const parsableUrl = url.replace(/^quoril:\/\//, 'https://quoril.in/')
                const parsed = new URL(parsableUrl)

                // --- PKCE flow: ?code=xxxx (Supabase default) ---
                const code = parsed.searchParams.get('code')
                if (code) {
                    const { supabase } = await import('@/services/supabase')
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
                    if (error) {
                        console.error('[DeepLink] PKCE exchange failed:', error.message)
                        toast.error('Verification failed. Please try again.')
                    } else if (data.session) {
                        useAuthStore.getState().setSession(data.session)
                    }
                    return
                }

                // --- Legacy implicit flow: #access_token=xxxx ---
                const hashIndex = url.indexOf('#')
                if (hashIndex !== -1) {
                    const hash = url.substring(hashIndex + 1)
                    const params = new URLSearchParams(hash)
                    const access_token = params.get('access_token')
                    const refresh_token = params.get('refresh_token')

                    if (access_token && refresh_token) {
                        const { supabase } = await import('@/services/supabase')
                        const { data, error } = await supabase.auth.setSession({
                            access_token,
                            refresh_token
                        })
                        if (error) {
                            console.error('[DeepLink] setSession failed:', error.message)
                            toast.error('Verification failed. Please try again.')
                        } else if (data.session) {
                            useAuthStore.getState().setSession(data.session)
                        }
                    }
                }
            } catch (e) {
                console.error('[DeepLink] Error parsing URL:', e)
            }
        }

        // 1. Subscribe to live deep links forwarded by the main process.
        const result = platform.auth.onDeepLink(handleDeepLink)

        // 2. Drain any deep link that arrived before this listener was ready
        //    (cold-start OAuth callback on Windows, or a send that raced load).
        platform.auth.getPendingDeepLink()
            .then((url) => { if (url) handleDeepLink(url) })
            .catch(() => { })

        if (typeof result === 'function') {
            return () => result()
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
                    <NavHistoryTracker />
                    <div className={cn(
                        "flex flex-col h-screen overflow-hidden transition-all duration-500",
                        settings.theme === 'daylight' && "theme-daylight",
                        settings.theme === 'light' && "theme-light",
                        settings.theme === 'blue' && "theme-blue",
                        settings.theme === 'red' && "theme-red",
                        settings.theme === 'nebula' && "theme-nebula",
                        (settings.superFocusMode && platform.capabilities.nativeOverlay) ? "bg-transparent super-focus" : "bg-[var(--bg-primary)]",
                        "text-[var(--text-primary)]"
                    )}>
                        {!settings.superFocusMode && platform.capabilities.nativeOverlay && <TitleBar />}
                        <div className="flex-1 overflow-hidden">
                            {user ? (
                                settings.superFocusMode ? (
                                    // On electron the pill lives in its own overlay
                                    // window (this window is hidden); only the web
                                    // build renders it inline here.
                                    platform.capabilities.nativeOverlay ? null : <SuperFocusPill />
                                ) : (
                                    <Routes>
                                        <Route path="/focus-popup" element={<FocusPopup />} />
                                        <Route path="*" element={
                                            <Layout>
                                                <Routes>
                                                    <Route path="/dashboard" element={<Dashboard />} />
                                                    <Route path="/workspaces" element={<WorkspacesOverview />} />
                                                    <Route path="/planner" element={<Planner />} />
                                                    <Route path="/focus" element={<FocusMode />} />
                                                    <Route path="/settings" element={<Settings />} />
                                                    <Route path="/reports" element={<Reports />} />
                                                    <Route path="/activity" element={<ActivityDashboard />} />
                                                    <Route path="/screen-time" element={<ScreenTime />} />
                                                    <Route path="/canvas" element={<Suspense fallback={null}><CanvasApp /></Suspense>} />
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
                            <ConfirmDialog />
                        </div>
                    </div>
                </HashRouter>
            </QueryProvider>

        </ErrorBoundary>
    )
}

export default App