import { useState, FormEvent, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { validateEmail, validatePassword } from '@/utils/securityUtils'
import { Shield, Lock, Mail, Eye, EyeOff, AlertTriangle, CheckCircle2, Zap, Target, BarChart3, Clock } from 'lucide-react'
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

    const { signIn, signUp, signInWithGoogle } = useAuthStore()
    const navigate = useNavigate()
    const { setActiveWorkspace } = useWorkspaceStore()

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
        s === 'very-strong' ? '#10b981' : s === 'strong' ? '#22c55e' : s === 'medium' ? '#f59e0b' : '#ef4444'

    const strengthLabel = (s: string) =>
        s === 'very-strong' ? 'Very Strong' : s === 'strong' ? 'Strong' : s === 'medium' ? 'Medium' : 'Weak'

    /* ── Verification Screen ── */
    if (success === 'verification') {
        return (
            <div className="h-full flex items-center justify-center bg-[var(--bg-primary)] select-none">
                <div className="text-center max-w-sm px-8 py-10 rounded-2xl border border-white/8 bg-white/[0.02]">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                        <Mail className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
                    <p className="text-sm text-white/40 mb-1">Verification link sent to</p>
                    <p className="text-sm text-blue-400 font-medium mb-6">{email}</p>
                    <p className="text-xs text-white/30 mb-6">Click the link in the email to activate your account. Check spam if you don't see it.</p>
                    <button
                        onClick={() => { setSuccess(''); setIsSignUp(false); setEmail(''); setPassword('') }}
                        className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-all border border-white/8"
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
            <div className="hidden lg:flex flex-col w-[45%] relative overflow-hidden bg-gradient-to-br from-blue-950/60 to-[#09090b] border-r border-white/5">
                {/* Glow orbs */}
                <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[10%] right-[-10%] w-64 h-64 bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

                {/* Grid */}
                <div className="absolute inset-0 opacity-[0.025]" style={{
                    backgroundImage: 'linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />

                <div className="relative z-10 flex flex-col h-full p-10">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 mb-auto">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-black text-white tracking-tight">Quoril<span className="text-blue-500">_</span></span>
                    </div>

                    {/* Hero text */}
                    <div className="mb-auto">
                        <h1 className="text-4xl font-black text-white leading-tight mb-4">
                            Focus deeper.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Ship faster.</span>
                        </h1>
                        <p className="text-sm text-white/40 leading-relaxed max-w-xs">
                            The productivity workspace built for deep work — task management, focus timer, and screen time analytics in one place.
                        </p>
                    </div>

                    {/* Feature pills */}
                    <div className="space-y-3 mb-12">
                        {[
                            { icon: Target, label: 'Kanban task management', sub: 'Backlog → Today → Done' },
                            { icon: Clock, label: 'Pomodoro focus timer', sub: 'Sessions, breaks & reflections' },
                            { icon: BarChart3, label: 'Screen time analytics', sub: 'Know where your time goes' },
                        ].map(({ icon: Icon, label, sub }) => (
                            <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-white/80">{label}</p>
                                    <p className="text-[10px] text-white/30">{sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-2 text-[10px] text-white/20 font-mono tracking-widest uppercase">
                        <Shield className="w-3 h-3" />
                        <span>End-to-end encrypted · Your data, your control</span>
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 relative overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />

                <div className="relative z-10 w-full max-w-[380px]">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mb-8">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-lg font-black text-white">Quoril<span className="text-blue-500">_</span></span>
                    </div>

                    {/* Header */}
                    <div className="mb-7">
                        <h2 className="text-2xl font-black text-white mb-1">
                            {isSignUp ? 'Create account' : 'Welcome back'}
                        </h2>
                        <p className="text-sm text-white/35">
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
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">or</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">
                                <Mail className="w-3 h-3" />
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
                                    className={`w-full px-4 py-3 bg-white/[0.04] border ${emailError
                                        ? 'border-red-500/40 focus:border-red-500/70'
                                        : email && !emailError
                                            ? 'border-emerald-500/40 focus:border-emerald-500/70'
                                            : 'border-white/8 focus:border-blue-500/50'
                                        } rounded-xl text-white text-sm placeholder-white/20 focus:outline-none transition-colors duration-200`}
                                    placeholder="you@example.com"
                                />
                                {email && (
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                        {emailError
                                            ? <AlertTriangle className="w-4 h-4 text-red-400" />
                                            : <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
                            <label htmlFor="password" className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">
                                <Lock className="w-3 h-3" />
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
                                    className={`w-full px-4 py-3 pr-11 bg-white/[0.04] border ${passwordError
                                        ? 'border-red-500/40 focus:border-red-500/70'
                                        : isSignUp && password && !passwordError
                                            ? 'border-emerald-500/40 focus:border-emerald-500/70'
                                            : 'border-white/8 focus:border-blue-500/50'
                                        } rounded-xl text-white text-sm placeholder-white/20 focus:outline-none transition-colors duration-200 font-mono`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Strength bar (signup only, when typing) */}
                            {isSignUp && password && passwordStrength && (
                                <div className="mt-2">
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${passwordStrength.score}%`,
                                                backgroundColor: strengthColor(passwordStrength.strength)
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1 text-[10px] text-white/30">
                                        Strength: <span style={{ color: strengthColor(passwordStrength.strength) }}>{strengthLabel(passwordStrength.strength)}</span>
                                        {isSignUp && !password && ' · 8+ chars, upper, lower, number'}
                                    </p>
                                </div>
                            )}

                            {/* Requirements hint when field is empty on signup */}
                            {isSignUp && !password && (
                                <p className="mt-1.5 text-[10px] text-white/25">8+ chars · uppercase · lowercase · number</p>
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
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all duration-150 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/35 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="text-[11px] font-black uppercase tracking-wider">
                                        {isSignUp ? 'Creating...' : 'Signing in...'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5" />
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <p className="text-center text-xs text-white/30 mt-5">
                        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setPassword(''); setPasswordError('') }}
                            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                        >
                            {isSignUp ? 'Sign in' : 'Create one'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}
