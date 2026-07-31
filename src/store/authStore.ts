import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import {
    validateEmail,
    validatePassword,
    checkLoginRateLimit,
    clearRateLimit,
    getSecureErrorMessage,
    generateBrowserFingerprint,
    initRateLimitStore,
} from '@/utils/securityUtils'
import { SECURITY_CONFIG } from '@/config/security'
import { platform } from '@/services/platform'
import { rolesOf, tierOf, type AppRole, type SubscriptionTier } from '@/utils/permissions'
import { analytics } from '@/services/analytics'

interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
    initialized: boolean
    lastActivity: number
    sessionFingerprint: string | null

    // Roles & entitlements, decoded from the session JWT (via the Supabase
    // custom_access_token_hook). Kept in sync wherever the session is set.
    roles: AppRole[]
    tier: SubscriptionTier

    // Actions
    initialize: () => Promise<void>
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
    signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>
    signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
    signOut: () => Promise<void>
    updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
    updateEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>
    sendPasswordReset: () => Promise<{ success: boolean; error?: string }>
    checkSessionValidity: () => boolean
    updateActivity: () => void
    setUser: (user: User | null) => void
    setSession: (session: Session | null) => void
}

// 'app.opened' is a per-app-run launch count, but SIGNED_IN can fire more than
// once in a run (deep-link exchange, re-auth). Latch it so the count stays 1:1
// with launches.
let appOpenedEmitted = false

// Session timeout checker
let sessionTimeoutInterval: NodeJS.Timeout | null = null
let activityCheckInterval: NodeJS.Timeout | null = null

