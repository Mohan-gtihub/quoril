import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Settings, LogOut, BarChart3, Plus, Edit2, Trash2, Check, MoreHorizontal, FolderKanban, Archive, ChevronDown, Folders, Kanban } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
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
function WorkspaceRow({ ws, isActive, onClick }: { ws: Workspace; isActive: boolean; onClick: () => void }) {
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
        if (!confirm(`Delete workspace "${ws.name}"? Lists inside won't be deleted.`)) return
        await deleteWorkspace(ws.id)
        setShowMenu(false)
    }

    if (isEditing) {
        return (
            <div className="px-3 py-2 -mx-1 my-0.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-hover)] shadow-sm space-y-2 relative z-10 w-full max-w-[calc(100%+8px)]">
                <input
                    ref={inputRef}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false) }}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-md px-2 py-1.5 text-[13px] font-medium text-[var(--text-primary)] outline-none"
                    maxLength={50}
                />
                <div className="flex flex-wrap gap-1 px-0.5">
                    {PALETTE.map(c => (
                        <button key={c} onClick={() => setEditColor(c)}
                            className="w-3.5 h-3.5 rounded-full hover:scale-110 transition-transform relative"
                            style={{ backgroundColor: c }}>
                            {editColor === c && <Check size={8} className="text-white absolute inset-0 m-auto" />}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                    <button onClick={handleSave} className="flex-1 py-1 px-2 text-[10px] font-bold bg-[var(--accent-primary)] text-white rounded-md">Save</button>
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-1 px-2 text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border-default)] hover:text-[var(--text-primary)] transition-colors rounded-md">Cancel</button>
                </div>
            </div>
        )
    }

    return (
        <div ref={ref} className="relative group">
            <button
                onClick={onClick}
                className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] transition-all text-left outline-none',
                    isActive ? 'bg-[var(--accent-primary)]/10 text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                )}
            >
                <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: ws.color }} />
                <span className="flex-1 truncate">{ws.name}</span>

                <div
                    onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
                    className={cn("p-0.5 rounded-md hover:bg-[var(--text-muted)] hover:text-white transition-colors shrink-0", showMenu ? "opacity-100 bg-[var(--text-muted)]/20" : "opacity-0 group-hover:opacity-100")}
                >
                    <MoreHorizontal size={14} />
                </div>
            </button>

            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        className="absolute right-0 top-full mt-1 w-36 glass-thick rounded-xl z-50 shadow-xl overflow-hidden py-1"
                    >
                        <button onClick={() => { setIsEditing(true); setShowMenu(false) }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition">
                            <Edit2 size={12} /> Rename
                        </button>
                        {workspaces.length > 1 && (
                            <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition">
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
            <div className="px-3 py-2 -mx-1 my-0.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-hover)] shadow-sm space-y-2 mt-1">
                <input
                    ref={inputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handle(); if (e.key === 'Escape') onDone() }}
                    placeholder="Workspace name…"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-md px-2 py-1.5 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
                <div className="flex flex-wrap gap-1 px-0.5">
                    {PALETTE.map(c => (
                        <button key={c} onClick={() => setColor(c)}
                            className="w-3.5 h-3.5 rounded-full hover:scale-110 transition-transform relative"
                            style={{ backgroundColor: c }}>
                            {color === c && <Check size={8} className="text-white absolute inset-0 m-auto" />}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                    <button disabled={!name.trim() || loading} onClick={handle}
                        className="flex-1 py-1 px-2 text-[10px] font-bold bg-[var(--accent-primary)] disabled:opacity-40 text-white rounded-md">
                        {loading ? '…' : 'Create'}
                    </button>
                    <button onClick={onDone} className="flex-1 py-1 px-2 text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border-default)] hover:text-[var(--text-primary)] transition-colors rounded-md">Cancel</button>
                </div>
            </div>
        </motion.div>
    )
}

/* ── Main Sidebar ── */
export function Sidebar() {
    const { fetchLists } = useListStore()
    const { signOut, user } = useAuthStore()
    const { workspaces, activeWorkspaceId, setActiveWorkspace, loadWorkspaces } = useWorkspaceStore()
    const navigate = useNavigate()
    const location = useLocation()
    const [showCreateWs, setShowCreateWs] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const userMenuRef = useRef<HTMLDivElement>(null)

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
            className={cn(
                'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-all text-left outline-none',
                active ? 'bg-[var(--accent-primary)]/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
        >
            <span className={cn("flex items-center justify-center scale-90", active ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")}>{icon}</span>
            <span className="flex-1 truncate">{label}</span>
        </button>
    )

    return (
        <aside className="w-[220px] bg-[var(--bg-secondary)] border-r border-[var(--border-default)] flex flex-col h-full shrink-0 hidden lg:flex transition-colors duration-500 relative z-40">

            {/* Top User Profile / Dropdown */}
            <div ref={userMenuRef} className="relative px-2 pt-4 pb-2">
                <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-left outline-none"
                >
                    <div className="w-5 h-5 rounded-md bg-[var(--accent-primary)] flex items-center justify-center text-white text-[10px] font-black shrink-0">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[var(--text-primary)] truncate">{user?.email?.split('@')[0]}</p>
                    </div>
                    <ChevronDown size={12} className="text-[var(--text-muted)] shrink-0" />
                </button>

                <AnimatePresence>
                    {showUserMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            className="absolute left-3 right-3 top-full mt-1 glass-thick rounded-xl z-50 shadow-2xl overflow-hidden py-1"
                        >
                            <div className="px-3 py-2 border-b border-[var(--border-default)] mb-1">
                                <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                            </div>
                            <button onClick={() => { setShowUserMenu(false); navigate('/settings') }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition">
                                <Settings size={14} /> Settings
                            </button>
                            <button onClick={async () => { try { await signOut() } catch (e) { } }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition mt-1 border-t border-[var(--border-default)] pt-1.5">
                                <LogOut size={14} /> Log out
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex-1 px-2 space-y-5 py-2 overflow-y-auto">

                {/* Main Links */}
                <div className="space-y-0.5">
                    <button
                        onClick={() => { setActiveWorkspace(null as any); navigate('/dashboard') }}
                        className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-all text-left outline-none',
                            isDashboard && !activeWorkspaceId ? 'bg-[var(--accent-primary)]/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        )}
                    >
                        <LayoutGrid size={14} className={cn(isDashboard && !activeWorkspaceId ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")} />
                        <span className="flex-1">Home</span>
                    </button>
                    <NavItem icon={<Kanban size={14} />} label="Planner" path="/planner" active={location.pathname === '/planner'} />
                    <NavItem icon={<Folders size={14} />} label="Workspaces" path="/workspaces" active={location.pathname === '/workspaces'} />
                    <NavItem icon={<BarChart3 size={14} />} label="Reports" path="/reports" active={location.pathname === '/reports'} />
                </div>

                {/* Workspaces Section */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between px-3 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 pt-2 group">
                        <span>Workspaces</span>
                        <button onClick={() => setShowCreateWs(v => !v)} className="opacity-0 group-hover:opacity-100 hover:text-[var(--text-primary)] transition-all">
                            <Plus size={13} />
                        </button>
                    </div>

                    <div className="space-y-0.5">
                        <AnimatePresence>
                            {showCreateWs && <CreateWsInline onDone={() => setShowCreateWs(false)} />}
                        </AnimatePresence>

                        {workspaces.map(ws => (
                            <WorkspaceRow
                                key={ws.id}
                                ws={ws}
                                isActive={isDashboard && activeWorkspaceId === ws.id}
                                onClick={() => { setActiveWorkspace(ws.id); navigate('/dashboard') }}
                            />
                        ))}

                        {workspaces.length === 0 && !showCreateWs && (
                            <div className="px-3 py-2 text-xs text-[var(--text-muted)] italic">No workspaces yet.</div>
                        )}
                    </div>
                </div>

                {/* System Section */}
                <div className="space-y-0.5 pt-2">
                    <button
                        onClick={() => { setActiveWorkspace('unassigned'); navigate('/dashboard') }}
                        className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-all text-left outline-none',
                            isDashboard && activeWorkspaceId === 'unassigned' ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        )}
                    >
                        <FolderKanban size={13} className="text-[var(--text-muted)]" />
                        <span className="flex-1 truncate">Unassigned</span>
                    </button>
                    <button
                        onClick={() => { setActiveWorkspace('archived'); navigate('/dashboard') }}
                        className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-all text-left outline-none',
                            isDashboard && activeWorkspaceId === 'archived' ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        )}
                    >
                        <Archive size={13} className="text-[var(--text-muted)]" />
                        <span className="flex-1 truncate">Archived</span>
                    </button>
                </div>

            </div>

            {/* Bottom: Settings shortcut */}
            <div className="px-2 pb-3 pt-2 border-t border-[var(--border-default)]">
                <button
                    onClick={() => navigate('/settings')}
                    className={cn(
                        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-all text-left outline-none',
                        location.pathname === '/settings'
                            ? 'bg-[var(--accent-primary)]/10 text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    )}
                >
                    <Settings size={14} className={cn(location.pathname === '/settings' ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")} />
                    <span className="flex-1">Settings</span>
                </button>
            </div>

        </aside>
    )
}
