import React, { useState, useEffect, useRef } from 'react'
import { useWorkspaceStore, Workspace } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { X, Edit2, Check, Trash2, Plus, Loader2, Layout, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { confirm as confirmDialog } from '@/components/ui/ConfirmDialog'

interface ManageWorkspacesModalProps {
    isOpen: boolean
    onClose: () => void
}

const PALETTE = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    '#f97316', '#a3e635',
]

export const ManageWorkspacesModal: React.FC<ManageWorkspacesModalProps> = ({ isOpen, onClose }) => {
    const {
        workspaces,
        activeWorkspaceId,
        loading,
        loadWorkspaces,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        setActiveWorkspace,
    } = useWorkspaceStore()
    const { user } = useAuthStore()

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editColor, setEditColor] = useState('')
    const [savingId, setSavingId] = useState<string | null>(null)

    const [newName, setNewName] = useState('')
    const [newColor, setNewColor] = useState(PALETTE[0])
    const [creating, setCreating] = useState(false)
    const [showCreate, setShowCreate] = useState(false)

    const newInputRef = useRef<HTMLInputElement>(null)

    // Load workspaces when modal opens
    useEffect(() => {
        if (isOpen && user) loadWorkspaces()
    }, [isOpen, user])

    // Focus new-name input when create panel opens
    useEffect(() => {
        if (showCreate) {
            setTimeout(() => newInputRef.current?.focus(), 80)
        }
    }, [showCreate])

    if (!isOpen) return null

    /* ---- Edit handlers ---- */

    const handleStartEdit = (ws: Workspace) => {
        setEditingId(ws.id)
        setEditName(ws.name)
        setEditColor(ws.color)
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditName('')
        setEditColor('')
    }

    const handleSave = async (id: string) => {
        if (!editName.trim()) return
        setSavingId(id)
        await updateWorkspace(id, { name: editName, color: editColor })
        setSavingId(null)
        setEditingId(null)
    }

    /* ---- Create handlers ---- */

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        const ws = await createWorkspace({ name: newName, color: newColor })
        setCreating(false)
        if (ws) {
            setNewName('')
            setNewColor(PALETTE[0])
            setShowCreate(false)
        }
    }

    /* ---- Delete handler ---- */

    const handleDelete = async (ws: Workspace) => {
        if (workspaces.length <= 1) return // store also guards this
        if (!await confirmDialog({ message: `Delete workspace "${ws.name}"? Lists inside it won't be deleted.`, variant: 'danger', confirmLabel: 'Delete' })) return
        await deleteWorkspace(ws.id)
    }

    /* ---- Recover lost data handler ---- */
    const onRecover = async () => {
        if (!await confirmDialog({ message: 'Recover lost data? This will merge orphaned lists back into your account.', confirmLabel: 'Recover' })) return
        try {
            const userId = user?.id
            if (userId) {
                if ((window as any).electronAPI?.db?.recoverOrphans) {
                    await (window as any).electronAPI.db.recoverOrphans(userId)
                }
                alert('Recovery complete. Please restart the app if lists do not appear.')
                window.location.reload()
            }
        } catch (e) {
            console.error('Recovery failed', e)
            alert('Recovery failed. Check the console for details.')
        }
    }

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                            <Layout size={18} className="text-indigo-400" />
                            <h2 className="text-base font-semibold text-white">Workspaces</h2>
                            {workspaces.length > 0 && (
                                <span className="text-xs font-medium bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                                    {workspaces.length}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                        {loading && !workspaces.length ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-indigo-400" size={24} />
                            </div>
                        ) : workspaces.length === 0 ? (
                            <div className="text-center py-8 text-white/40 text-sm">
                                No workspaces yet. Create your first one below.
                            </div>
                        ) : (
                            workspaces.map(ws => (
                                <motion.div
                                    key={ws.id}
                                    layout
                                    className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl group hover:bg-white/[0.07] transition-colors border border-transparent hover:border-white/[0.07]"
                                >
                                    {/* Color swatch / avatar */}
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner"
                                        style={{ backgroundColor: editingId === ws.id ? editColor : ws.color }}
                                    >
                                        {ws.name.charAt(0).toUpperCase()}
                                    </div>

                                    {editingId === ws.id ? (
                                        /* ---- Edit mode ---- */
                                        <div className="flex-1 flex flex-col gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500 w-full"
                                                autoFocus
                                                maxLength={50}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSave(ws.id)
                                                    if (e.key === 'Escape') handleCancelEdit()
                                                }}
                                            />
                                            {/* Color picker */}
                                            <div className="flex gap-1.5">
                                                {PALETTE.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setEditColor(c)}
                                                        className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                                                        style={{
                                                            backgroundColor: c,
                                                            outline: editColor === c ? `2px solid ${c}` : 'none',
                                                            outlineOffset: '2px',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* ---- View mode ---- */
                                        <div className="flex-1 flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-white truncate">{ws.name}</span>
                                            {ws.id === activeWorkspaceId && (
                                                <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {editingId === ws.id ? (
                                            <>
                                                <button
                                                    onClick={() => handleSave(ws.id)}
                                                    disabled={savingId === ws.id || !editName.trim()}
                                                    className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors disabled:opacity-40"
                                                >
                                                    {savingId === ws.id
                                                        ? <Loader2 size={15} className="animate-spin" />
                                                        : <Check size={15} />
                                                    }
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {/* Activate */}
                                                {ws.id !== activeWorkspaceId && (
                                                    <button
                                                        onClick={() => setActiveWorkspace(ws.id)}
                                                        className="px-2 py-1 text-[10px] font-semibold text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        Set active
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleStartEdit(ws)}
                                                    className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Rename"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                {workspaces.length > 1 && (
                                                    <button
                                                        onClick={() => handleDelete(ws)}
                                                        className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete workspace"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Create panel */}
                    <AnimatePresence>
                        {showCreate && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-white/10"
                            >
                                <div className="p-4 space-y-3">
                                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                                        New Workspace
                                    </p>
                                    <input
                                        ref={newInputRef}
                                        type="text"
                                        placeholder="Workspace name…"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        maxLength={50}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreate()
                                            if (e.key === 'Escape') setShowCreate(false)
                                        }}
                                    />
                                    {/* Color picker */}
                                    <div className="flex gap-2">
                                        {PALETTE.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setNewColor(c)}
                                                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                                                style={{
                                                    backgroundColor: c,
                                                    outline: newColor === c ? `2px solid ${c}` : 'none',
                                                    outlineOffset: '2px',
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCreate}
                                            disabled={creating || !newName.trim()}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40"
                                        >
                                            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                            Create
                                        </button>
                                        <button
                                            onClick={() => setShowCreate(false)}
                                            className="px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-2">
                        {!showCreate ? (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                            >
                                <Plus size={15} />
                                New workspace
                            </button>
                        ) : (
                            <span />
                        )}
                        <button
                            onClick={onRecover}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-yellow-500/70 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                            title="Recover orphaned lists"
                        >
                            <RefreshCw size={12} />
                            Recover lost data
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
