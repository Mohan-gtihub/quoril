import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Zap, LayoutGrid, Bell, Settings, LogOut, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/helpers'
import { useState } from 'react'
import { useFocusStore } from '@/store/focusStore'

export function Sidebar() {
    const { signOut, user } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()

    const isDashboard = location.pathname === '/dashboard'

    const { startSession, setShowFocusPanel } = useFocusStore()
    const [isDragOver, setIsDragOver] = useState(false)

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Sign out error:', error)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const taskId = e.dataTransfer.getData('taskId')
        if (taskId) {
            startSession(taskId)
            setShowFocusPanel(true)
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

            {/* PREMIUM FOCUS DROP ZONE */}
            <div
                onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                    "relative group p-5 rounded-[2rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-3 overflow-hidden",
                    isDragOver
                        ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] scale-[1.05] shadow-[0_0_40px_var(--accent-glow)] ring-4 ring-[var(--accent-primary)]/10"
                        : "bg-[var(--bg-hover)] border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                )}
            >
                {/* Background Glow */}
                <div className={cn(
                    "absolute inset-0 opacity-20 transition-opacity duration-500",
                    isDragOver ? "opacity-40 bg-gradient-to-b from-[var(--accent-primary)]/20 to-transparent" : "opacity-0"
                )} />

                <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl relative z-10",
                    isDragOver
                        ? "bg-[var(--accent-primary)] text-white rotate-12 scale-110 shadow-[var(--accent-primary)]/50"
                        : "bg-[var(--bg-secondary)] text-[var(--accent-primary)]/50 group-hover:text-[var(--accent-primary)] group-hover:scale-105"
                )}>
                    <Zap className={cn("w-7 h-7 transition-all", isDragOver && "fill-current animate-pulse")} />
                </div>

                <div className="text-center relative z-10">
                    <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.25em] transition-colors duration-300",
                        isDragOver ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
                    )}>
                        {isDragOver ? "Release to Begin" : "Deep Work Zone"}
                    </p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-1 font-medium italic">Drop any task into the void</p>
                </div>

                {isDragOver && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/5 animate-pulse pointer-events-none" />
                )}
            </div>

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

                <div className="space-y-1 pt-4 border-t border-[var(--border-default)]">
                    <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-2">Quick Actions</h3>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition group">
                        <div className="w-5 h-5 rounded border border-[var(--border-default)] flex items-center justify-center group-hover:border-[var(--accent-primary)]/50 group-hover:bg-[var(--accent-primary)]/10 transition">
                            <Plus className="w-3 h-3 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)]" />
                        </div>
                        Create new list
                    </button>
                </div>
            </div>

            {/* User Profile / Status */}
            <div className="pt-6 border-t border-[var(--border-default)]">
                <div className="flex items-center gap-3 bg-[var(--bg-hover)] p-3 rounded-2xl relative group overflow-hidden border border-transparent hover:border-[var(--border-default)] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-[var(--accent-primary)]/10 shrink-0">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="p-2 rounded-xl text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    )
}
