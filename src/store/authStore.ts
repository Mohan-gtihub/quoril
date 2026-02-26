import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import {
    validateEmail,
    validatePassword,
    checkLoginRateLimit,
    clearRateLimit,
    getSecureErrorMessage,
    createSession,
    destroySession,
    updateSessionActivity,
    validateSession,
    generateBrowserFingerprint,
} from '@/utils/securityUtils'
import { SECURITY_CONFIG } from '@/config/security'

interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
    initialized: boolean
    lastActivity: number
    sessionFingerprint: string | null

    // Actions
    initialize: () => Promise<void>
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
    signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>
    signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
    signOut: () => Promise<void>
    checkSessionValidity: () => boolean
    updateActivity: () => void
    setUser: (user: User | null) => void
    setSession: (session: Session | null) => void
}

// Session timeout checker
let sessionTimeoutInterval: NodeJS.Timeout | null = null
let activityCheckInterval: NodeJS.Timeout | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    loading: false,
    initialized: false,
    lastActivity: Date.now(),
    sessionFingerprint: null,

    initialize: async () => {
        const state = get()
        if (state.initialized) {
            return
        }

        try {
            set({ loading: true })

            // Generate browser fingerprint for session validation
            const fingerprint = generateBrowserFingerprint()
            set({ sessionFingerprint: fingerprint })

            // 1. Get initial session
            const { data: { session } } = await supabase.auth.getSession()

            if (session) {
                // Validate session with our security layer
                createSession(session.access_token, session.user.id)

                // Notify main process for synchronization engine
                if (window.electronAPI?.auth) {
                    window.electronAPI.auth.setUser(session.user.id, session.access_token).catch(console.error)
                }

                set({
                    session,
                    user: session.user,
                    initialized: true,
                    loading: false,
                    lastActivity: Date.now(),
                })

                // Start session monitoring
                startSessionMonitoring()
            } else {
                set({
                    session: null,
                    user: null,
                    initialized: true,
                    loading: false,
                })
            }

            // 2. Listen for auth state changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('[Auth] State change:', event)

                if (event === 'SIGNED_IN' && session) {
                    createSession(session.access_token, session.user.id)
                    set({
                        session,
                        user: session.user,
                        loading: false,
                        lastActivity: Date.now(),
                    })
                    if (window.electronAPI?.auth) {
                        window.electronAPI.auth.setUser(session.user.id, session.access_token).catch(console.error)
                    }
                    startSessionMonitoring()
                } else if (event === 'SIGNED_OUT') {
                    const currentSession = get().session
                    if (currentSession) {
                        destroySession(currentSession.access_token)
                    }
                    stopSessionMonitoring()
                    set({
                        session: null,
                        user: null,
                        loading: false,
                    })
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    // Update session on token refresh
                    set({
                        session,
                        lastActivity: Date.now(),
                    })
                }
            })

        } catch (error) {
            console.error('[Auth] Initialization error:', error)
            set({ loading: false, initialized: true })
        }
    },

    signIn: async (email, password) => {
        try {
            set({ loading: true })

            // 1. Validate email format
            const emailValidation = validateEmail(email)
            if (!emailValidation.valid) {
                set({ loading: false })
                return { success: false, error: emailValidation.error }
            }

            // 2. Check rate limiting
            const rateLimit = checkLoginRateLimit(email.toLowerCase())
            if (!rateLimit.allowed) {
                set({ loading: false })
                return { success: false, error: rateLimit.message }
            }

            // 3. Attempt sign in
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password,
            })

            if (error) {
                set({ loading: false })
                return {
                    success: false,
                    error: getSecureErrorMessage(error, 'login'),
                }
            }

            if (!data.session || !data.user) {
                set({ loading: false })
                return {
                    success: false,
                    error: 'Authentication failed. Please try again.',
                }
            }

            // 4. Clear rate limit on successful login
            clearRateLimit(`login:${email.toLowerCase()}`)

            // 5. Create secure session
            createSession(data.session.access_token, data.user.id)

            set({
                session: data.session,
                user: data.user,
                loading: false,
                lastActivity: Date.now(),
            })

            if (window.electronAPI?.auth) {
                window.electronAPI.auth.setUser(data.user.id, data.session.access_token).catch(console.error)
            }

            // 6. Start session monitoring
            startSessionMonitoring()

            return { success: true }
        } catch (error) {
            console.error('[Auth] Sign in error:', error)
            set({ loading: false })
            return {
                success: false,
                error: getSecureErrorMessage(error, 'login'),
            }
        }
    },

    signUp: async (email, password) => {
        try {
            set({ loading: true })

            // 1. Validate email
            const emailValidation = validateEmail(email)
            if (!emailValidation.valid) {
                set({ loading: false })
                return { success: false, error: emailValidation.error }
            }

            // 2. Validate password strength
            const passwordValidation = validatePassword(password)
            if (!passwordValidation.valid) {
                set({ loading: false })
                return {
                    success: false,
                    error: passwordValidation.errors[0] || 'Password does not meet security requirements',
                }
            }

            // 3. Attempt sign up
            const { data, error } = await supabase.auth.signUp({
                email: email.toLowerCase().trim(),
                password,
                options: {
                    emailRedirectTo: 'quoril://auth/callback',
                },
            })

            if (error) {
                set({ loading: false })
                return {
                    success: false,
                    error: getSecureErrorMessage(error, 'signup'),
                }
            }

            // 4. Check if email confirmation is required
            const requiresVerification = !data.session

            if (data.session && data.user) {
                // Auto-signed in (email confirmation disabled in Supabase)
                createSession(data.session.access_token, data.user.id)

                set({
                    session: data.session,
                    user: data.user,
                    loading: false,
                    lastActivity: Date.now(),
                })

                if (window.electronAPI?.auth) {
                    window.electronAPI.auth.setUser(data.user.id, data.session.access_token).catch(console.error)
                }

                startSessionMonitoring()
            } else {
                // Email confirmation required
                set({ loading: false })
            }

            return {
                success: true,
                requiresVerification,
            }
        } catch (error) {
            console.error('[Auth] Sign up error:', error)
            set({ loading: false })
            return {
                success: false,
                error: getSecureErrorMessage(error, 'signup'),
            }
        }
    },

    signInWithGoogle: async () => {
        try {
            set({ loading: true })

            // skipBrowserRedirect: true → get the OAuth URL without navigating
            // This is critical for Electron: we must NOT navigate the main window
            // away from the app. Instead we open the URL in the system browser.
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'quoril://auth/callback',
                    skipBrowserRedirect: true,
                },
            })

            if (error) {
                set({ loading: false })
                return { success: false, error: error.message }
            }

            if (data?.url) {
                // Open Google OAuth in the system browser
                // The PKCE code_verifier stays in this app's localStorage
                // so when the deep link callback arrives, we can exchange it
                if (window.electronAPI?.file?.openExternal) {
                    await window.electronAPI.file.openExternal(data.url)
                } else {
                    // Fallback: window.open() is caught by setWindowOpenHandler
                    window.open(data.url, '_blank')
                }
            }

            // Loading stays true until the deep link callback fires
            // and onAuthStateChange sets the session
            return { success: true }
        } catch (error) {
            console.error('[Auth] Google sign-in error:', error)
            set({ loading: false })
            return { success: false, error: 'Google sign-in failed. Please try again.' }
        }
    },

    signOut: async () => {
        try {
            set({ loading: true })

            // 1. Destroy secure session
            const currentSession = get().session
            if (currentSession) {
                destroySession(currentSession.access_token)
            }

            // 2. Stop session monitoring
            stopSessionMonitoring()

            if (window.electronAPI?.auth) {
                window.electronAPI.auth.setUser(null, null).catch(console.error)
            }

            // 3. Sign out from Supabase
            await supabase.auth.signOut()

            // 4. Clear app state
            set({
                user: null,
                session: null,
                loading: false,
                lastActivity: 0,
            })

            // 5. Clear other stores
            const { useFocusStore } = await import('@/store/focusStore')
            const { useTaskStore } = await import('@/store/taskStore')
            const { useListStore } = await import('@/store/listStore')

            useFocusStore.getState().reset()
            useTaskStore.setState({ tasks: [], selectedTaskId: null })
            useListStore.setState({ lists: [], selectedListId: null })

            // 6. Clear any sensitive data from localStorage
            localStorage.removeItem('auth_attempts')

        } catch (error) {
            console.error('[Auth] Sign out error:', error)
            set({ loading: false })
        }
    },

    checkSessionValidity: () => {
        const state = get()
        if (!state.session) return false

        const validation = validateSession(state.session.access_token)

        if (!validation.valid) {
            console.warn('[Auth] Session invalid:', validation.reason)
            // Auto sign out on invalid session
            get().signOut()
            return false
        }

        return true
    },

    updateActivity: () => {
        const state = get()
        if (state.session) {
            updateSessionActivity(state.session.access_token)
            set({ lastActivity: Date.now() })
        }
    },

    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
}))

