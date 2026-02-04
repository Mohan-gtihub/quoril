import { NavLink } from 'react-router-dom'
import { Home, BarChart3, HelpCircle } from 'lucide-react'
import { cn } from '@/utils/helpers'

export function BottomNav() {
    return (
        <div className="h-14 bg-[#0d0d0d] border-t border-white/5 flex items-center px-6 justify-between shrink-0">
            <div className="flex items-center gap-6">
                <BottomLink to="/dashboard" icon={<Home className="w-4 h-4" />} label="Home" />
                <BottomLink to="/reports" icon={<BarChart3 className="w-4 h-4" />} label="Reports" />
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-gray-500 hover:text-white transition">
                    <HelpCircle className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-black">M</span>
                </div>
            </div>
        </div>
    )
}

function BottomLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                isActive ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
            )}
        >
            {icon}
            {label}
        </NavLink>
    )
}
