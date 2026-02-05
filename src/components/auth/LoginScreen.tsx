import { useState, FormEvent } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { isValidEmail, formatErrorMessage } from '@/utils/validation'

export function LoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const { signIn, signUp } = useAuthStore()
    const navigate = useNavigate()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!isValidEmail(email)) {
            setError('Please enter a valid email address')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        setLoading(true)

        try {
            if (isSignUp) {
                await signUp(email, password)
                setSuccess('Account created! Please check your email for verification.')
            } else {
                await signIn(email, password)
                navigate('/dashboard')
            }
        } catch (err) {
            setError(formatErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-full flex items-center justify-center bg-[#0a0c10] px-4 font-sans select-none overflow-hidden relative">
            {/* Ambient Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-md w-full space-y-8 bg-[#0d0f14] p-10 rounded-3xl border border-white/5 shadow-2xl relative z-10">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                        <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">Operation: Login</span>
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                        Quoril<span className="text-blue-500">_</span>
                    </h1>
                    <p className="text-sm text-white/30 font-medium">
                        {isSignUp ? 'Initialize your tactical workspace' : 'Authenticate to resume focus'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-5">
                        <div className="group">
                            <label htmlFor="email" className="block text-[11px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 ml-1">
                                Neural Link (Email)
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl text-white placeholder-white/10 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-300"
                                placeholder="commander@neural.link"
                            />
                        </div>

                        <div className="group">
                            <label htmlFor="password" className="block text-[11px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 ml-1">
                                Secure Keyhole
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl text-white placeholder-white/10 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-300"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {success && (
                        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <p className="text-xs text-emerald-400 text-center font-medium leading-relaxed">{success}</p>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <p className="text-xs text-red-400 text-center font-medium leading-relaxed">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full overflow-hidden py-4 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-3">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span className="uppercase tracking-widest text-[11px] font-black">Syncing...</span>
                            </span>
                        ) : (
                            <span className="uppercase tracking-[0.15em] text-[11px] font-black">
                                {isSignUp ? 'Deploy Workspace' : 'Authorize Identity'}
                            </span>
                        )}
                    </button>

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp)
                                setError('')
                            }}
                            className="text-[11px] font-bold text-white/20 hover:text-white/60 uppercase tracking-widest transition-all"
                        >
                            {isSignUp
                                ? 'Already authorized? Login here'
                                : "Identity missing? Signup here"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Version Tag */}
            <div className="absolute bottom-8 text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
                System Ready // Secure Link Established
            </div>
        </div>
    )
}
