import { useState, FormEvent, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { validateEmail, validatePassword } from '@/utils/securityUtils'
import { Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspaceStore'

export function LoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState<{
        score: number
        strength: string
        errors: string[]
    } | null>(null)
    const [emailError, setEmailError] = useState('')
    const [passwordError, setPasswordError] = useState('')

    const { signIn, signUp, signInWithGoogle, session } = useAuthStore()
    const navigate = useNavigate()
    const { setActiveWorkspace } = useWorkspaceStore()
    const oauthTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    // When a session appears (e.g. the Google OAuth callback completes), clear
    // the pending timeout and route to the dashboard — same as email login.
    useEffect(() => {
        if (session) {
            if (oauthTimeout.current) clearTimeout(oauthTimeout.current)
            navigate('/dashboard')
        }
    }, [session, navigate])

    // Clean up the timeout if the screen unmounts mid-flow.
    useEffect(() => () => {
        if (oauthTimeout.current) clearTimeout(oauthTimeout.current)
    }, [])

    useEffect(() => {
        if (email && email.length > 0) {
            const validation = validateEmail(email)
            setEmailError(validation.valid ? '' : validation.error || '')
        } else {
            setEmailError('')
        }
    }, [email])

    useEffect(() => {
        if (isSignUp && password && password.length > 0) {
            const validation = validatePassword(password)
            setPasswordStrength({
                score: validation.score,
                strength: validation.strength,
                errors: validation.errors,
            })
            setPasswordError(validation.valid ? '' : validation.errors[0] || '')
        } else {
            setPasswordStrength(null)
            setPasswordError('')
        }
    }, [password, isSignUp])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        const emailValidation = validateEmail(email)
        if (!emailValidation.valid) {
            setError(emailValidation.error || 'Invalid email')
            return
        }

        if (isSignUp) {
            const passwordValidation = validatePassword(password)
            if (!passwordValidation.valid) {
                setError(passwordValidation.errors[0] || 'Password does not meet requirements')
                return
            }
        }

        setLoading(true)

        try {
            if (isSignUp) {
                const result = await signUp(email, password)
                if (result.success) {
                    setActiveWorkspace(null)
                    if (result.requiresVerification) {
                        setSuccess('verification')
                    } else {
                        navigate('/dashboard')
                    }
                } else {
                    setError(result.error || 'Signup failed')
                }
            } else {
                const result = await signIn(email, password)
                if (result.success) {
                    setActiveWorkspace(null)
                    navigate('/dashboard')
                } else {
                    setError(result.error || 'Login failed')
                }
            }
        } catch {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const strengthColor = (s: string) =>
        s === 'very-strong' ? 'var(--success)' : s === 'strong' ? 'var(--accent-primary)' : s === 'medium' ? 'var(--warning)' : 'var(--error)'

    const strengthLabel = (s: string) =>
        s === 'very-strong' ? 'Very Strong' : s === 'strong' ? 'Strong' : s === 'medium' ? 'Medium' : 'Weak'

    /* ── Verification Screen ── */
    if (success === 'verification') {
        return (
            <div className="h-full flex items-center justify-center bg-[var(--bg-primary)] select-none">
                <div className="text-center max-w-sm px-8 py-10 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-hover)]">
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">Check your inbox</h2>
                    <p className="text-sm text-[var(--text-tertiary)] mb-1">Verification link sent to</p>
                    <p className="text-sm text-[var(--accent-primary)] font-medium mb-6">{email}</p>
                    <p className="text-xs text-[var(--text-muted)] mb-6">Click the link in the email to activate your account. Check spam if you don't see it.</p>
                    <button
                        onClick={() => { setSuccess(''); setIsSignUp(false); setEmail(''); setPassword('') }}
                        className="w-full py-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-all border border-[var(--border-default)]"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        )
    }

    /* ── Main Layout ── */
    return (
        <div className="h-full flex overflow-hidden bg-[var(--bg-primary)] select-none font-sans">

            {/* ── LEFT PANEL ── */}
            <div className="hidden lg:flex flex-col w-[45%] bg-[var(--bg-secondary)] border-r border-[var(--border-default)]">
                <div className="flex flex-col h-full p-12">
                    {/* Logo */}
                    <div className="mb-auto">
                        <span className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Quoril<span className="text-[var(--accent-primary)]">.</span></span>
                    </div>

                    {/* Hero text */}
                    <div className="mb-auto">
                        <h1 className="text-5xl font-semibold text-[var(--text-primary)] leading-[1.05] tracking-tight mb-5">
                            Focus deeper.<br />
                            <span className="text-[var(--accent-primary)]">Ship faster.</span>
                        </h1>
                        <p className="text-[15px] text-[var(--text-tertiary)] leading-relaxed max-w-sm">
                            The productivity workspace built for deep work — task management, focus timer, and screen time analytics in one place.
                        </p>
                    </div>

                    {/* Features — plain list */}
                    <ul className="space-y-4 mb-12">
                        {[
                            { label: 'Kanban task management', sub: 'Backlog → Today → Done' },
                            { label: 'Pomodoro focus timer', sub: 'Sessions, breaks & reflections' },
                            { label: 'Screen time analytics', sub: 'Know where your time goes' },
                        ].map(({ label, sub }) => (
                            <li key={label} className="flex items-baseline gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0 translate-y-[5px]" />
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{sub}</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {/* Footer */}
                    <p className="text-[11px] text-[var(--text-muted)] tracking-wide">
                        End-to-end encrypted · Your data, your control
                    </p>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10">
                <div className="w-full max-w-[380px]">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center mb-8">
                        <span className="text-lg font-semibold text-[var(--text-primary)]">Quoril<span className="text-[var(--accent-primary)]">.</span></span>
                    </div>

                    {/* Header */}
                    <div className="mb-7">
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">
                            {isSignUp ? 'Create account' : 'Welcome back'}
                        </h2>
                        <p className="text-sm text-[var(--text-tertiary)]">
                            {isSignUp ? 'Get started for free — no credit card needed.' : 'Sign in to your workspace.'}
                        </p>
                    </div>

                    {/* Google Button — always first */}
                    <button
                        type="button"
                        onClick={async () => {
                            setError('')
                            setLoading(true)
                            const result = await signInWithGoogle()
                            if (result.success) {
                                setActiveWorkspace(null)
                                // The OAuth callback may never come back (user closes the
                                // Google tab / cancels). Don't leave the UI stuck on the
                                // spinner forever — recover after a timeout.
                                if (oauthTimeout.current) clearTimeout(oauthTimeout.current)
                                oauthTimeout.current = setTimeout(() => {
                                    setLoading(false)
                                    setError('Sign-in timed out. Please try again.')
                                }, 90_000)
                            } else {
                                setLoading(false)
                                if (result.error) setError(result.error)
                            }
                        }}
                        disabled={loading}
                        className="w-full mb-5 py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/20 active:scale-[0.99]"
                    >
                        <svg width="17" height="17" viewBox="0 0 48 48" fill="none">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="relative flex items-center gap-3 mb-5">
                        <div className="flex-1 h-px bg-[var(--border-default)]" />
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">or</span>
                        <div className="flex-1 h-px bg-[var(--border-default)]" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full px-4 py-3 bg-[var(--bg-hover)] border ${emailError
                                        ? 'border-red-500/40 focus:border-red-500/70'
                                        : email && !emailError
                                            ? 'border-[var(--success)]/40 focus:border-[var(--success)]/70'
                                            : 'border-[var(--border-default)] focus:border-[var(--accent-primary)]/50'
                                        } rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none transition-colors duration-200`}
                                    placeholder="you@example.com"
                                />
                                {email && (
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                        {emailError
                                            ? <AlertTriangle className="w-4 h-4 text-red-400" />
                                            : <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                                        }
                                    </div>
                                )}
                            </div>
                            {emailError && (
                                <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />{emailError}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full px-4 py-3 pr-11 bg-[var(--bg-hover)] border ${passwordError
                                        ? 'border-red-500/40 focus:border-red-500/70'
                                        : isSignUp && password && !passwordError
                                            ? 'border-[var(--success)]/40 focus:border-[var(--success)]/70'
                                            : 'border-[var(--border-default)] focus:border-[var(--accent-primary)]/50'
                                        } rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none transition-colors duration-200 font-mono`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Strength bar (signup only, when typing) */}
                            {isSignUp && password && passwordStrength && (
                                <div className="mt-2">
                                    <div className="h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${passwordStrength.score}%`,
                                                backgroundColor: strengthColor(passwordStrength.strength)
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                        Strength: <span style={{ color: strengthColor(passwordStrength.strength) }}>{strengthLabel(passwordStrength.strength)}</span>
                                        {isSignUp && !password && ' · 8+ chars, upper, lower, number'}
                                    </p>
                                </div>
                            )}

                            {/* Requirements hint when field is empty on signup */}
                            {isSignUp && !password && (
                                <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">8+ chars · uppercase · lowercase · number</p>
                            )}

                            {passwordError && isSignUp && (
                                <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />{passwordError}
                                </p>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="rounded-xl bg-red-500/8 border border-red-500/25 px-4 py-3 flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-300 leading-relaxed">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !!emailError || (isSignUp && !!passwordError)}
                            className="w-full py-3.5 bg-[var(--accent-primary)] hover:brightness-105 active:brightness-95 text-[var(--accent-contrast)] rounded-xl font-bold text-sm transition-all duration-150 shadow-[0_4px_20px_var(--accent-glow)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                                        {isSignUp ? 'Creating...' : 'Signing in...'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <p className="text-center text-xs text-[var(--text-muted)] mt-5">
                        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setPassword(''); setPasswordError('') }}
                            className="text-[var(--accent-primary)] hover:brightness-110 font-semibold transition-colors"
                        >
                            {isSignUp ? 'Sign in' : 'Create one'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}
