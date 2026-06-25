import { NavLink } from 'react-router-dom'
import { Home, Kanban, Folders, BarChart3 } from 'lucide-react'
import { cn } from '@/utils/helpers'

export function BottomNav() {
    return (
        <div className="md:hidden shrink-0 px-4 pb-4 pt-2 bg-gradient-to-t from-[var(--bg-primary)] to-transparent">
            <div className="flex items-center justify-around gap-1 bg-[var(--bg-card)] px-2 py-1.5 shadow-sm" style={{ borderRadius: 'var(--radius-pill)' }}>
                <BottomLink to="/dashboard" icon={<Home className="w-[18px] h-[18px]" />} label="Home" />
                <BottomLink to="/planner" icon={<Kanban className="w-[18px] h-[18px]" />} label="Planner" />
                <BottomLink to="/workspaces" icon={<Folders className="w-[18px] h-[18px]" />} label="Spaces" />
                <BottomLink to="/reports" icon={<BarChart3 className="w-[18px] h-[18px]" />} label="Reports" />
            </div>
        </div>
    )
}

function BottomLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <NavLink
            to={to}
            style={{ borderRadius: 'var(--radius-pill)' }}
            className={({ isActive }) => cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold transition-all",
                isActive
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            )}
        >
            {icon}
            {label}
        </NavLink>
    )
}
