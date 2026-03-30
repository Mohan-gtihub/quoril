import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, MoreHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore, Workspace } from '@/store/workspaceStore'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'
import { confirm } from '@/components/ui/ConfirmDialog'

const PALETTE = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    '#f97316', '#a3e635',
]

function WorkspaceBentoCard({ ws }: { ws: Workspace }) {
    const navigate = useNavigate()
    const { lists } = useListStore()
    const { tasks } = useTaskStore()
    const { updateWorkspace, deleteWorkspace, setActiveWorkspace, workspaces } = useWorkspaceStore()

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(ws.name)
    const [editColor, setEditColor] = useState(ws.color)
    const [showMenu, setShowMenu] = useState(false)

    // Calculate stats
    const wsLists = Object.values(lists).filter(l => l.workspace_id === ws.id && !l.deleted_at)
    const listIds = new Set(wsLists.map(l => l.id))
    const wsTasks = tasks.filter((t: any) => !t.deleted_at && t.list_id && listIds.has(t.list_id))
    const pendingTasks = wsTasks.filter((t: any) => t.status !== 'done')
    const doneTasks = wsTasks.filter((t: any) => t.status === 'done')
    const progress = wsTasks.length ? Math.round((doneTasks.length / wsTasks.length) * 100) : 0

    const accent = ws.color

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

    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent click if we're clicking an action button/menu
        const target = e.target as HTMLElement
        if (target.closest('.no-drag')) return

        setActiveWorkspace(ws.id)
        navigate('/dashboard')
    }

    if (isEditing) {
        return (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-hover)] p-5 flex flex-col justify-between shadow-xl">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Name</label>
                        <input
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false) }}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none"
                            maxLength={50}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Theme Color</label>
                        <div className="flex flex-wrap gap-2">
                            {PALETTE.map(c => (
                                <button key={c} onClick={() => setEditColor(c)}
                                    className="w-6 h-6 rounded-full hover:scale-110 transition-transform relative border border-white/10"
                                    style={{ backgroundColor: c }}>
                                    {editColor === c && <Check size={12} className="text-white absolute inset-0 m-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 mt-6">
                    <button onClick={handleSave} className="flex-1 py-2 text-xs font-bold bg-[var(--accent-primary)] text-white rounded-xl shadow-lg hover:brightness-110 transition-all">Save Changes</button>
                    <button onClick={() => setIsEditing(false)} className="py-2 px-4 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all rounded-xl">Cancel</button>
                </div>
            </div>
        )
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative h-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:shadow-2xl hover:-translate-y-1 overflow-hidden transition-all duration-300 cursor-pointer flex flex-col"
            onClick={handleCardClick}
        >
            {/* Header Area */}
            <div className="p-6 pb-4 relative z-10 flex-1">
                <div className="flex items-start justify-between mb-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg"
                        style={{
                            background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                            boxShadow: `0 8px 20px -4px ${accent}60`
                        }}
                    >
                        {ws.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="relative no-drag">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <MoreHorizontal size={18} />
                        </button>

                        <AnimatePresence>
                            {showMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-40 glass-thick border border-[var(--border-default)] rounded-xl z-50 shadow-2xl py-1 overflow-hidden pointer-events-auto"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <button onClick={() => { setIsEditing(true); setShowMenu(false) }} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                                        Edit Workspace
                                    </button>
                                    <button onClick={() => { handleDelete(); setShowMenu(false) }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors">
                                        Delete Workspace
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1 truncate">{ws.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{wsLists.length} lists · {pendingTasks.length} pending tasks</p>
            </div>

            {/* Progress Footer */}
            <div className="p-6 pt-0 mt-auto">
                <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)] mb-2">
                    <span>{progress}% Completed</span>
                    <span>{doneTasks.length} / {wsTasks.length}</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-tertiary)] w-full rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                        style={{ backgroundColor: progress === 100 ? '#10b981' : accent }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Ambient background glow */}
            <div
                className="absolute inset-x-0 -bottom-32 h-64 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none blur-3xl rounded-full"
                style={{ backgroundColor: accent }}
            />
        </motion.div>
    )
}

function CreateWorkspaceCard() {
    const { createWorkspace } = useWorkspaceStore()
    const [isCreating, setIsCreating] = useState(false)
    const [name, setName] = useState('')
    const [color, setColor] = useState(PALETTE[0])
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!name.trim()) return
        setLoading(true)
        await createWorkspace({ name: name.trim(), color })
        setLoading(false)
        setIsCreating(false)
        setName('')
    }

    if (isCreating) {
        return (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--accent-primary)] p-5 flex flex-col justify-between shadow-[0_0_30px_var(--accent-glow)] ring-1 ring-[var(--accent-primary)]/50">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">New Workspace</label>
                        <input
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(false) }}
                            placeholder="Engineering, Personal, etc."
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none"
                            maxLength={50}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Theme Color</label>
                        <div className="flex flex-wrap gap-2">
                            {PALETTE.map(c => (
                                <button key={c} onClick={() => setColor(c)}
                                    className="w-6 h-6 rounded-full hover:scale-110 transition-transform relative border border-white/10"
                                    style={{ backgroundColor: c }}>
                                    {color === c && <Check size={12} className="text-white absolute inset-0 m-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 mt-6">
                    <button disabled={!name.trim() || loading} onClick={handleCreate} className="flex-1 py-2 text-xs font-bold bg-[var(--accent-primary)] text-white rounded-xl shadow-lg hover:brightness-110 disabled:opacity-50 transition-all">
                        {loading ? 'Creating...' : 'Create Workspace'}
                    </button>
                    <button onClick={() => setIsCreating(false)} className="py-2 px-4 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] transition-all rounded-xl">Cancel</button>
                </div>
            </div>
        )
    }

    return (
        <button
            onClick={() => setIsCreating(true)}
            className="group h-full min-h-[220px] bg-[var(--bg-tertiary)] rounded-2xl border border-dashed border-[var(--border-hover)] hover:border-[var(--accent-primary)] flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:bg-[var(--accent-primary)]/5 cursor-pointer"
        >
            <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] group-hover:border-[var(--accent-primary)]/50 group-hover:bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-all group-hover:scale-110 group-hover:shadow-lg">
                <Plus size={24} />
            </div>
            <span className="font-bold text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors">Create Workspace</span>
        </button>
    )
}

export function WorkspacesOverview() {
    const { workspaces } = useWorkspaceStore()

    return (
        <div className="h-full overflow-y-auto w-full flex flex-col bg-[var(--bg-primary)] p-8">
            <div className="max-w-7xl mx-auto w-full">
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">Workspaces</h1>
                    <p className="text-[var(--text-secondary)] mt-2 text-lg">Manage your project environments and high-level goals.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[220px]">
                    <CreateWorkspaceCard />
                    {workspaces.map(ws => (
                        <WorkspaceBentoCard key={ws.id} ws={ws} />
                    ))}
                </div>
            </div>
        </div>
    )
}
