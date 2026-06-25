import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, MoreHorizontal, ArrowUpRight, ListTodo, CheckCircle2, Sparkles, X, UserPlus, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore, Workspace } from '@/store/workspaceStore'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'
import { confirm } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/authStore'

const PALETTE = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    '#f97316', '#a3e635',
]

/* ─────────────────────────────────────────
   COLOR PICKER (shared by create + edit)
───────────────────────────────────────── */
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2.5">
            {PALETTE.map(c => (
                <button key={c} onClick={() => onChange(c)}
                    className="w-7 h-7 rounded-full relative transition-transform hover:scale-110 active:scale-95"
                    style={{
                        backgroundColor: c,
                        boxShadow: value === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px var(--accent-primary)` : `0 0 0 1px var(--border-default)`,
                    }}>
                    {value === c && <Check size={13} strokeWidth={3} className="text-[var(--accent-contrast)] absolute inset-0 m-auto drop-shadow" />}
                </button>
            ))}
        </div>
    )
}

/* ─────────────────────────────────────────
   WORKSPACE CARD
───────────────────────────────────────── */
function WorkspaceBentoCard({ ws }: { ws: Workspace }) {
    const navigate = useNavigate()
    const { lists } = useListStore()
    const { tasks } = useTaskStore()
    const { updateWorkspace, deleteWorkspace, setActiveWorkspace, workspaces, inviteToWorkspace, loadWorkspaceMembers, membersByWorkspace } = useWorkspaceStore()
    const user = useAuthStore(s => s.user)

    const [isEditing, setIsEditing] = useState(false)
    const [isSharing, setIsSharing] = useState(false)
    const [editName, setEditName] = useState(ws.name)
    const [editColor, setEditColor] = useState(ws.color)
    const [showMenu, setShowMenu] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteLoading, setInviteLoading] = useState(false)

    const members = membersByWorkspace[ws.id] || []
    const isOwner = user?.id === ws.user_id

    useEffect(() => {
        if (isSharing) {
            loadWorkspaceMembers(ws.id)
        }
    }, [isSharing, loadWorkspaceMembers, ws.id])

    // Calculate stats
    const wsLists = Object.values(lists).filter(l => l.workspace_id === ws.id && !l.deleted_at)
    const listIds = new Set(wsLists.map(l => l.id))
    const wsTasks = tasks.filter((t: any) => !t.deleted_at && t.list_id && listIds.has(t.list_id))
    const pendingTasks = wsTasks.filter((t: any) => t.status !== 'done')
    const doneTasks = wsTasks.filter((t: any) => t.status === 'done')
    const progress = wsTasks.length ? Math.round((doneTasks.length / wsTasks.length) * 100) : 0
    const isComplete = progress === 100 && wsTasks.length > 0

    const accent = ws.color
    const barColor = isComplete ? 'var(--success)' : accent

    const handleSave = async () => {
        if (!editName.trim()) return
        await updateWorkspace(ws.id, { name: editName.trim(), color: editColor })
        setIsEditing(false)
    }

    const handleDelete = async () => {
        if (workspaces.length <= 1) return
        if (await confirm({ message: `Delete workspace "${ws.name}"? Lists inside won't be deleted.`, variant: 'danger', confirmLabel: 'Delete' })) {
            await deleteWorkspace(ws.id)
        }
    }

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return
        setInviteLoading(true)
        const ok = await inviteToWorkspace(ws.id, inviteEmail)
        setInviteLoading(false)
        if (ok) setInviteEmail('')
    }

    const handleCardClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.closest('.no-drag')) return
        setActiveWorkspace(ws.id)
        navigate('/dashboard')
    }

    if (isEditing) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--bg-card)] rounded-[var(--radius-card)] border border-[var(--border-default)] p-6 flex flex-col justify-between shadow-sm"
            >
                <div className="space-y-5">
                    <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] mb-2 block">Name</label>
                        <input
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false) }}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-colors"
                            maxLength={50}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] mb-2.5 block">Theme Color</label>
                        <ColorPicker value={editColor} onChange={setEditColor} />
                    </div>
                </div>
                <div className="flex gap-2 mt-6">
                    <button onClick={handleSave} className="flex-1 py-2.5 text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-full hover:brightness-105 active:scale-95 transition-all shadow-sm">Save Changes</button>
                    <button onClick={() => setIsEditing(false)} className="py-2.5 px-4 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] hover:text-[var(--text-primary)] transition-all rounded-full">Cancel</button>
                </div>
            </motion.div>
        )
    }

    if (isSharing) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--bg-card)] rounded-[var(--radius-card)] border border-[var(--border-default)] p-6 flex flex-col justify-between shadow-sm"
            >
                <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] mb-1">Share Workspace</p>
                            <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">{ws.name}</h3>
                        </div>
                        <button onClick={() => setIsSharing(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={14} /></button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] block">Teammate Email</label>
                        <div className="relative">
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleInvite(); if (e.key === 'Escape') setIsSharing(false) }}
                                placeholder="teammate@example.com"
                                type="email"
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em]">People With Access</p>
                        {members.length === 0 ? (
                            <p className="text-xs text-[var(--text-tertiary)] py-2">No teammates invited yet.</p>
                        ) : (
                            <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                {members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--bg-hover)] px-3 py-2">
                                        <span className="text-xs text-[var(--text-secondary)] truncate">{member.email}</span>
                                        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">{member.role}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <button disabled={!inviteEmail.trim() || inviteLoading} onClick={handleInvite} className="flex-1 py-2.5 text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-full hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all shadow-sm">
                        {inviteLoading ? 'Granting…' : 'Grant Access'}
                    </button>
                    <button onClick={() => setIsSharing(false)} className="py-2.5 px-4 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] hover:text-[var(--text-primary)] transition-all rounded-full">Done</button>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="group relative h-full overflow-hidden bg-[var(--bg-card)] rounded-[var(--radius-card)] border border-[var(--border-default)] hover:border-[var(--border-hover)] shadow-sm transition-[border-color,box-shadow] duration-200 cursor-pointer flex flex-col p-6"
            onClick={handleCardClick}
        >
            {/* Header Area */}
            <div className="relative flex-1">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                        <span
                            className="relative w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-base"
                        >
                            {ws.name.charAt(0).toUpperCase()}
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                        </span>
                        <div className="min-w-0">
                            <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] truncate leading-tight">{ws.name}</h3>
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                                {wsLists.length} {wsLists.length === 1 ? 'list' : 'lists'} · {wsTasks.length} {wsTasks.length === 1 ? 'task' : 'tasks'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {isOwner && (
                        <div className="relative no-drag">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                                className="w-7 h-7 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <MoreHorizontal size={16} />
                            </button>

                            <AnimatePresence>
                                {showMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false) }} />
                                        <motion.div
                                            initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                            className="absolute right-0 top-full mt-2 w-44 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl z-50 shadow-sm py-1 overflow-hidden pointer-events-auto"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <button onClick={() => { setIsEditing(true); setShowMenu(false) }} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                                                Edit Workspace
                                            </button>
                                            <button onClick={() => { setIsSharing(true); setShowMenu(false) }} className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                                                <UserPlus size={14} />
                                                Invite Teammate
                                            </button>
                                            <button onClick={() => { handleDelete(); setShowMenu(false) }} className="w-full text-left px-4 py-2 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors">
                                                Delete Workspace
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        )}
                        <span className="w-7 h-7 rounded-full bg-[var(--bg-hover)] group-hover:bg-[var(--accent-primary)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent-contrast)] transition-colors">
                            <ArrowUpRight size={14} />
                        </span>
                    </div>
                </div>

                {/* List preview chips */}
                {wsLists.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {wsLists.slice(0, 4).map(l => (
                            <span
                                key={l.id}
                                className="inline-flex items-center gap-1.5 max-w-[140px] rounded-full bg-[var(--bg-hover)] pl-2 pr-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
                            >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: (l as any).color || accent }} />
                                <span className="truncate">{l.name}</span>
                            </span>
                        ))}
                        {wsLists.length > 4 && (
                            <span className="inline-flex items-center rounded-full bg-[var(--bg-hover)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] tabular-nums">
                                +{wsLists.length - 4}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Stats + Progress Footer */}
            <div className="relative mt-6">
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 rounded-full bg-[var(--bg-hover)] px-2.5 py-1">
                        <ListTodo size={12} className="text-[var(--text-muted)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{pendingTasks.length}</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">pending</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-[var(--bg-hover)] px-2.5 py-1">
                        <CheckCircle2 size={12} className="text-[var(--text-muted)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{doneTasks.length}</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">done</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                        {isComplete ? 'All caught up' : `${progress}% completed`}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--text-muted)] tabular-nums">{doneTasks.length} / {wsTasks.length}</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-hover)] w-full rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </div>

                {isOwner && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsSharing(true)
                        }}
                        className="no-drag mt-4 w-full flex items-center justify-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-hover)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <UserPlus size={14} />
                        Invite teammate
                    </button>
                )}
            </div>
        </motion.div>
    )
}

