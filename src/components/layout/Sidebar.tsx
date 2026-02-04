import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Zap, LayoutGrid, Bell, Settings, LogOut } from 'lucide-react'
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
        <aside className="w-72 bg-[#0d0d0d] border-r border-white/5 flex flex-col p-6 space-y-8 shrink-0 hidden lg:flex">
            {/* Logo Section */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Zap className="text-white w-5 h-5 fill-current" />
                    </div>
                    <h1 className="text-xl font-bold text-white">
                        Quoril <span className="text-[10px] text-blue-500 font-normal px-1 border border-blue-500/30 rounded uppercase tracking-tighter ml-1">BETA</span>
                    </h1>
                </div>
                <p className="text-[10px] text-gray-600 font-mono tracking-tighter">Plan: Free Trial</p>
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
                        ? "bg-blue-600/20 border-blue-400 scale-[1.05] shadow-[0_0_40px_rgba(59,130,246,0.3)] ring-4 ring-blue-500/10"
                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                )}
            >
                {/* Background Glow */}
                <div className={cn(
                    "absolute inset-0 opacity-20 transition-opacity duration-500",
                    isDragOver ? "opacity-40 bg-gradient-to-b from-blue-500/20 to-transparent" : "opacity-0"
                )} />

                <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl relative z-10",
                    isDragOver
                        ? "bg-blue-500 text-white rotate-12 scale-110 shadow-blue-500/50"
                        : "bg-[#1a1a1c] text-blue-500/50 group-hover:text-blue-500 group-hover:scale-105"
                )}>
                    <Zap className={cn("w-7 h-7 transition-all", isDragOver && "fill-current animate-pulse")} />
                </div>

                <div className="text-center relative z-10">
                    <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.25em] transition-colors duration-300",
                        isDragOver ? "text-blue-400" : "text-white/40 group-hover:text-white/60"
                    )}>
                        {isDragOver ? "Release to Begin" : "Deep Work Zone"}
                    </p>
                    <p className="text-[9px] text-white/20 mt-1 font-medium italic">Drop any task into the void</p>
                </div>

                {isDragOver && (
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
                )}
            </div>

            {/* Sidebar Navigation */}
            <div className="flex-1 space-y-6">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-2">Main</h3>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition",
                            isDashboard ? "bg-blue-500/10 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4 text-blue-500" />
                        All my lists
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-xl transition">
                        <Bell className="w-4 h-4 text-gray-600" />
                        Archived lists
                    </button>
                </div>

                <div className="space-y-1 pt-4 border-t border-white/5">
                    <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-2">Quick Actions</h3>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500 hover:text-white transition group">
                        <div className="w-5 h-5 rounded border border-gray-700 flex items-center justify-center group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition">
                            <Plus className="w-3 h-3 text-gray-500 group-hover:text-blue-400" />
                        </div>
                        Create new list
                    </button>
                </div>
            </div>

            {/* User Profile / Status */}
            <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/10">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-200 truncate">{user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-gray-600 truncate">{user?.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => navigate('/settings')} className="flex items-center justify-center p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white transition group border border-transparent hover:border-white/5">
                        <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={handleSignOut} className="flex items-center justify-center p-2 rounded-xl bg-red-500/5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/10">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    )
}
