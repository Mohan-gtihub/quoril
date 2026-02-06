import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Bell, Settings, LogOut, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/helpers'
import { useTaskStore } from '@/store/taskStore'
import { subDays, format, startOfToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function GithubContributionChart({ tasks }: { tasks: any[] }) {
    const [viewDate, setViewDate] = useState(startOfToday())

    const weeks = 12
    const days = weeks * 7

    const dates = useMemo(() => {
        return Array.from({ length: days }).map((_, i) => subDays(viewDate, days - 1 - i))
    }, [viewDate, days])

    const getGlowStyle = (count: number) => {
        if (count === 0) return { backgroundColor: '#161b22' }
        if (count <= 2) return { backgroundColor: '#0e4429', opacity: 0.8 }
        if (count <= 4) return { backgroundColor: '#006d32', boxShadow: '0 0 12px rgba(0, 109, 50, 0.4), inset 0 0 4px rgba(0, 0, 0, 0.3)' }
        if (count <= 6) return { backgroundColor: '#26a641', boxShadow: '0 0 16px rgba(38, 166, 65, 0.7), inset 0 0 4px rgba(255, 255, 255, 0.2)' }
        return { backgroundColor: '#39d353', boxShadow: '0 0 25px rgba(57, 211, 83, 1), inset 0 0 6px rgba(255, 255, 255, 0.4)' }
    }

    const completedDates = tasks
        .filter(t => t.status === 'done' && t.completed_at)
        .map(t => new Date(t.completed_at))

    return (
        <div className="space-y-3 px-1">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Focus Activity</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase whitespace-nowrap tabular-nums tracking-tighter">
                        {format(viewDate, 'MMM yyyy')}
                    </span>
                    <div className="flex bg-[var(--bg-hover)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                        <button
                            onClick={() => setViewDate(subMonths(viewDate, 1))}
                            className="p-1 px-1.5 hover:text-[var(--text-primary)] transition-all hover:bg-[var(--bg-tertiary)] active:scale-90"
                        >
                            <ChevronLeft size={10} />
                        </button>
                        <button
                            onClick={() => setViewDate(addMonths(viewDate, 1))}
                            className="p-1 px-1.5 border-l border-[var(--border-default)] hover:text-[var(--text-primary)] transition-all hover:bg-[var(--bg-tertiary)] active:scale-90"
                        >
                            <ChevronRight size={10} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-[#0b0e14] border border-[var(--border-default)] p-3 rounded-2xl shadow-inner">
                <div className="grid grid-cols-12 gap-1.5">
                    {dates.map((date, i) => {
                        const count = completedDates.filter(d => isSameDay(d, date)).length
                        return (
                            <div
                                key={i}
                                className="w-3.5 h-3.5 rounded-[3px] transition-all duration-500 cursor-crosshair transform hover:scale-125 hover:z-10"
                                style={getGlowStyle(count)}
                                title={`${format(date, 'MMM d, yyyy')}: ${count} focus missions`}
                            />
                        )
                    })}
                </div>
                <div className="mt-4 flex items-center justify-between text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">
                    <span className="opacity-50">Dormant</span>
                    <div className="flex gap-1.5 items-center">
                        <div className="w-2 h-2 rounded-[1px] bg-[#161b22]" />
                        <div className="w-2 h-2 rounded-[1px] bg-[rgba(57,211,83,0.3)]" />
                        <div className="w-2 h-2 rounded-[1px] bg-[rgba(57,211,83,0.7)]" />
                        <div className="w-2 h-2 rounded-[1px] bg-[rgba(57,211,83,1)] shadow-[0_0_8px_rgba(57,211,83,0.8)]" />
                    </div>
                    <span className="text-[var(--accent-primary)]">Radiant</span>
                </div>
            </div>
        </div>
    )
}

export function Sidebar() {
    const { signOut, user } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()

    const isDashboard = location.pathname === '/dashboard'

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Sign out error:', error)
        }
    }

    return (
        <aside className="w-72 bg-[var(--bg-secondary)] border-r border-[var(--border-default)] flex flex-col p-6 space-y-8 shrink-0 hidden lg:flex">
            {/* Logo Section */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center">
                            <img src="/icon.png" alt="Quoril" className="w-8 h-8 object-contain" />
                        </div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">
                            Quoril <span className="text-[10px] text-[var(--accent-primary)] font-normal px-1 border border-[var(--accent-primary)]/30 rounded uppercase tracking-tighter ml-1">BETA</span>
                        </h1>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono tracking-tighter">Plan: Free Trial</p>
                </div>
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    title="Settings"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            {/* GITHUB STREAK CHART */}
            <GithubContributionChart tasks={useTaskStore().tasks} />

            {/* Sidebar Navigation */}
            <div className="flex-1 space-y-6">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-2">Main</h3>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition",
                            isDashboard ? "bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4 text-[var(--accent-primary)]" />
                        All my lists
                    </button>
                    <button
                        onClick={() => navigate('/reports')}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition",
                            location.pathname === '/reports' ? "bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        )}
                    >
                        <BarChart3 className="w-4 h-4 text-[var(--accent-primary)]" />
                        Intelligence
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition">
                        <Bell className="w-4 h-4 text-[var(--text-tertiary)]" />
                        Archived lists
                    </button>
                </div>

                <div className="pt-2">
                    <button
                        onClick={() => navigate('/settings')}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition"
                    >
                        <Settings className="w-4 h-4 text-[var(--text-tertiary)]" />
                        Settings
                    </button>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--error)] hover:bg-[var(--error)]/10 rounded-xl transition"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* User Profile / Status */}
            <div className="pt-6 border-t border-[var(--border-default)]">
                <div className="flex items-center gap-3 bg-[var(--bg-hover)] p-3 rounded-2xl relative group overflow-hidden border border-[var(--border-default)] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-[var(--accent-primary)]/10 shrink-0">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
