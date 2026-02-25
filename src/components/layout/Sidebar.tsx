import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Settings, LogOut, BarChart3, Activity, Archive, Plus, Edit2, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useListStore } from '@/store/listStore'
import { useWorkspaceStore, Workspace } from '@/store/workspaceStore'
import { cn } from '@/utils/helpers'
import { useTaskStore } from '@/store/taskStore'
import { subDays, format, startOfToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { useState, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const PALETTE = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    '#f97316', '#a3e635',
]

/* ── Activity chart ── */
function GithubContributionChart({ tasks }: { tasks: any[] }) {
    const [viewDate, setViewDate] = useState(startOfToday())
    const weeks = 12
    const dates = useMemo(() =>
        Array.from({ length: weeks * 7 }).map((_, i) => subDays(viewDate, weeks * 7 - 1 - i))
        , [viewDate])

    const getGlowStyle = (n: number) => {
        if (n === 0) return { backgroundColor: '#161b22' }
        if (n <= 2) return { backgroundColor: '#0e4429', opacity: 0.8 }
        if (n <= 4) return { backgroundColor: '#006d32', boxShadow: '0 0 12px rgba(0,109,50,0.4)' }
        if (n <= 6) return { backgroundColor: '#26a641', boxShadow: '0 0 16px rgba(38,166,65,0.7)' }
        return { backgroundColor: '#39d353', boxShadow: '0 0 25px rgba(57,211,83,1)' }
    }

    const completedDates = tasks
        .filter(t => t.status === 'done' && t.completed_at)
        .map(t => new Date(t.completed_at))

    return (
        <div className="space-y-3 px-1">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Focus Activity</h3>
                <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-[var(--text-tertiary)] tabular-nums">{format(viewDate, 'MMM yyyy')}</span>
                    <div className="flex bg-[var(--bg-hover)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1 px-1.5 hover:bg-[var(--bg-tertiary)] transition-colors"><ChevronLeft size={10} /></button>
                        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 px-1.5 border-l border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] transition-colors"><ChevronRight size={10} /></button>
                    </div>
                </div>
            </div>
            <div className="glass-regular p-3 rounded-2xl shadow-inner">
                <div className="grid grid-cols-12 gap-1.5">
                    {dates.map((date, i) => {
                        const count = completedDates.filter(d => isSameDay(d, date)).length
                        return <div key={i} className="w-3.5 h-3.5 rounded-[3px] transition-all duration-500 cursor-crosshair hover:scale-125" style={getGlowStyle(count)} title={`${format(date, 'MMM d, yyyy')}: ${count} tasks done`} />
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

/* ── Workspace row ── */
function WorkspaceItem({
    ws, isActive, isDropTarget,
    onNavigate, onDragOver, onDragLeave, onDrop
}: {
    ws: Workspace; isActive: boolean; isDropTarget: boolean
    onNavigate: () => void
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent) => void
}) {
    const { updateWorkspace, deleteWorkspace, workspaces } = useWorkspaceStore()
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(ws.name)
    const [editColor, setEditColor] = useState(ws.color)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing) setTimeout(() => inputRef.current?.focus(), 60)
    }, [isEditing])

    const handleSave = async () => {
        if (!editName.trim()) return
        await updateWorkspace(ws.id, { name: editName.trim(), color: editColor })
        setIsEditing(false)
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (workspaces.length <= 1) return
        if (!confirm(`Delete workspace "${ws.name}"? Lists inside won't be deleted.`)) return
        await deleteWorkspace(ws.id)
    }

    if (isEditing) {
        return (
            <div className="px-2 py-2 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-default)] space-y-2">
                <input
                    ref={inputRef}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false) }}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                    maxLength={50}
                />
                <div className="flex flex-wrap gap-1.5 px-0.5">
                    {PALETTE.map(c => (
                        <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className="w-4 h-4 rounded-full transition-transform hover:scale-110 shrink-0"
                            style={{ backgroundColor: c, outline: editColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                        />
                    ))}
                </div>
                <div className="flex gap-1.5">
                    <button onClick={handleSave} className="flex-1 py-1 text-[10px] font-bold bg-[var(--accent-primary)] text-white rounded-lg">Save</button>
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg border border-[var(--border-default)]">Cancel</button>
                </div>
            </div>
        )
    }

    return (
        <div
            className={cn(
                "group relative flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-xl transition cursor-pointer",
                isActive
                    ? "bg-[var(--accent-primary)]/10 text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                isDropTarget && "ring-2 ring-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/10"
            )}
            onClick={onNavigate}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: ws.color }} />
            <span className="truncate flex-1 text-sm">{ws.name}</span>

            {/* Inline action buttons — appear on hover */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                <button
                    onClick={e => { e.stopPropagation(); setIsEditing(true) }}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    title="Rename"
                >
                    <Edit2 size={11} />
                </button>
                {workspaces.length > 1 && (
                    <button
                        onClick={handleDelete}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={11} />
                    </button>
                )}
            </div>
        </div>
    )
}

