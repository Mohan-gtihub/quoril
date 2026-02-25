import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useFocusStore } from '@/store/focusStore'
import {
    Plus, Search, CheckCircle2, Circle, Clock,
    Layers, MoreHorizontal, Archive, Copy, Edit3,
    Flame, ListPlus, FolderKanban, X, RotateCcw, Trash2, AlarmClock
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent,
    PointerSensor, closestCenter, useSensor, useSensors, defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
    SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CreateListModal } from './CreateListModal'
import { ManageWorkspacesModal } from '@/components/sidebar/ManageWorkspacesModal'
import type { List, Task } from '@/types/database'
import { cn } from '@/utils/helpers'
import { format, isToday, isTomorrow } from 'date-fns'

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const P_LABEL: Record<string, { label: string; cls: string }> = {
    critical: { label: '● Critical', cls: 'text-red-500 bg-red-500/10' },
    high: { label: '● High Priority', cls: 'text-orange-500 bg-orange-500/10' },
    medium: { label: '● Medium Priority', cls: 'text-yellow-500 bg-yellow-500/10' },
    low: { label: '● Low Priority', cls: 'text-blue-500 bg-blue-500/10' },
}

function fmtDue(due_date: string | null | undefined): string | null {
    if (!due_date) return null
    const d = new Date(due_date)
    if (isToday(d)) return 'Due Today'
    if (isTomorrow(d)) return 'Due Tomorrow'
    return `Due ${format(d, 'MMM d')}`
}