/* ─────────────────────────────────────────
   CREATE WORKSPACE CARD
───────────────────────────────────────── */
function CreateWorkspaceCard({ autoOpen, onClose }: { autoOpen?: boolean; onClose?: () => void }) {
    const { createWorkspace } = useWorkspaceStore()
    const [isCreating, setIsCreating] = useState(!!autoOpen)
    const [name, setName] = useState('')
    const [color, setColor] = useState(PALETTE[0])
    const [loading, setLoading] = useState(false)

    const close = () => { setIsCreating(false); onClose?.() }

    const handleCreate = async () => {
        if (!name.trim()) return
        setLoading(true)
        await createWorkspace({ name: name.trim(), color })
        setLoading(false)
        close()
        setName('')
    }

    if (isCreating) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--bg-card)] rounded-[var(--radius-card)] border border-[var(--border-default)] p-6 flex flex-col justify-between shadow-sm"
            >
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] block">New Workspace</label>
                        <button onClick={close} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={14} /></button>
                    </div>
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') close() }}
                        placeholder="Engineering, Personal, etc."
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none transition-colors"
                        maxLength={50}
                    />
                    <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] mb-2.5 block">Theme Color</label>
                        <ColorPicker value={color} onChange={setColor} />
                    </div>
                </div>
                <div className="flex gap-2 mt-6">
                    <button disabled={!name.trim() || loading} onClick={handleCreate} className="flex-1 py-2.5 text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-full hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all shadow-sm">
                        {loading ? 'Creating…' : 'Create Workspace'}
                    </button>
                    <button onClick={close} className="py-2.5 px-4 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] hover:text-[var(--text-primary)] transition-all rounded-full">Cancel</button>
                </div>
            </motion.div>
        )
    }

    return (
        <button
            onClick={() => setIsCreating(true)}
            className="group h-full min-h-[200px] bg-[var(--bg-secondary)] rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] flex flex-col items-center justify-center gap-3 transition-all duration-200 cursor-pointer"
        >
            <span className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] group-hover:bg-[var(--accent-primary)] group-hover:border-[var(--accent-primary)] flex items-center justify-center transition-all">
                <Plus size={22} className="text-[var(--text-muted)] group-hover:text-[var(--accent-contrast)] transition-colors" />
            </span>
            <span className="font-semibold text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Create Workspace</span>
        </button>
    )
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export function WorkspacesOverview() {
    const { workspaces } = useWorkspaceStore()
    const { lists } = useListStore()
    const { tasks } = useTaskStore()
    const [creating, setCreating] = useState(false)

    const totalLists = Object.values(lists).filter((l: any) => !l.deleted_at).length
    const activeTasks = tasks.filter((t: any) => !t.deleted_at && t.status !== 'done').length

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar pb-24 bg-[var(--bg-primary)]">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10">
                {/* Hero header */}
                <header className="mb-9 flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-[var(--accent-primary)]">
                            <Sparkles size={13} />
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em]">Overview</p>
                        </div>
                        <h1 className="text-[38px] leading-[1.05] font-semibold tracking-tight text-[var(--text-primary)]">
                            Your <span className="text-[var(--accent-primary)]">workspaces</span>
                        </h1>
                        <p className="text-sm text-[var(--text-tertiary)] mt-2.5 tabular-nums">
                            {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
                            <span className="mx-2 text-[var(--border-default)]">·</span>
                            {totalLists} {totalLists === 1 ? 'list' : 'lists'}
                            <span className="mx-2 text-[var(--border-default)]">·</span>
                            {activeTasks} active {activeTasks === 1 ? 'task' : 'tasks'}
                        </p>
                    </div>

                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-full hover:brightness-105 active:scale-95 transition-all shadow-sm"
                    >
                        <Plus size={16} /> New Workspace
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-[minmax(220px,auto)] items-stretch">
                    {workspaces.map(ws => (
                        <WorkspaceBentoCard key={ws.id} ws={ws} />
                    ))}
                    <CreateWorkspaceCard autoOpen={creating} onClose={() => setCreating(false)} />
                </div>
            </div>
        </div>
    )
}