// Derive the role/tier fields from a SESSION so every session-setting path
// stays consistent. The custom_access_token_hook injects roles/tier into the
// access token (JWT), not user.app_metadata, so we must decode the session's
// token — rolesOf/tierOf handle that when given a session.
function claimsOf(session: Session | null) {
    return { roles: rolesOf(session), tier: tierOf(session) }
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    loading: false,
    initialized: false,
    lastActivity: Date.now(),
    sessionFingerprint: null,
    roles: [],
    tier: 'free',

    initialize: async () => {
        const state = get()
        if (state.initialized) {
            return
        }

        try {
            set({ loading: true })

            // Load persisted rate-limit records so lockouts survive restarts
            await initRateLimitStore()

            // Generate browser fingerprint for session validation
            const fingerprint = generateBrowserFingerprint()
            set({ sessionFingerprint: fingerprint })

            // 1. Get initial session.
            // getSession() can hang in the browser (Web Locks contention or an
            // unprocessed OAuth code in the URL). Race it with a timeout so the
            // app never gets stuck on the "Initializing System..." spinner.
            const sessionResult = await Promise.race([
                supabase.auth.getSession(),
                new Promise<{ data: { session: null } }>(resolve =>
                    setTimeout(() => resolve({ data: { session: null } }), 4000)
                ),
            ])
            const session = sessionResult.data.session

            if (session) {
                // Notify main process for synchronization engine
                platform.auth.setUser(session.user.id, session.access_token)

                set({
                    session,
                    user: session.user,
                    ...claimsOf(session),
                    initialized: true,
                    loading: false,
                    lastActivity: Date.now(),
                })

                // Start session monitoring
                startSessionMonitoring()

                // A restored session does not raise SIGNED_IN, so identify here
                // too — otherwise every returning user's run is unattributed.
                analytics.identify(session.user.id)
                if (!appOpenedEmitted) {
                    appOpenedEmitted = true
                    analytics.track('app.opened')
                }
            } else {
                set({
                    session: null,
                    user: null,
                    roles: [],
                    tier: 'free',
                    initialized: true,
                    loading: false,
                })
            }

            // 2. Listen for auth state changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    set({
                        session,
                        user: session.user,
                        ...claimsOf(session),
                        loading: false,
                        lastActivity: Date.now(),
                    })
                    platform.auth.setUser(session.user.id, session.access_token)
                    startSessionMonitoring()

                    analytics.identify(session.user.id)
                    if (!appOpenedEmitted) {
                        appOpenedEmitted = true
                        analytics.track('app.opened')
                    }

                    // Hydrate the profile here, not just when Settings mounts:
                    // the greeting and sidebar read full_name from this store on
                    // first paint and would otherwise fall back to the email.
                    void import('@/store/profileStore').then(({ useProfileStore }) => {
                        void useProfileStore.getState().fetchProfile(session.user.id)
                    })
                } else if (event === 'SIGNED_OUT') {
                    stopSessionMonitoring()
                    analytics.reset()
                    set({
                        session: null,
                        user: null,
                        roles: [],
                        tier: 'free',
                        loading: false,
                    })
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    // Update session on token refresh — re-read claims in case
                    // roles/tier changed since the last token was minted.
                    set({
                        session,
                        user: session.user,
                        ...claimsOf(session),
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

            set({
                session: data.session,
                user: data.user,
                ...claimsOf(data.session),
                loading: false,
                lastActivity: Date.now(),
            })

            platform.auth.setUser(data.user.id, data.session.access_token)

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
                set({
                    session: data.session,
                    user: data.user,
                    ...claimsOf(data.session),
                    loading: false,
                    lastActivity: Date.now(),
                })

                platform.auth.setUser(data.user.id, data.session.access_token)
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

            const isElectronEnv = platform.capabilities.nativeOverlay

            // Browser (web) flow: use a normal http(s) redirect back to this app
            // and let Supabase navigate the current tab. The quoril:// scheme is
            // only registered by the desktop app, so using it in a browser would
            // hand the OAuth callback to Electron instead of the web app.
            if (!isElectronEnv) {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin,
                    },
                })

                if (error) {
                    set({ loading: false })
                    return { success: false, error: error.message }
                }

                // Supabase redirects the tab to Google; loading stays true.
                return { success: true }
            }

            // Electron flow —
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
                const openResult = platform.links.openExternal(data.url)
                if (openResult && typeof openResult === 'object' && 'available' in openResult && !openResult.available) {
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

            // 1. Stop session monitoring
            stopSessionMonitoring()

            platform.auth.setUser(null, null)

            // 3. Sign out from Supabase
            await supabase.auth.signOut()

            // 4. Clear app state
            set({
                user: null,
                session: null,
                roles: [],
                tier: 'free',
                loading: false,
                lastActivity: 0,
            })

            // 5. Clear other stores
            const { useFocusStore } = await import('@/store/focusStore')
            const { useTaskStore } = await import('@/store/taskStore')
            const { useListStore } = await import('@/store/listStore')

            const { useProfileStore } = await import('@/store/profileStore')

            useFocusStore.getState().reset()
            useTaskStore.setState({ tasks: [], selectedTaskId: null })
            useListStore.setState({ lists: [], selectedListId: null })
            // Drop the cached name so the next user never sees the previous one.
            useProfileStore.setState({ fullName: '', avatarUrl: null })

            // 6. Clear any sensitive data from localStorage
            localStorage.removeItem('auth_attempts')

        } catch (error) {
            console.error('[Auth] Sign out error:', error)
            set({ loading: false })
        }
    },

    updatePassword: async (newPassword) => {
        const check = validatePassword(newPassword)
        if (!check.valid) {
            return { success: false, error: check.errors[0] || 'Password is too weak' }
        }
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) return { success: false, error: getSecureErrorMessage(error, 'general') }
            return { success: true }
        } catch (error) {
            return { success: false, error: getSecureErrorMessage(error, 'general') }
        }
    },

    updateEmail: async (newEmail) => {
        const emailCheck = validateEmail(newEmail)
        if (!emailCheck.valid) {
            return { success: false, error: emailCheck.error || 'Please enter a valid email address' }
        }
        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail })
            if (error) return { success: false, error: getSecureErrorMessage(error, 'general') }
            // Supabase sends a confirmation link to the new address before it takes effect.
            return { success: true }
        } catch (error) {
            return { success: false, error: getSecureErrorMessage(error, 'general') }
        }
    },

    sendPasswordReset: async () => {
        const email = get().user?.email
        if (!email) return { success: false, error: 'No email on file' }
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })
            if (error) return { success: false, error: getSecureErrorMessage(error, 'general') }
            return { success: true }
        } catch (error) {
            return { success: false, error: getSecureErrorMessage(error, 'general') }
        }
    },

    checkSessionValidity: () => {
        const state = get()
        if (!state.session) return false

        const now = Date.now()
        const inactiveTime = now - state.lastActivity
        if (inactiveTime > SECURITY_CONFIG.SESSION.TIMEOUT_MS) {
            get().signOut()
            return false
        }

        return true
    },

    updateActivity: () => {
        const state = get()
        if (state.session) {
            set({ lastActivity: Date.now() })
        }
    },

    // setUser has no access token, so it can't refresh claims — it only updates
    // the user object. Claims are derived from the session (setSession / auth
    // events), which is where the JWT with roles/tier lives.
    setUser: (user) => set({ user }),
    setSession: (session) =>
        set({ session, user: session?.user ?? null, ...claimsOf(session ?? null) }),
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