/* ── Create workspace inline form ── */
function CreateWorkspaceForm({ onDone }: { onDone: () => void }) {
    const { createWorkspace } = useWorkspaceStore()
    const [name, setName] = useState('')
    const [color, setColor] = useState(PALETTE[0])
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60) }, [])

    const handleCreate = async () => {
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
            <div className="px-2 py-2 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-default)] space-y-2">
                <input
                    ref={inputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onDone() }}
                    placeholder="Workspace name…"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                    maxLength={50}
                />
                <div className="flex flex-wrap gap-1.5 px-0.5">
                    {PALETTE.map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className="w-4 h-4 rounded-full transition-transform hover:scale-110 shrink-0"
                            style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                        />
                    ))}
                </div>
                <div className="flex gap-1.5">
                    <button
                        disabled={!name.trim() || loading}
                        onClick={handleCreate}
                        className="flex-1 py-1 text-[10px] font-bold bg-[var(--accent-primary)] disabled:opacity-50 text-white rounded-lg"
                    >
                        {loading ? '…' : 'Create'}
                    </button>
                    <button onClick={onDone} className="flex-1 py-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg">Cancel</button>
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
    const { moveListToWorkspace } = useListStore()
    const navigate = useNavigate()
    const location = useLocation()

    const [dropTargetWsId, setDropTargetWsId] = useState<string | null>(null)
    const [showCreateWs, setShowCreateWs] = useState(false)

    useEffect(() => { fetchLists(); if (user) loadWorkspaces() }, [user])

    const isDashboard = location.pathname === '/dashboard'

    const handleSignOut = async () => {
        try { await signOut() } catch (e) { console.error(e) }
    }

    const handleRecover = async () => {
        if (!confirm('Recover lost data? This will merge orphaned lists back.')) return
        try {
            if (user?.id && (window as any).electronAPI?.db?.recoverOrphans) {
                await (window as any).electronAPI.db.recoverOrphans(user.id)
                alert('Recovery complete. Please restart the app.')
                window.location.reload()
            }
        } catch (e) { console.error(e) }
    }

    return (
        <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-default)] flex flex-col p-5 space-y-6 shrink-0 hidden lg:flex backdrop-blur-2xl transition-colors duration-500 overflow-y-auto">

            {/* Logo */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-[var(--accent-primary)]/10 rounded-lg flex items-center justify-center border border-[var(--accent-primary)]/20">
                        <LayoutGrid className="w-4 h-4 text-[var(--accent-primary)]" />
                    </div>
                    <h1 className="text-base font-bold text-[var(--text-primary)]">
                        Quoril <span className="text-[9px] text-[var(--accent-primary)] font-normal px-1 border border-[var(--accent-primary)]/30 rounded uppercase ml-1">BETA</span>
                    </h1>
                </div>
                <button onClick={() => navigate('/settings')} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Activity chart */}
            <GithubContributionChart tasks={useTaskStore().tasks} />

            <div className="flex-1 space-y-5">
                {/* Main nav */}
                <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-2">Main</p>
                    <NavBtn icon={<LayoutGrid size={14} />} label="Home" active={isDashboard && !['unassigned', 'archived'].includes(activeWorkspaceId || '') && !workspaces.find(w => w.id === activeWorkspaceId)} onClick={() => navigate('/dashboard')} />
                    <NavBtn icon={<BarChart3 size={14} />} label="Reports" active={location.pathname === '/reports'} onClick={() => navigate('/reports')} />
                    <NavBtn icon={<Activity size={14} />} label="Activity" active={location.pathname === '/activity'} onClick={() => navigate('/activity')} />
                </div>

                {/* Workspaces */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between px-3 mb-1">
                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Workspaces</p>
                        <button
                            onClick={() => setShowCreateWs(v => !v)}
                            className="p-0.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
                            title="New workspace"
                        >
                            <Plus size={12} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {showCreateWs && <CreateWorkspaceForm onDone={() => setShowCreateWs(false)} />}
                    </AnimatePresence>

                    {workspaces.map(ws => (
                        <WorkspaceItem
                            key={ws.id}
                            ws={ws}
                            isActive={isDashboard && activeWorkspaceId === ws.id}
                            isDropTarget={dropTargetWsId === ws.id}
                            onNavigate={() => { setActiveWorkspace(ws.id); navigate('/dashboard') }}
                            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetWsId(ws.id) }}
                            onDragLeave={() => setDropTargetWsId(null)}
                            onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('application/blitzit-list-id'); if (id) moveListToWorkspace(id, ws.id); setDropTargetWsId(null) }}
                        />
                    ))}

                    {workspaces.length === 0 && !showCreateWs && (
                        <p className="px-3 py-2 text-xs text-[var(--text-muted)] italic">No workspaces yet.</p>
                    )}

                    {/* Unassigned */}
                    <button
                        onClick={() => { setActiveWorkspace('unassigned'); navigate('/dashboard') }}
                        onDragOver={e => { e.preventDefault(); setDropTargetWsId('unassigned') }}
                        onDragLeave={() => setDropTargetWsId(null)}
                        onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('application/blitzit-list-id'); if (id) moveListToWorkspace(id, null as any); setDropTargetWsId(null) }}
                        className={cn(
                            "w-full flex items-center gap-2.5 pl-3 pr-2 py-2 text-sm rounded-xl transition border border-dashed border-transparent mt-0.5",
                            isDashboard && activeWorkspaceId === 'unassigned'
                                ? "bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold border-[var(--border-default)]"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                            dropTargetWsId === 'unassigned' && "border-[var(--text-muted)] bg-[var(--bg-hover)]"
                        )}
                    >
                        <div className="w-2.5 h-2.5 rounded-[3px] bg-[var(--border-default)] shrink-0" />
                        <span className="flex-1 text-left italic truncate">Unassigned</span>
                    </button>

                    {/* Archived */}
                    <button
                        onClick={() => { setActiveWorkspace('archived'); navigate('/dashboard') }}
                        className={cn(
                            "w-full flex items-center gap-2.5 pl-3 pr-2 py-2 text-sm rounded-xl transition",
                            isDashboard && activeWorkspaceId === 'archived'
                                ? "bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        )}
                    >
                        <Archive className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                        <span className="flex-1 text-left italic truncate">Archived</span>
                    </button>

                    <button
                        onClick={handleRecover}
                        className="w-full flex items-center gap-2.5 pl-3 pr-2 py-1.5 text-xs text-yellow-500/60 hover:text-yellow-400 hover:bg-yellow-500/5 rounded-xl transition mt-1"
                        title="Recover orphaned lists"
                    >
                        <RefreshCw size={10} className="shrink-0" />
                        <span>Recover lost data</span>
                    </button>
                </div>

                {/* Bottom nav */}
                <div className="space-y-0.5 pt-2 border-t border-[var(--border-default)]">
                    <NavBtn icon={<Settings size={14} />} label="Settings" onClick={() => navigate('/settings')} />
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-[var(--error)] hover:bg-[var(--error)]/10 rounded-xl transition"
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </div>

            {/* User card */}
            <div className="pt-4 border-t border-[var(--border-default)]">
                <div className="flex items-center gap-2.5 bg-[var(--bg-hover)] p-2.5 rounded-xl border border-[var(--border-default)]">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}

function NavBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-xl transition",
                active
                    ? "bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            )}
        >
            <span className="text-[var(--accent-primary)]">{icon}</span>
            {label}
        </button>
    )
}