/* ─────────────────────────────────────────
   MAIN
───────────────────────────────────────── */
export function Dashboard() {
    const { user } = useAuthStore()
    const {
        lists, archivedLists, fetchLists, setSelectedList,
        duplicateList, archive, moveListToWorkspace,
        restoreList, permanentDeleteList, reorderLists, loadArchived
    } = useListStore()
    const { tasks, fetchTasks } = useTaskStore()
    const { workspaces, loadWorkspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore()
    const { isActive, taskId: activeTaskId } = useFocusStore()
    const navigate = useNavigate()

    const [search, setSearch] = useState('')
    const [menuListId, setMenuListId] = useState<string | null>(null)
    const [showCreateList, setShowCreateList] = useState(false)
    const [editingList, setEditingList] = useState<List | null>(null)
    const [movingList, setMovingList] = useState<List | null>(null)
    const [showWsModal, setShowWsModal] = useState(false)
    const [sortedIds, setSortedIds] = useState<string[]>([])
    const [activeDragId, setActiveDragId] = useState<string | null>(null)

    const isArchived = activeWorkspaceId === 'archived'

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    useEffect(() => { fetchLists(); fetchTasks(); if (user) loadWorkspaces() }, [user])
    useEffect(() => { if (isArchived) loadArchived() }, [isArchived])
    useEffect(() => {
        if (!activeWorkspaceId && workspaces.length > 0) setActiveWorkspace(workspaces[0].id)
    }, [workspaces, activeWorkspaceId])

    const tasksByList = useMemo(() => {
        const map: Record<string, Task[]> = {}
        for (const t of tasks) {
            if (!t.list_id || t.deleted_at) continue
            if (!map[t.list_id]) map[t.list_id] = []
            map[t.list_id].push(t)
        }
        return map
    }, [tasks])

    const visibleLists = useMemo(() => {
        const base = lists.filter(l => !l.deleted_at && !l.archived_at)
        let filtered = base
        if (activeWorkspaceId === 'unassigned') {
            filtered = base.filter(l => !(l as any).workspace_id)
        } else if (isArchived) {
            filtered = archivedLists.filter(l => !l.deleted_at)
        } else if (activeWorkspaceId) {
            filtered = base.filter(l => (l as any).workspace_id === activeWorkspaceId)
        }
        filtered = [...filtered].sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0))
        if (!search.trim()) return filtered
        const q = search.toLowerCase()
        return filtered.filter(l =>
            l.name.toLowerCase().includes(q) ||
            (tasksByList[l.id] || []).some(t => t.title.toLowerCase().includes(q))
        )
    }, [lists, archivedLists, activeWorkspaceId, search, tasksByList, isArchived])

    useEffect(() => {
        if (!activeDragId) setSortedIds(visibleLists.map(l => l.id))
    }, [visibleLists, activeDragId])

    const orderedLists = useMemo(() => {
        const map = new Map(visibleLists.map(l => [l.id, l]))
        return sortedIds.map(id => map.get(id)).filter(Boolean) as List[]
    }, [sortedIds, visibleLists])

    const handleDragStart = (e: DragStartEvent) => { setActiveDragId(e.active.id as string); setMenuListId(null) }
    const handleDragEnd = async (e: DragEndEvent) => {
        setActiveDragId(null)
        const { active, over } = e
        if (!over || active.id === over.id) return
        const newOrder = arrayMove(sortedIds, sortedIds.indexOf(active.id as string), sortedIds.indexOf(over.id as string))
        setSortedIds(newOrder)
        await reorderLists(newOrder.map((id, i) => ({ id, sort_order: i })))
    }

    const activeDragList = activeDragId ? visibleLists.find(l => l.id === activeDragId) : null
    const ws = workspaces.find(w => w.id === activeWorkspaceId)

    return (
        <div className="flex flex-col h-full overflow-hidden" onClick={() => setMenuListId(null)}>

            {/* ── HEADER ── */}
            <div className="h-14 px-6 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)] sticky top-0 z-30 shrink-0">
                <div className="flex items-center gap-3">
                    {ws && <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ws.color }} />}
                    <h1 className="text-sm font-bold text-[var(--text-primary)]">
                        {isArchived ? 'Archived' : activeWorkspaceId === 'unassigned' ? 'Unassigned' : ws?.name || 'Dashboard'}
                    </h1>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] tabular-nums">
                        {orderedLists.length} lists
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search…"
                            className="w-44 pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-lg placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                        />
                    </div>
                    {!isArchived && (
                        <button
                            onClick={() => setShowCreateList(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-sm"
                        >
                            <ListPlus size={13} /> Add List
                        </button>
                    )}
                </div>
            </div>

            {/* ── BODY ── */}
            <main className="flex-1 overflow-y-auto p-6">
                {!activeWorkspaceId && workspaces.length === 0 ? (
                    <EmptyWs onCreate={() => setShowWsModal(true)} />
                ) : orderedLists.length === 0 ? (
                    <EmptyLists search={search} isArchived={isArchived} onCreate={() => setShowCreateList(true)} />
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {orderedLists.map(list => {
                                    const lt = (tasksByList[list.id] || []).filter(t => !t.deleted_at)
                                    const pending = lt.filter(t => t.status !== 'done')
                                    const done = lt.filter(t => t.status === 'done')
                                    const progress = lt.length ? Math.round((done.length / lt.length) * 100) : 0
                                    const hasActive = lt.some(t => t.id === activeTaskId && isActive)
                                    // Find the nearest due task
                                    const nextDue = pending
                                        .filter(t => t.due_date)
                                        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]

                                    return (
                                        <SortableCard key={list.id} id={list.id} disabled={isArchived} isDragging={activeDragId === list.id}>
                                            <ListCard
                                                list={list}
                                                tasks={lt}
                                                pending={pending}
                                                done={done}
                                                progress={progress}
                                                hasActive={hasActive}
                                                nextDue={nextDue}
                                                isMenuOpen={menuListId === list.id}
                                                isArchived={isArchived}
                                                onOpenMenu={e => { e.stopPropagation(); setMenuListId(menuListId === list.id ? null : list.id) }}
                                                onClick={() => !isArchived && (setSelectedList(list.id), navigate('/planner'))}
                                                onDuplicate={() => { duplicateList(list.id); setMenuListId(null) }}
                                                onEdit={() => { setEditingList(list); setMenuListId(null) }}
                                                onArchive={() => { archive(list.id); setMenuListId(null) }}
                                                onMove={() => { setMovingList(list); setMenuListId(null) }}
                                                onRestore={() => { restoreList(list.id); setMenuListId(null) }}
                                                onPermanentDelete={() => { permanentDeleteList(list.id); setMenuListId(null) }}
                                                search={search}
                                            />
                                        </SortableCard>
                                    )
                                })}

                                {!isArchived && (
                                    <button
                                        onClick={() => setShowCreateList(true)}
                                        className="group h-full min-h-[220px] rounded-xl border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-primary)]/40 flex flex-col items-center justify-center gap-2 transition-all"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-[var(--bg-hover)] group-hover:bg-[var(--accent-primary)]/10 flex items-center justify-center transition-all">
                                            <Plus size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors font-medium">Add List</span>
                                    </button>
                                )}
                            </div>
                        </SortableContext>

                        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
                            {activeDragList && (
                                <div className="rotate-1 scale-[1.03] shadow-2xl opacity-95 pointer-events-none">
                                    <ListCard
                                        list={activeDragList}
                                        tasks={(tasksByList[activeDragList.id] || []).filter(t => !t.deleted_at)}
                                        pending={[]} done={[]} progress={0} hasActive={false} nextDue={undefined}
                                        isMenuOpen={false} isArchived={false} isDragging
                                        onOpenMenu={() => { }} onClick={() => { }} onDuplicate={() => { }} onEdit={() => { }}
                                        onArchive={() => { }} onMove={() => { }} onRestore={() => { }} onPermanentDelete={() => { }}
                                        search=""
                                    />
                                </div>
                            )}
                        </DragOverlay>
                    </DndContext>
                )}
            </main>

            {/* ── MODALS ── */}
            <CreateListModal
                isOpen={showCreateList || !!editingList}
                onClose={() => { setShowCreateList(false); setEditingList(null) }}
                listToEdit={editingList}
                defaultWorkspaceId={(activeWorkspaceId && activeWorkspaceId !== 'unassigned') ? activeWorkspaceId : undefined}
            />
            <AnimatePresence>
                {showWsModal && <ManageWorkspacesModal isOpen={showWsModal} onClose={() => setShowWsModal(false)} />}
                {movingList && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-2xl rounded-2xl overflow-hidden"
                        >
                            <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
                                <div>
                                    <h3 className="font-bold text-sm">Move List</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">"{movingList.name}"</p>
                                </div>
                                <button onClick={() => setMovingList(null)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition"><X size={14} /></button>
                            </div>
                            <div className="p-2 max-h-64 overflow-y-auto space-y-1">
                                <WsBtn label="Unassigned" selected={!(movingList as any).workspace_id} onClick={() => { moveListToWorkspace(movingList.id, null as any); setMovingList(null) }} />
                                {workspaces.map(w => (
                                    <WsBtn key={w.id} label={w.name} color={w.color} selected={(movingList as any).workspace_id === w.id} onClick={() => { moveListToWorkspace(movingList.id, w.id); setMovingList(null) }} />
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* ─────────────────────────────────────────
   SORTABLE WRAPPER
───────────────────────────────────────── */
function SortableCard({ id, children, disabled, isDragging }: { id: string; children: React.ReactNode; disabled?: boolean; isDragging?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled })
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
            {...attributes} {...listeners}
        >
            {children}
        </div>
    )
}

/* ─────────────────────────────────────────
   LIST CARD — Blitzit style
───────────────────────────────────────── */
interface CardProps {
    list: List; tasks: Task[]; pending: Task[]; done: Task[]
    progress: number; hasActive: boolean; nextDue?: Task
    isMenuOpen: boolean; isArchived: boolean; isDragging?: boolean
    onOpenMenu: (e: React.MouseEvent) => void; onClick: () => void
    onDuplicate: () => void; onEdit: () => void; onArchive: () => void
    onMove: () => void; onRestore: () => void; onPermanentDelete: () => void
    search: string
}

function ListCard({
    list, tasks, pending, done, progress, hasActive, nextDue,
    isMenuOpen, isArchived, isDragging, onOpenMenu, onClick,
    onDuplicate, onEdit, onArchive, onMove, onRestore, onPermanentDelete,
    search
}: CardProps) {
    const accent = list.color || '#6366f1'
    const previewTasks = pending.slice(0, 4)

    const hl = (text: string, q: string) => {
        if (!q) return <>{text}</>
        const i = text.toLowerCase().indexOf(q.toLowerCase())
        if (i === -1) return <>{text}</>
        return <>{text.slice(0, i)}<mark className="bg-yellow-400/30 text-inherit rounded">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
    }

    return (
        <div
            className={cn(
                "group relative flex flex-col bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] transition-all duration-150 overflow-hidden",
                !isArchived && "cursor-pointer hover:shadow-md hover:border-[var(--border-hover)]",
                isArchived && "cursor-default opacity-70",
                isDragging && "shadow-2xl scale-[1.02]",
                hasActive && "ring-1 ring-[var(--accent-primary)]/40"
            )}
            onClick={onClick}
        >
            {/* Colour stripe along the top */}
            <div className="h-1 w-full" style={{ backgroundColor: accent }} />

            {/* Card body */}
            <div className="p-4 flex flex-col gap-3">

                {/* Row 1 — title + menu */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar circle */}
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ backgroundColor: accent }}
                        >
                            {list.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate leading-tight">{hl(list.name, search)}</h3>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-none">
                                {done.length}/{tasks.length} done
                            </p>
                        </div>
                    </div>

                    {/* Count badge + menu */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {pending.length > 0 && (
                            <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-hover)] rounded-full px-1.5 py-0.5 tabular-nums">
                                {pending.length}
                            </span>
                        )}
                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={onOpenMenu}
                                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                            >
                                <MoreHorizontal size={14} />
                            </button>
                            <AnimatePresence>
                                {isMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6, scale: 0.94 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.94 }}
                                        transition={{ duration: 0.1 }}
                                        className="absolute right-0 top-7 w-44 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl z-50 shadow-2xl overflow-hidden"
                                    >
                                        <div className="p-1">
                                            {isArchived ? (
                                                <>
                                                    <MI icon={<RotateCcw size={11} />} label="Unarchive" onClick={onRestore} />
                                                    <div className="my-1 border-t border-[var(--border-default)]" />
                                                    <MI icon={<Trash2 size={11} />} label="Delete Permanently" onClick={onPermanentDelete} danger />
                                                </>
                                            ) : (
                                                <>
                                                    <MI icon={<Edit3 size={11} />} label="Rename" onClick={onEdit} />
                                                    <MI icon={<Copy size={11} />} label="Duplicate" onClick={onDuplicate} />
                                                    <MI icon={<FolderKanban size={11} />} label="Move to Workspace" onClick={onMove} />
                                                    <div className="my-1 border-t border-[var(--border-default)]" />
                                                    <MI icon={<Archive size={11} />} label="Archive" onClick={onArchive} danger />
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Row 2 — progress bar */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] font-semibold">
                        <span>Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10b981' : accent }}
                        />
                    </div>
                </div>

                {/* Row 3 — task previews */}
                <div className="space-y-1.5 min-h-[80px]">
                    {previewTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-[var(--text-muted)]">
                            <Layers size={18} className="opacity-20 mb-1" />
                            <p className="text-[10px] opacity-40">{tasks.length === done.length && tasks.length > 0 ? 'All done! 🎉' : 'No tasks'}</p>
                        </div>
                    ) : (
                        previewTasks.map(t => {
                            const p = P_LABEL[t.priority]
                            return (
                                <div key={t.id} className="flex items-start gap-2 bg-[var(--bg-hover)] rounded-lg px-2.5 py-2 group/task">
                                    <Circle size={12} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-[var(--text-primary)] truncate leading-tight">
                                            {hl(t.title, search)}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            {t.due_date && (
                                                <span className="flex items-center gap-0.5 text-[9px] text-[var(--text-muted)]">
                                                    <Clock size={8} /> {fmtDue(t.due_date)}
                                                </span>
                                            )}
                                            {p && (
                                                <span className={cn("text-[9px] font-semibold px-1.5 rounded-full", p.cls)}>
                                                    {p.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    {pending.length > 4 && (
                        <p className="text-[10px] text-[var(--text-muted)] text-center pt-1">+{pending.length - 4} more tasks</p>
                    )}
                </div>

                {/* Row 4 — footer */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-default)]/50">
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                        {hasActive && (
                            <span className="flex items-center gap-1 text-[var(--accent-primary)] font-semibold">
                                <Flame size={9} className="animate-pulse" /> Active
                            </span>
                        )}
                        {nextDue && (
                            <span className="flex items-center gap-1">
                                <AlarmClock size={9} /> {fmtDue(nextDue.due_date)}
                            </span>
                        )}
                        {isArchived && (
                            <span className="flex items-center gap-1 italic">
                                <Archive size={9} /> Archived
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{done.length}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ─────────────────────────────────────────
   MINI COMPONENTS
───────────────────────────────────────── */
function MI({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
    return (
        <button
            onClick={e => { e.stopPropagation(); onClick() }}
            className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[11px] rounded-lg transition-colors", danger ? "text-red-400 hover:bg-red-500/10" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]")}
        >
            {icon}{label}
        </button>
    )
}

function WsBtn({ label, color, selected, onClick }: { label: string; color?: string; selected: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left transition-colors hover:bg-[var(--bg-hover)]", selected && "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]")}>
            <div className={cn("w-4 h-4 rounded shrink-0", !color && "border border-dashed border-[var(--text-muted)] opacity-40")} style={color ? { backgroundColor: color } : {}} />
            <span className="flex-1 truncate">{label}</span>
            {selected && <CheckCircle2 size={14} className="text-[var(--accent-primary)] shrink-0" />}
        </button>
    )
}

function EmptyWs({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <FolderKanban size={32} className="text-[var(--accent-primary)] opacity-30" />
            <div className="text-center"><h3 className="font-bold mb-1">No workspaces yet</h3><p className="text-sm text-[var(--text-muted)]">Create a workspace to organise your lists.</p></div>
            <button onClick={onCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] text-white text-sm font-semibold rounded-xl active:scale-95"><Plus size={14} />Create Workspace</button>
        </div>
    )
}

function EmptyLists({ search, isArchived, onCreate }: { search: string; isArchived?: boolean; onCreate: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-muted)]">
            {search ? <><Search size={28} className="opacity-20" /><p className="text-sm">No lists match "<span className="text-[var(--text-primary)]">{search}</span>"</p></>
                : isArchived ? <><Archive size={28} className="opacity-20" /><p className="text-sm opacity-60">No archived lists</p></>
                    : <><Layers size={28} className="opacity-20" /><p className="text-sm opacity-60">No lists in this workspace</p><button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white text-sm font-semibold rounded-lg active:scale-95"><Plus size={13} />Add List</button></>}
        </div>
    )
}

// Backward compat export
export function IconButton({ icon, onClick, className = "" }: { icon: React.ReactNode; onClick?: () => void; className?: string }) {
    return <button onClick={onClick} className={`p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 ${className}`}>{icon}</button>
}


