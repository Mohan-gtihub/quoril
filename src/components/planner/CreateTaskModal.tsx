import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Repeat, Plus, Check, ChevronDown, List as ListIcon, User } from 'lucide-react'
import { useCreateTask } from '@/hooks/useCreateTask'
import { useListStore } from '@/store/listStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import type { Task } from '@/types/database'
import type { List, TaskColumn } from '@/types/list'
import { PRIORITY_META, priorityTint } from '@/utils/priority'

/* ---- Reusable styled dropdown (replaces native <select>) ---- */
interface DropOption {
    value: string
    label: string
    dot?: string          // color swatch
    icon?: React.ReactNode
    muted?: boolean       // e.g. the "+ New…" action row
}

function Dropdown({ value, options, placeholder, onChange, leadingIcon }: {
    value: string
    options: DropOption[]
    placeholder?: string
    onChange: (value: string) => void
    leadingIcon?: React.ReactNode
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const selected = options.find(o => o.value === value)

    useEffect(() => {
        if (!open) return
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [open])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-secondary)] text-sm border rounded-[var(--radius-tile)] outline-none transition-colors ${open ? 'border-[var(--accent-primary)]' : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
                    }`}
            >
                {selected?.dot
                    ? <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.dot }} />
                    : <span className="shrink-0 text-[var(--text-muted)]">{selected?.icon ?? leadingIcon}</span>}
                <span className={`flex-1 text-left truncate ${selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {selected?.label ?? placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-56 overflow-y-auto rounded-[var(--radius-tile)] bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-lift)] py-1 animate-scale-in origin-top">
                    {options.map(o => {
                        const active = o.value === value
                        return (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => { onChange(o.value); setOpen(false) }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${o.muted
                                    ? 'text-[var(--accent-primary)] hover:bg-[var(--bg-hover)]'
                                    : active
                                        ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {o.dot
                                    ? <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.dot }} />
                                    : <span className="shrink-0">{o.icon}</span>}
                                <span className="flex-1 truncate">{o.label}</span>
                                {active && !o.muted && <Check className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

interface Props {
    isOpen: boolean
    onClose: () => void
    /** Initial destination list. Optional — the user can pick another below. */
    listId?: string
    column?: TaskColumn
    position?: 'top' | 'bottom'
    onCreated?: (task: Task) => void
}

const PRESETS = [25, 45, 60, 90]
const NO_WORKSPACE = '__none__'

export function CreateTaskModal({ isOpen, onClose, listId, column = 'today', position = 'bottom', onCreated }: Props) {
    const { lists, createList, fetchLists } = useListStore()
    const { workspaces, activeWorkspaceId, createWorkspace, loadWorkspaces } = useWorkspaceStore()

    const [title, setTitle] = useState('')
    const [minutes, setMinutes] = useState(0)
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
    const [isRecurring, setIsRecurring] = useState(false)

    /* Destination state */
    const [workspaceId, setWorkspaceId] = useState<string>(NO_WORKSPACE)
    const [selectedListId, setSelectedListId] = useState<string>('')
    const [newWorkspaceName, setNewWorkspaceName] = useState('')
    const [newListName, setNewListName] = useState('')
    const [creatingDest, setCreatingDest] = useState(false)

    // Real lists only (the sidebar injects a synthetic 'all' pseudo-list).
    const realLists = useMemo(() => lists.filter(l => l.id !== 'all'), [lists])

    const listsInWorkspace = useMemo(
        () => realLists.filter(l =>
            workspaceId === NO_WORKSPACE
                ? !(l as any).workspace_id
                : (l as any).workspace_id === workspaceId
        ),
        [realLists, workspaceId]
    )

    const { submit, loading, error } = useCreateTask(selectedListId)

    /* Seed the destination when the modal opens */
    useEffect(() => {
        if (!isOpen) { reset(); return }

        loadWorkspaces()
        fetchLists()

        // Anchor to the passed-in list if valid, else the active workspace's first list.
        const seedList = realLists.find(l => l.id === listId)
        if (seedList) {
            setWorkspaceId((seedList as any).workspace_id ?? NO_WORKSPACE)
            setSelectedListId(seedList.id)
        } else {
            const ws = activeWorkspaceId ?? NO_WORKSPACE
            setWorkspaceId(ws)
            const first = realLists.find(l =>
                ws === NO_WORKSPACE ? !(l as any).workspace_id : (l as any).workspace_id === ws
            )
            setSelectedListId(first?.id ?? '')
        }
    }, [isOpen])

    /* Keep the chosen list valid whenever the workspace changes */
    useEffect(() => {
        if (!isOpen) return
        if (!listsInWorkspace.some(l => l.id === selectedListId)) {
            setSelectedListId(listsInWorkspace[0]?.id ?? '')
        }
    }, [workspaceId, listsInWorkspace])

    function reset() {
        setTitle('')
        setMinutes(0)
        setPriority('medium')
        setIsRecurring(false)
        setNewWorkspaceName('')
        setNewListName('')
        setCreatingDest(false)
    }

    async function handleCreateWorkspace() {
        const name = newWorkspaceName.trim()
        if (!name) return
        setCreatingDest(true)
        try {
            const ws = await createWorkspace({ name })
            if (ws) {
                setWorkspaceId(ws.id)
                setSelectedListId('')
                setNewWorkspaceName('')
            }
        } finally {
            setCreatingDest(false)
        }
    }

    async function handleCreateList() {
        const name = newListName.trim()
        if (!name) return
        setCreatingDest(true)
        try {
            const created = await createList({
                name,
                ...(workspaceId !== NO_WORKSPACE ? { workspace_id: workspaceId } : {}),
            } as Partial<List>)
            if (created) {
                await fetchLists()
                setSelectedListId(created.id)
                setNewListName('')
            }
        } finally {
            setCreatingDest(false)
        }
    }

    async function handleSubmit(focusAfter = false) {
        const res = await submit({
            title,
            minutes,
            priority,
            focusAfter,
            isRecurring,
            column,
            position,
        })

        if (res) {
            onCreated?.(res)
            reset()
            onClose()
        }
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape') onClose()
        if (e.ctrlKey && e.key === 'Enter' && title.trim() && selectedListId) handleSubmit(true)
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-[var(--radius-tile)] p-6 bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-lift)] animate-scale-in"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={onKeyDown}
                tabIndex={0}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                        New task
                    </h2>

                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-[var(--radius-tile)] transition-colors">
                        <X className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                    </button>
                </div>

                {/* Title */}
                <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task name..."
                    className="w-full mb-6 px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-tile)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15 placeholder:text-[var(--text-muted)] transition-colors"
                />

                {/* Destination (Workspace + List) */}
                <div className="mb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2.5">Destination</p>

                    <div className="grid grid-cols-2 gap-2">
                        {/* Workspace */}
                        <Dropdown
                            value={workspaceId}
                            leadingIcon={<User className="w-4 h-4" />}
                            onChange={(v) => {
                                if (v === '__new__') { setNewWorkspaceName(' '); setNewListName(''); return }
                                setWorkspaceId(v)
                            }}
                            options={[
                                { value: NO_WORKSPACE, label: 'Personal', icon: <User className="w-4 h-4 text-[var(--text-muted)]" /> },
                                ...workspaces.filter(w => !w.deleted_at).map(w => ({
                                    value: w.id, label: w.name, dot: w.color,
                                })),
                                { value: '__new__', label: 'New workspace', muted: true, icon: <Plus className="w-4 h-4" /> },
                            ]}
                        />

                        {/* List */}
                        <Dropdown
                            value={selectedListId}
                            placeholder="Select list"
                            leadingIcon={<ListIcon className="w-4 h-4" />}
                            onChange={(v) => {
                                if (v === '__new__') { setNewListName(' '); setNewWorkspaceName(''); return }
                                setSelectedListId(v)
                            }}
                            options={[
                                ...listsInWorkspace.map(l => ({
                                    value: l.id, label: l.name,
                                    dot: (l as any).color || undefined,
                                    icon: <ListIcon className="w-4 h-4 text-[var(--text-muted)]" />,
                                })),
                                { value: '__new__', label: 'New list', muted: true, icon: <Plus className="w-4 h-4" /> },
                            ]}
                        />
                    </div>

                    {/* Inline: create workspace */}
                    {newWorkspaceName !== '' && (
                        <div className="flex gap-2 mt-2">
                            <input
                                autoFocus
                                value={newWorkspaceName.trimStart()}
                                onChange={(e) => setNewWorkspaceName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateWorkspace() } }}
                                placeholder="Workspace name…"
                                className="flex-1 px-3 py-2 text-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-tile)] outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)] transition-colors"
                            />
                            <button
                                onClick={handleCreateWorkspace}
                                disabled={creatingDest || !newWorkspaceName.trim()}
                                className="px-3 rounded-[var(--radius-tile)] bg-[var(--accent-primary)] text-[var(--accent-contrast)] disabled:opacity-50 transition-colors"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setNewWorkspaceName('')}
                                className="px-3 rounded-[var(--radius-tile)] bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Inline: create list */}
                    {newListName !== '' && (
                        <div className="flex gap-2 mt-2">
                            <input
                                autoFocus
                                value={newListName.trimStart()}
                                onChange={(e) => setNewListName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateList() } }}
                                placeholder="List name…"
                                className="flex-1 px-3 py-2 text-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-tile)] outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)] transition-colors"
                            />
                            <button
                                onClick={handleCreateList}
                                disabled={creatingDest || !newListName.trim()}
                                className="px-3 rounded-[var(--radius-tile)] bg-[var(--accent-primary)] text-[var(--accent-contrast)] disabled:opacity-50 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setNewListName('')}
                                className="px-3 rounded-[var(--radius-tile)] bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Priority */}
                <div className="mb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2.5">Priority</p>

                    <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map((p) => {
                            const meta = PRIORITY_META[p]
                            const selected = priority === p
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPriority(p)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-tile)] text-xs font-semibold transition-colors border"
                                    style={selected
                                        ? { color: meta.color, backgroundColor: priorityTint(meta.color, 14), borderColor: priorityTint(meta.color, 45) }
                                        : { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', borderColor: 'transparent' }
                                    }
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                                    {meta.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Time Presets */}
                <div className="mb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2.5">Focus duration</p>

                    <div className="flex gap-2 mb-3">
                        {PRESETS.map((m) => (
                            <button
                                key={m}
                                onClick={() => setMinutes(m)}
                                className={`flex-1 py-2 rounded-[var(--radius-tile)] text-xs font-medium tabular-nums transition-colors border ${minutes === m
                                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--accent-contrast)]'
                                    : 'bg-[var(--bg-tertiary)] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                                    }`}
                            >
                                {m}m
                            </button>
                        ))}
                    </div>

                    <input
                        type="number"
                        min={0}
                        step={5}
                        value={minutes || ''}
                        onChange={(e) => setMinutes(+e.target.value)}
                        placeholder="Unlimited focus..."
                        className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] tabular-nums border border-[var(--border-default)] rounded-[var(--radius-tile)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15 placeholder:text-[var(--text-muted)] transition-colors"
                    />
                </div>

                {/* Recurrence */}
                <div className="mb-6">
                    <button
                        onClick={() => setIsRecurring(!isRecurring)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-tile)] border transition-colors ${isRecurring
                            ? 'bg-[var(--accent-lime-100)] border-[var(--accent-primary)]/40 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Repeat className="w-4 h-4" />
                            <span className="text-sm font-medium">Daily recurrence</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${isRecurring ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'}`}>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-[var(--accent-contrast)] rounded-full transition-transform ${isRecurring ? 'translate-x-5' : ''}`} />
                        </div>
                    </button>
                    <p className="text-[11px] text-[var(--text-muted)] mt-2 ml-1 leading-relaxed">
                        Task will automatically reappear in your list tomorrow morning.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 px-4 py-2 bg-[var(--error)]/10 text-xs text-[var(--error)] rounded-[var(--radius-tile)]">
                        {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col gap-2.5 mt-8">
                    <div className="flex gap-2.5">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] py-3 rounded-[var(--radius-tile)] font-medium hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            disabled={loading || !title.trim() || !selectedListId}
                            onClick={() => handleSubmit(false)}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] py-3 rounded-[var(--radius-tile)] font-medium hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create
                        </button>
                    </div>

                    <button
                        disabled={loading || !title.trim() || !selectedListId}
                        onClick={() => handleSubmit(true)}
                        className="w-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] py-3 rounded-[var(--radius-tile)] font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create & Focus Now
                    </button>
                </div>

                {/* Hint */}
                <p className="text-[11px] text-[var(--text-muted)] mt-4 text-center tracking-wide">
                    Ctrl + Enter to create & focus
                </p>
            </div>
        </div>
    )
}
