import { useEffect, useRef, useState } from 'react'
import type { Canvas } from '@/types/canvas'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

export function MetaCanvas({
    canvases,
    onPick,
    onNew,
    onRename,
    onDelete,
}: {
    canvases: Canvas[]
    onPick: (id: string) => void
    onNew: () => Promise<string | null>
    onRename: (id: string, title: string) => void
    onDelete: (id: string) => void
}) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draft, setDraft] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (editingId) inputRef.current?.focus()
    }, [editingId])

    const startEdit = (c: Canvas) => {
        setConfirmDeleteId(null)
        setEditingId(c.id)
        setDraft(c.title)
    }

    const commitEdit = () => {
        if (!editingId) return
        const next = draft.trim()
        const current = canvases.find((c) => c.id === editingId)
        if (next && current && next !== current.title) onRename(editingId, next)
        setEditingId(null)
        setDraft('')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setDraft('')
    }

    return (
        <div className="w-full h-full bg-[var(--bg-primary)] overflow-auto p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-xl font-semibold mb-6 text-[var(--text-primary)]">Whiteboards</h1>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <button
                        onClick={async () => {
                            const id = await onNew()
                            // Immediately let the user name the new whiteboard.
                            if (id) { setConfirmDeleteId(null); setEditingId(id); setDraft('Untitled') }
                        }}
                        className="aspect-video rounded-lg border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2 hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]"
                    >
                        <Plus size={20} />
                        <span className="text-sm">New whiteboard</span>
                    </button>

                    {canvases.map((c) => {
                        const isEditing = editingId === c.id
                        const isConfirming = confirmDeleteId === c.id
                        return (
                            <div
                                key={c.id}
                                className="group aspect-video rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-left hover:border-[var(--accent-primary)] transition-colors relative overflow-hidden flex flex-col"
                                style={c.color ? { background: c.color } : undefined}
                            >
                                {/* Open the board (disabled while editing/confirming) */}
                                <button
                                    type="button"
                                    onClick={() => { if (!isEditing && !isConfirming) onPick(c.id) }}
                                    className="absolute inset-0 z-0"
                                    aria-label={`Open ${c.title}`}
                                    tabIndex={isEditing || isConfirming ? -1 : 0}
                                />

                                {/* Title / inline rename */}
                                <div className="relative z-10">
                                    {isEditing ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                ref={inputRef}
                                                value={draft}
                                                onChange={(e) => setDraft(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitEdit()
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                className="w-full text-sm px-1 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--accent-primary)] text-[var(--text-primary)] outline-none"
                                                maxLength={120}
                                            />
                                            <button type="button" onClick={commitEdit} title="Save" className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"><Check size={14} /></button>
                                            <button type="button" onClick={cancelEdit} title="Cancel" className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <div className="text-sm font-medium text-[var(--text-primary)] truncate pr-12">{c.title}</div>
                                    )}
                                    <div className="text-xs text-[var(--text-muted)] mt-1">
                                        {new Date(c.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Hover actions: rename + delete */}
                                {!isEditing && !isConfirming && (
                                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => startEdit(c)} title="Rename" className="p-1 rounded bg-[var(--bg-primary)]/70 hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"><Pencil size={13} /></button>
                                        <button type="button" onClick={() => { setEditingId(null); setConfirmDeleteId(c.id) }} title="Delete" className="p-1 rounded bg-[var(--bg-primary)]/70 hover:bg-[var(--bg-hover)] text-red-500"><Trash2 size={13} /></button>
                                    </div>
                                )}

                                {/* Inline delete confirm */}
                                {isConfirming && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[var(--bg-card)]/95 p-3 text-center">
                                        <div className="text-sm text-[var(--text-primary)]">Delete “{c.title}”?</div>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => { onDelete(c.id); setConfirmDeleteId(null) }} className="px-2 py-1 text-xs rounded-md bg-red-500 text-white hover:bg-red-600">Delete</button>
                                            <button type="button" onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs rounded-md border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
