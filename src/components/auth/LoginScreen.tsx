import { useState, FormEvent, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { validateEmail, validatePassword } from '@/utils/securityUtils'
import { Shield, Lock, Mail, Eye, EyeOff, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

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

    // Real-time email validation
    useEffect(() => {
        if (email && email.length > 0) {
            const validation = validateEmail(email)
            setEmailError(validation.valid ? '' : validation.error || '')
        } else {
            setEmailError('')
        }
    }, [email])

    // Real-time password validation (only for signup)
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

        // Final validation before submission
        const emailValidation = validateEmail(email)
        if (!emailValidation.valid) {
            setError(emailValidation.error || 'Invalid email')
            return
        }

        if (isSignUp) {
            const passwordValidation = validatePassword(password)
            if (!passwordValidation.valid) {
                setError(passwordValidation.errors[0] || 'Password does not meet security requirements')
                return
            }
        }

        setLoading(true)

        try {
            if (isSignUp) {
                const result = await signUp(email, password)

                if (result.success) {
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
                    navigate('/dashboard')
                } else {
                    setError(result.error || 'Login failed')
                }
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const getStrengthColor = (strength: string) => {
        switch (strength) {
            case 'very-strong':
                return 'bg-emerald-500'
            case 'strong':
                return 'bg-green-500'
            case 'medium':
                return 'bg-yellow-500'
            default:
                return 'bg-red-500'
        }
    }

    const getStrengthText = (strength: string) => {
        switch (strength) {
            case 'very-strong':
                return 'Very Strong'
            case 'strong':
                return 'Strong'
            case 'medium':
                return 'Medium'
            default:
                return 'Weak'
        }
    }

    return (
        <div className="h-full overflow-y-auto flex flex-col bg-gradient-to-br from-[#0a0c10] via-[#0d0f14] to-[#0a0c10] px-4 font-sans select-none relative">
            {/* Enhanced Ambient Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/8 blur-[150px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-500/5 blur-[200px] rounded-full pointer-events-none" />

            {/* Security Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
            }} />

            <div className="min-h-full flex items-center justify-center py-12">
                <div className="max-w-md w-full space-y-6 glass-thick p-8 rounded-3xl relative z-10">
                    {/* Security Badge */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg shadow-blue-500/30">
                            <Shield className="w-4 h-4 text-white" />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Secure Authentication</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center pt-4">
                        <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.2em]">
                                {isSignUp ? 'Registration Protocol' : 'Authentication Protocol'}
                            </span>
                        </div>
                        <h1 className="text-5xl font-black text-white mb-3 tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                            Quoril<span className="text-blue-500">_</span>
                        </h1>
                        <p className="text-sm text-white/40 font-medium">
                            {isSignUp ? 'Create your secure tactical workspace' : 'Access your secure workspace'}
                        </p>
                    </div>

                    {/* Success/Verification View */}
                    {success ? (
                        <div className="mt-8 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-500/20 backdrop-blur-sm">
                                <Mail className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Verification Required</h2>
                            <p className="text-sm text-white/50 mb-2 max-w-[300px] mx-auto leading-relaxed">
                                We've sent a secure verification link to:
                            </p>
                            <p className="text-base text-blue-400 font-semibold mb-8">{email}</p>
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-white/60 text-left leading-relaxed">
                                        Click the verification link in your email to activate your account. Check your spam folder if you don't see it.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSuccess('')
                                    setIsSignUp(false)
                                    setEmail('')
                                    setPassword('')
                                }}
                                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all border border-white/10 hover:border-white/20"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        /* Form */
                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            <div className="space-y-5">
                                {/* Email Input */}
                                <div className="group">
                                    <label htmlFor="email" className="flex items-center gap-2 text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 ml-1">
                                        <Mail className="w-3.5 h-3.5" />
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`w-full px-5 py-4 bg-white/[0.03] border ${emailError
                                                ? 'border-red-500/50 focus:border-red-500'
                                                : email && !emailError
                                                    ? 'border-emerald-500/50 focus:border-emerald-500'
                                                    : 'border-white/10 focus:border-blue-500/50'
                                                } rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 ${emailError
                                                    ? 'focus:ring-red-500/20'
                                                    : email && !emailError
                                                        ? 'focus:ring-emerald-500/20'
                                                        : 'focus:ring-blue-500/20'
                                                } transition-all duration-300 text-sm`}
                                            placeholder="your.email@example.com"
                                        />
                                        {email && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                {emailError ? (
                                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                                ) : (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {emailError && (
                                        <p className="mt-2 text-xs text-red-400 ml-1 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3 h-3" />
                                            {emailError}
                                        </p>
                                    )}
                                </div>

                                {/* Password Input */}
                                <div className="group">
                                    <label htmlFor="password" className="flex items-center gap-2 text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 ml-1">
                                        <Lock className="w-3.5 h-3.5" />
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full px-5 py-4 pr-12 bg-white/[0.03] border ${passwordError
                                                ? 'border-red-500/50 focus:border-red-500'
                                                : isSignUp && password && !passwordError
                                                    ? 'border-emerald-500/50 focus:border-emerald-500'
                                                    : 'border-white/10 focus:border-blue-500/50'
                                                } rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 ${passwordError
                                                    ? 'focus:ring-red-500/20'
                                                    : isSignUp && password && !passwordError
                                                        ? 'focus:ring-emerald-500/20'
                                                        : 'focus:ring-blue-500/20'
                                                } transition-all duration-300 text-sm font-mono`}
                                            placeholder="••••••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Password Strength Indicator (Signup only) */}
                                    {isSignUp && password && passwordStrength && (
                                        <div className="mt-3 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-white/40">Password Strength</span>
                                                <span className={`font-semibold ${passwordStrength.strength === 'very-strong' ? 'text-emerald-400' :
                                                    passwordStrength.strength === 'strong' ? 'text-green-400' :
                                                        passwordStrength.strength === 'medium' ? 'text-yellow-400' :
                                                            'text-red-400'
                                                    }`}>
                                                    {getStrengthText(passwordStrength.strength)}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${getStrengthColor(passwordStrength.strength)} transition-all duration-500 rounded-full`}
                                                    style={{ width: `${passwordStrength.score}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {passwordError && isSignUp && (
                                        <p className="mt-2 text-xs text-red-400 ml-1 flex items-start gap-1.5">
                                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            <span>{passwordError}</span>
                                        </p>
                                    )}

                                    {/* Password Requirements (Signup only) */}
                                    {isSignUp && !password && (
                                        <div className="mt-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2">Password Requirements:</p>
                                            <ul className="space-y-1 text-xs text-white/50">
                                                <li className="flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                                                    At least 8 characters
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                                                    Uppercase and lowercase letters
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                                                    At least one number
                                                </li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-sm">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-300 leading-relaxed">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !!emailError || (isSignUp && !!passwordError)}
                                className="group relative w-full overflow-hidden py-4 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold text-sm transition-all duration-300 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                {loading ? (
                                    <span className="flex items-center justify-center gap-3 relative z-10">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="uppercase tracking-widest text-[11px] font-black">
                                            {isSignUp ? 'Creating Account...' : 'Authenticating...'}
                                        </span>
                                    </span>
                                ) : (
                                    <span className="uppercase tracking-[0.15em] text-[11px] font-black relative z-10 flex items-center justify-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        {isSignUp ? 'Create Secure Account' : 'Secure Login'}
                                    </span>
                                )}
                            </button>

                            {/* Toggle Sign Up/Login */}
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSignUp(!isSignUp)
                                        setError('')
                                        setPassword('')
                                        setPasswordError('')
                                    }}
                                    className="text-xs font-semibold text-white/30 hover:text-blue-400 transition-all"
                                >
                                    {isSignUp
                                        ? 'Already have an account? Sign in'
                                        : "Don't have an account? Create one"}
                                </button>
                            </div>

                            {/* Divider + Google */}
                            <>
                                {/* Divider */}
                                <div className="relative flex items-center gap-3">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">or</span>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>

                                {/* Google Sign In */}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setError('')
                                        setLoading(true)
                                        const result = await signInWithGoogle()
                                        if (!result.success) {
                                            setLoading(false)
                                            if (result.error) setError(result.error)
                                        }
                                        // On success, loading stays true until
                                        // the deep link callback signs the user in
                                    }}
                                    disabled={loading}
                                    className="w-full py-3.5 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                    </svg>
                                    Continue with Google
                                </button>
                            </>
                        </form>
                    )}
                </div>
            </div>

            {/* Security Footer */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">
                <Shield className="w-3 h-3" />
                <span>256-bit Encryption • Secure Connection • Protected</span>
            </div>
        </div>
    )
}
