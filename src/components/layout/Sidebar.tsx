import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Settings, LogOut, BarChart3, Plus, Edit2, Trash2, Check, MoreHorizontal, FolderKanban, Archive, ChevronDown, Folders, Kanban, Smartphone, Map, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { confirm as confirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/authStore'
import { useDisplayName } from '@/hooks/useDisplayName'
import { useListStore } from '@/store/listStore'
import { useWorkspaceStore, Workspace } from '@/store/workspaceStore'
import { cn } from '@/utils/helpers'
import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const PALETTE = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    '#f97316', '#a3e635',
]

/* ── Workspace Item Row ── */
function WorkspaceRow({ ws, isActive, onClick, collapsed }: { ws: Workspace; isActive: boolean; onClick: () => void; collapsed?: boolean }) {
    const { updateWorkspace, deleteWorkspace, workspaces } = useWorkspaceStore()
    const [showMenu, setShowMenu] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(ws.name)
    const [editColor, setEditColor] = useState(ws.color)
    const ref = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing) setTimeout(() => inputRef.current?.focus(), 60)
    }, [isEditing])

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setShowMenu(false); setIsEditing(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    async function handleSave() {
        if (!editName.trim()) return
        await updateWorkspace(ws.id, { name: editName.trim(), color: editColor })
        setIsEditing(false); setShowMenu(false)
    }

    async function handleDelete(e: React.MouseEvent) {
        e.stopPropagation()
        if (workspaces.length <= 1) return
        if (!await confirmDialog({ message: `Delete workspace "${ws.name}"? Lists inside won't be deleted.`, variant: 'danger', confirmLabel: 'Delete' })) return
        await deleteWorkspace(ws.id)
        setShowMenu(false)
    }

    if (isEditing) {
        return (
            <div className="px-3 py-2 -mx-1 my-0.5 bg-[var(--bg-tertiary)] space-y-2 relative z-10 w-full max-w-[calc(100%+8px)]" style={{ borderRadius: 'var(--radius-card)' }}>
                <input
                    ref={inputRef}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false) }}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] px-2 py-1.5 text-[13px] font-medium text-[var(--text-primary)] outline-none"
                    style={{ borderRadius: 'var(--radius-card)' }}
                    maxLength={50}
                />
                <div className="flex flex-wrap gap-1 px-0.5">
                    {PALETTE.map(c => (
                        <button key={c} onClick={() => setEditColor(c)}
                            className="w-3.5 h-3.5 hover:scale-110 transition-transform relative"
                            style={{ backgroundColor: c, borderRadius: 'var(--radius-pill)' }}>
                            {editColor === c && <Check size={8} className="text-white absolute inset-0 m-auto" />}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                    <button onClick={handleSave} className="flex-1 py-1 px-2 text-[11px] font-bold bg-[var(--accent-primary)] text-[var(--accent-contrast)]" style={{ borderRadius: 'var(--radius-card)' }}>Save</button>
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-1 px-2 text-[11px] font-bold text-[var(--text-muted)] border border-[var(--border-default)] hover:text-[var(--text-primary)] transition-colors" style={{ borderRadius: 'var(--radius-card)' }}>Cancel</button>
                </div>
            </div>
        )
    }

    if (collapsed) {
        return (
            <button
                onClick={onClick}
                title={ws.name}
                style={{ borderRadius: 'var(--radius-card)' }}
                className={cn(
                    'w-full flex items-center justify-center py-2 transition-all outline-none',
                    isActive ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'
                )}
            >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ws.color }} />
            </button>
        )
    }

    return (
        <div ref={ref} className="relative group">
            <div
                style={{ borderRadius: 'var(--radius-card)' }}
                className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-1.5 text-[13px] transition-all',
                    isActive ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                )}
            >
                <button
                    onClick={onClick}
                    className="flex-1 flex items-center gap-2.5 min-w-0 text-left outline-none"
                >
                    <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: ws.color }} />
                    <span className="flex-1 truncate">{ws.name}</span>
                </button>

                <button
                    type="button"
                    aria-label={`Options for ${ws.name}`}
                    aria-haspopup="menu"
                    aria-expanded={showMenu}
                    onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
                    style={{ borderRadius: 'var(--radius-card)' }}
                    className={cn("p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0 outline-none", showMenu ? "opacity-100 bg-[var(--bg-tertiary)] text-[var(--text-primary)]" : "opacity-0 group-hover:opacity-100")}
                >
                    <MoreHorizontal size={14} />
                </button>
            </div>

            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        className="absolute right-0 top-full mt-1 w-36 glass-thick z-50 shadow-sm overflow-hidden py-1"
                        style={{ borderRadius: 'var(--radius-card)' }}
                    >
                        <button onClick={() => { setIsEditing(true); setShowMenu(false) }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition">
                            <Edit2 size={12} /> Rename
                        </button>
                        {workspaces.length > 1 && (
                            <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--error)] hover:bg-[var(--error)]/10 transition">
                                <Trash2 size={12} /> Delete
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* ── Create workspace form ── */
function CreateWsInline({ onDone }: { onDone: () => void }) {
    const { createWorkspace } = useWorkspaceStore()
    const [name, setName] = useState('')
    const [color, setColor] = useState(PALETTE[0])
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60) }, [])

    async function handle() {
        if (!name.trim()) return
        setLoading(true)
        await createWorkspace({ name: name.trim(), color })
        setLoading(false)
        onDone()
    }

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
        >
            <div className="px-3 py-2 -mx-1 my-0.5 bg-[var(--bg-tertiary)] space-y-2 mt-1" style={{ borderRadius: 'var(--radius-card)' }}>
                <input
                    ref={inputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handle(); if (e.key === 'Escape') onDone() }}
                    placeholder="Workspace name…"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] px-2 py-1.5 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                    style={{ borderRadius: 'var(--radius-card)' }}
                />
                <div className="flex flex-wrap gap-1 px-0.5">
                    {PALETTE.map(c => (
                        <button key={c} onClick={() => setColor(c)}
                            aria-label={`Color ${c}`} aria-pressed={color === c} title={c}
                            className="w-3.5 h-3.5 hover:scale-110 transition-transform relative"
                            style={{ backgroundColor: c, borderRadius: 'var(--radius-pill)' }}>
                            {color === c && <Check size={8} className="text-white absolute inset-0 m-auto" />}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                    <button disabled={!name.trim() || loading} onClick={handle}
                        className="flex-1 py-1 px-2 text-[11px] font-bold bg-[var(--accent-primary)] disabled:opacity-40 text-[var(--accent-contrast)]" style={{ borderRadius: 'var(--radius-card)' }}>
                        {loading ? '…' : 'Create'}
                    </button>
                    <button onClick={onDone} className="flex-1 py-1 px-2 text-[11px] font-bold text-[var(--text-muted)] border border-[var(--border-default)] hover:text-[var(--text-primary)] transition-colors" style={{ borderRadius: 'var(--radius-card)' }}>Cancel</button>
                </div>
            </div>
        </motion.div>
    )
}

/* ── Main Sidebar ── */
export function Sidebar() {
    const { fetchLists } = useListStore()
    const { signOut, user } = useAuthStore()
    const displayName = useDisplayName()
    const { workspaces, activeWorkspaceId, setActiveWorkspace, loadWorkspaces } = useWorkspaceStore()
    const navigate = useNavigate()
    const location = useLocation()
    const [showCreateWs, setShowCreateWs] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('quoril.sidebarCollapsed') === '1' } catch { return false }
    })
    const userMenuRef = useRef<HTMLDivElement>(null)

    function toggleCollapsed() {
        setCollapsed(v => {
            const next = !v
            try { localStorage.setItem('quoril.sidebarCollapsed', next ? '1' : '0') } catch { /* noop */ }
            if (next) { setShowUserMenu(false); setShowCreateWs(false) }
            return next
        })
    }

    useEffect(() => { fetchLists(); if (user) loadWorkspaces() }, [user])

    useEffect(() => {
        if (!showUserMenu) return
        function handler(e: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showUserMenu])

    const isDashboard = location.pathname === '/dashboard'

    const NavItem = ({ icon, label, path, active }: { icon: React.ReactNode; label: string; path: string; active?: boolean }) => (
        <button
            onClick={() => {
                if (path === '/dashboard') setActiveWorkspace('unassigned'); // Unassigned is treated as home root logic or just 'null'.
                navigate(path)
            }}
            title={collapsed ? label : undefined}
            style={{ borderRadius: 'var(--radius-card)' }}
            className={cn(
                'w-full flex items-center text-[13px] font-medium transition-all text-left outline-none',
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
                active
                    ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
        >
            <span className={cn("flex items-center justify-center", active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>{icon}</span>
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
        </button>
    )

    return (
        <aside className={cn(
            "bg-[var(--bg-secondary)] border-r border-[var(--border-default)] flex flex-col h-full shrink-0 hidden lg:flex transition-[width] duration-300 ease-in-out relative z-40",
            collapsed ? "w-[64px]" : "w-[228px]"
        )}>

            {/* Brand + collapse toggle */}
            <div className={cn("pt-5 pb-1 flex items-center", collapsed ? "px-0 justify-center" : "px-4 gap-2.5")}>
                <img src={`${import.meta.env.BASE_URL}brand-mark.png`} alt="Quoril" className="w-7 h-7 shrink-0" style={{ borderRadius: 'var(--radius-card)' }} />
                {!collapsed && (
                    <>
                        <span className="text-[15px] font-bold tracking-tight text-[var(--text-primary)] flex-1">Quoril<span className="text-[var(--accent-primary)]">.</span></span>
                        <button onClick={toggleCollapsed} title="Collapse sidebar" className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors" style={{ borderRadius: 'var(--radius-card)' }}>
                            <PanelLeftClose size={16} />
                        </button>
                    </>
                )}
            </div>

            {collapsed && (
                <button onClick={toggleCollapsed} title="Expand sidebar" className="mx-auto mt-2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors" style={{ borderRadius: 'var(--radius-card)' }}>
                    <PanelLeftOpen size={16} />
                </button>
            )}

            {/* Top User Profile / Dropdown */}
            <div ref={userMenuRef} className={cn("relative pt-3 pb-2", collapsed ? "px-0" : "px-2")}>
                <button
                    onClick={() => collapsed ? navigate('/settings') : setShowUserMenu(v => !v)}
                    title={collapsed ? displayName : undefined}
                    style={{ borderRadius: 'var(--radius-card)' }}
                    className={cn(
                        "w-full flex items-center hover:bg-[var(--bg-hover)] transition-colors text-left outline-none",
                        collapsed ? "justify-center py-1.5" : "gap-2 px-2 py-1.5"
                    )}
                >
                    <div className="w-5 h-5 bg-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-contrast)] text-[11px] font-semibold shrink-0" style={{ borderRadius: 'var(--radius-card)' }}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{displayName}</p>
                            </div>
                            <ChevronDown size={12} className="text-[var(--text-muted)] shrink-0" />
                        </>
                    )}
                </button>

                <AnimatePresence>
                    {showUserMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            className="absolute left-3 right-3 top-full mt-1 glass-thick z-50 shadow-sm overflow-hidden py-1"
                            style={{ borderRadius: 'var(--radius-card)' }}
                        >
                            <div className="px-3 py-2 border-b border-[var(--border-default)] mb-1">
                                <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                            </div>
                            <button onClick={() => { setShowUserMenu(false); navigate('/settings') }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition">
                                <Settings size={14} /> Settings
                            </button>
                            <button onClick={async () => { try { await signOut() } catch (e) { /* noop */ } }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition mt-1 border-t border-[var(--border-default)] pt-1.5">
                                <LogOut size={14} /> Log out
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className={cn("flex-1 space-y-5 py-2 overflow-y-auto overflow-x-hidden", collapsed ? "px-2" : "px-2")}>

                {/* Main Links */}
                <div className="space-y-0.5">
                    <button
                        onClick={() => { setActiveWorkspace(null as any); navigate('/dashboard') }}
                        title={collapsed ? 'Home' : undefined}
                        style={{ borderRadius: 'var(--radius-card)' }}
                        className={cn(
                            'w-full flex items-center text-[13px] font-medium transition-all text-left outline-none',
                            collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
                            isDashboard && !activeWorkspaceId ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        )}
                    >
                        <LayoutGrid size={14} className={cn(isDashboard && !activeWorkspaceId ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")} />
                        {!collapsed && <span className="flex-1">Home</span>}
                    </button>
                    <NavItem icon={<Kanban size={14} />} label="Planner" path="/planner" active={location.pathname === '/planner'} />
                    <NavItem icon={<Folders size={14} />} label="Workspaces" path="/workspaces" active={location.pathname === '/workspaces'} />
                    <NavItem icon={<BarChart3 size={14} />} label="Reports" path="/reports" active={location.pathname === '/reports'} />
                    <NavItem icon={<Smartphone size={14} />} label="Screen Time" path="/screen-time" active={location.pathname === '/screen-time'} />
                    <NavItem icon={<Map size={14} />} label="Canvas" path="/canvas" active={location.pathname === '/canvas'} />
                </div>

                {/* Workspaces Section */}
                <div className="space-y-1">
                    {collapsed ? (
                        <div className="mx-3 mb-1 border-t border-[var(--border-default)]" />
                    ) : (
                        <div className="flex items-center justify-between px-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 pt-2 group">
                            <span>Workspaces</span>
                            <button onClick={() => setShowCreateWs(v => !v)} className="opacity-0 group-hover:opacity-100 hover:text-[var(--text-primary)] transition-all">
                                <Plus size={13} />
                            </button>
                        </div>
                    )}

                    <div className="space-y-0.5">
                        {!collapsed && (
                            <AnimatePresence>
                                {showCreateWs && <CreateWsInline onDone={() => setShowCreateWs(false)} />}
                            </AnimatePresence>
                        )}

                        {workspaces.map(ws => (
                            <WorkspaceRow
                                key={ws.id}
                                ws={ws}
                                collapsed={collapsed}
                                isActive={isDashboard && activeWorkspaceId === ws.id}
                                onClick={() => { setActiveWorkspace(ws.id); navigate('/dashboard') }}
                            />
                        ))}

                        {workspaces.length === 0 && !showCreateWs && !collapsed && (
                            <div className="px-3 py-2 text-xs text-[var(--text-muted)] italic">No workspaces yet.</div>
                        )}
                    </div>
                </div>

                {/* System Section */}
                <div className="space-y-0.5 pt-2">
                    <button
                        onClick={() => { setActiveWorkspace('unassigned'); navigate('/dashboard') }}
                        title={collapsed ? 'Unassigned' : undefined}
                        style={{ borderRadius: 'var(--radius-card)' }}
                        className={cn(
                            'w-full flex items-center text-[13px] transition-all text-left outline-none',
                            collapsed ? 'justify-center px-0 py-2' : 'gap-2 px-2 py-1.5',
                            isDashboard && activeWorkspaceId === 'unassigned' ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        )}
                    >
                        <FolderKanban size={13} className="text-[var(--text-muted)]" />
                        {!collapsed && <span className="flex-1 truncate">Unassigned</span>}
                    </button>
                    <button
                        onClick={() => { setActiveWorkspace('archived'); navigate('/dashboard') }}
                        title={collapsed ? 'Archived' : undefined}
                        style={{ borderRadius: 'var(--radius-card)' }}
                        className={cn(
                            'w-full flex items-center text-[13px] transition-all text-left outline-none',
                            collapsed ? 'justify-center px-0 py-2' : 'gap-2 px-2 py-1.5',
                            isDashboard && activeWorkspaceId === 'archived' ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        )}
                    >
                        <Archive size={13} className="text-[var(--text-muted)]" />
                        {!collapsed && <span className="flex-1 truncate">Archived</span>}
                    </button>
                </div>

            </div>

            {/* Bottom: Settings shortcut */}
            <div className="px-2 pb-3 pt-2 border-t border-[var(--border-default)]">
                <button
                    onClick={() => navigate('/settings')}
                    title={collapsed ? 'Settings' : undefined}
                    style={{ borderRadius: 'var(--radius-card)' }}
                    className={cn(
                        'w-full flex items-center text-[13px] font-medium transition-all text-left outline-none',
                        collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
                        location.pathname === '/settings'
                            ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    )}
                >
                    <Settings size={14} className={cn(location.pathname === '/settings' ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")} />
                    {!collapsed && <span className="flex-1">Settings</span>}
                </button>
            </div>

        </aside>
    )
}