// ==================== SESSION MONITORING ====================

function startSessionMonitoring() {
    // Clear any existing intervals
    stopSessionMonitoring()

    // Check session validity every minute
    sessionTimeoutInterval = setInterval(() => {
        const state = useAuthStore.getState()

        if (!state.session) {
            stopSessionMonitoring()
            return
        }

        const isValid = state.checkSessionValidity()

        if (!isValid) {
            console.warn('[Auth] Session expired, signing out')
            state.signOut()
        }
    }, 60000) // Check every minute

    // Check for inactivity every 30 seconds
    activityCheckInterval = setInterval(() => {
        const state = useAuthStore.getState()

        if (!state.session) {
            stopSessionMonitoring()
            return
        }

        const inactiveTime = Date.now() - state.lastActivity

        if (inactiveTime > SECURITY_CONFIG.SESSION.TIMEOUT_MS) {
            console.warn('[Auth] Session timeout due to inactivity')
            state.signOut()
        }
    }, 30000) // Check every 30 seconds
}

function stopSessionMonitoring() {
    if (sessionTimeoutInterval) {
        clearInterval(sessionTimeoutInterval)
        sessionTimeoutInterval = null
    }
    if (activityCheckInterval) {
        clearInterval(activityCheckInterval)
        activityCheckInterval = null
    }
}

// ==================== ACTIVITY TRACKING ====================

// Track user activity to update session
if (typeof window !== 'undefined') {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']

    let activityTimeout: NodeJS.Timeout | null = null

    const handleActivity = () => {
        // Debounce activity updates
        if (activityTimeout) clearTimeout(activityTimeout)

        activityTimeout = setTimeout(() => {
            const state = useAuthStore.getState()
            if (state.session) {
                state.updateActivity()
            }
        }, 1000) // Update at most once per second
    }

    activityEvents.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true })
    })
}
