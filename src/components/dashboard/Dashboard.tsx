import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListStore } from '@/store/listStore'
import { useTaskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useFocusStore } from '@/store/focusStore'
import {
    Plus, Search, CheckCircle2, Circle,
    Layers, MoreHorizontal, Archive, Copy, Edit3,
    Flame, ListPlus, FolderKanban, X, RotateCcw, Trash2,
    Zap, TrendingUp, Target, AlarmClock, GripVertical
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent,
    PointerSensor, closestCenter, useSensor, useSensors,
    defaultDropAnimationSideEffects,
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
const P_INFO: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: '#ef4444' },
    high: { label: 'High', color: '#f97316' },
    medium: { label: 'Medium', color: '#eab308' },
    low: { label: 'Low', color: '#3b82f6' },
}

function fmtDue(due: string | null | undefined) {
    if (!due) return null
    const d = new Date(due)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'MMM d')
}

function fmtMin(m: number) {
    if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
    return m ? `${m}m` : '—'
}

/* ─────────────────────────────────────────
   BENTO LAYOUT SIZES
   Each list gets a "size" based on task count:
   • sm  (col-span-1, row-span-1) — ≤3 tasks
   • md  (col-span-1, row-span-2) — 4-8 tasks
   • lg  (col-span-2, row-span-1) — ≥9 tasks
───────────────────────────────────────── */
function getBentoSize(taskCount: number): 'sm' | 'md' | 'lg' {
    if (taskCount >= 9) return 'lg'
    if (taskCount >= 4) return 'md'
    return 'sm'
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
    const { isActive, taskId: activeTaskId, elapsed } = useFocusStore()
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
        let filtered = isArchived
            ? archivedLists.filter(l => !l.deleted_at)
            : activeWorkspaceId === 'unassigned'
                ? base.filter(l => !(l as any).workspace_id)
                : activeWorkspaceId
                    ? base.filter(l => (l as any).workspace_id === activeWorkspaceId)
                    : base
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

    // Global stats
    const stats = useMemo(() => {
        const all = tasks.filter(t => !t.deleted_at)
        const active = all.filter(t => t.status !== 'done')
        const doneToday = all.filter(t => t.status === 'done' && t.completed_at?.startsWith(new Date().toISOString().split('T')[0]))
        const focusMin = Math.round(elapsed / 60)
        const totalEst = active.reduce((s, t) => s + (t.estimated_minutes || 0), 0)
        return { active: active.length, doneToday: doneToday.length, focusMin, totalEst }
    }, [tasks, elapsed])

    const handleDragStart = (e: DragStartEvent) => { setActiveDragId(e.active.id as string); setMenuListId(null) }
    const handleDragEnd = async (e: DragEndEvent) => {
        setActiveDragId(null)
        const { active, over } = e
        if (!over || active.id === over.id) return
        const newOrder = arrayMove(sortedIds, sortedIds.indexOf(active.id as string), sortedIds.indexOf(over.id as string))
        setSortedIds(newOrder)
        await reorderLists(newOrder.map((id, i) => ({ id, sort_order: i })))
    }

    const ws = workspaces.find(w => w.id === activeWorkspaceId)
    const activeDragList = activeDragId ? visibleLists.find(l => l.id === activeDragId) : null

    return (
        <div className="flex flex-col h-full overflow-hidden" onClick={() => setMenuListId(null)}>

            {/* ── TOP BAR ── */}
            <div className="h-13 px-6 py-3 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)] sticky top-0 z-30 shrink-0">
                <div className="flex items-center gap-3">
                    {ws && <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: ws.color }} />}
                    <span className="text-sm font-bold">
                        {isArchived ? 'Archived' : activeWorkspaceId === 'unassigned' ? 'Unassigned' : ws?.name || 'Dashboard'}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] tabular-nums">
                        {orderedLists.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search…"
                            className="w-40 pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-lg placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                        />
                    </div>
                    {!isArchived && (
                        <button
                            onClick={() => setShowCreateList(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
                        >
                            <ListPlus size={12} /> New List
                        </button>
                    )}
                </div>
            </div>

            {/* ── BODY ── */}
            <main className="flex-1 overflow-y-auto p-5">

                {/* ── HERO STATS ROW ── */}
                {!isArchived && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        <StatTile
                            icon={<Target size={16} />}
                            label="Active Tasks"
                            value={String(stats.active)}
                            color="#6366f1"
                            sub={`${stats.totalEst ? fmtMin(stats.totalEst) + ' est.' : 'No estimate'}`}
                        />
                        <StatTile
                            icon={<CheckCircle2 size={16} />}
                            label="Done Today"
                            value={String(stats.doneToday)}
                            color="#10b981"
                            sub="tasks completed"
                        />
                        <StatTile
                            icon={<Zap size={16} />}
                            label="Focus Time"
                            value={fmtMin(stats.focusMin)}
                            color="#f59e0b"
                            sub={isActive ? '● Live session' : 'today'}
                        />
                        <StatTile
                            icon={<TrendingUp size={16} />}
                            label="Lists"
                            value={String(orderedLists.length)}
                            color="#8b5cf6"
                            sub={`in ${ws?.name || 'workspace'}`}
                        />
                    </div>
                )}

                {/* ── BENTO GRID ── */}
                {!activeWorkspaceId && workspaces.length === 0 ? (
                    <EmptyState kind="no-workspace" onCreate={() => setShowWsModal(true)} search="" />
                ) : orderedLists.length === 0 ? (
                    <EmptyState kind={isArchived ? 'archived' : search ? 'search' : 'empty'} onCreate={() => setShowCreateList(true)} search={search} />
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-2 xl:grid-cols-4 auto-rows-[minmax(180px,auto)] gap-3">
                                {orderedLists.map(list => {
                                    const lt = (tasksByList[list.id] || []).filter(t => !t.deleted_at)
                                    const pending = lt.filter(t => t.status !== 'done')
                                    const done = lt.filter(t => t.status === 'done')
                                    const progress = lt.length ? Math.round((done.length / lt.length) * 100) : 0
                                    const hasActive = lt.some(t => t.id === activeTaskId && isActive)
                                    const size = getBentoSize(lt.length)

                                    return (
                                        <SortableBentoCard key={list.id} id={list.id} size={size} disabled={isArchived} isDragging={activeDragId === list.id}>
                                            <BentoListCard
                                                list={list}
                                                tasks={lt}
                                                pending={pending}
                                                done={done}
                                                progress={progress}
                                                hasActive={hasActive}
                                                size={size}
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
                                        </SortableBentoCard>
                                    )
                                })}

                                {/* Add card */}
                                {!isArchived && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => setShowCreateList(true)}
                                        className="group rounded-2xl border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-primary)]/40 flex flex-col items-center justify-center gap-2.5 transition-all col-span-1 row-span-1 min-h-[180px]"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-hover)] group-hover:bg-[var(--accent-primary)]/10 flex items-center justify-center transition-all">
                                            <Plus size={18} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors font-semibold">New List</span>
                                    </motion.button>
                                )}
                            </div>
                        </SortableContext>

                        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.35' } } }) }}>
                            {activeDragList && (
                                <div className="rotate-[1.5deg] scale-[1.04] shadow-2xl pointer-events-none opacity-95">
                                    <BentoListCard
                                        list={activeDragList}
                                        tasks={(tasksByList[activeDragList.id] || []).filter(t => !t.deleted_at)}
                                        pending={[]} done={[]} progress={0} hasActive={false}
                                        size={getBentoSize((tasksByList[activeDragList.id] || []).length)}
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-2xl rounded-2xl overflow-hidden"
                        >
                            <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
                                <div>
                                    <h3 className="font-bold text-sm">Move List</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">"{movingList.name}"</p>
                                </div>
                                <button onClick={() => setMovingList(null)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition"><X size={14} /></button>
                            </div>
                            <div className="p-2 max-h-64 overflow-y-auto space-y-0.5">
                                <WsBtn label="Unassigned" selected={!(movingList as any).workspace_id} onClick={() => { moveListToWorkspace(movingList.id, null as any); setMovingList(null) }} />
                                {workspaces.map(w => <WsBtn key={w.id} label={w.name} color={w.color} selected={(movingList as any).workspace_id === w.id} onClick={() => { moveListToWorkspace(movingList.id, w.id); setMovingList(null) }} />)}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* ─────────────────────────────────────────
   HERO STAT TILE
───────────────────────────────────────── */
function StatTile({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] px-4 py-3.5 overflow-hidden"
        >
            {/* Accent glow blob */}
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 blur-xl" style={{ backgroundColor: color }} />
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</span>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)] leading-none mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div className="text-[10px] text-[var(--text-muted)]">{sub}</div>
            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 h-[2px] w-full" style={{ background: `linear-gradient(to right, ${color}60, transparent)` }} />
        </motion.div>
    )
}

/* ─────────────────────────────────────────
   SORTABLE BENTO WRAPPER
───────────────────────────────────────── */
const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'col-span-1 row-span-1',
    md: 'col-span-1 row-span-2',
    lg: 'col-span-2 row-span-1',
}

function SortableBentoCard({ id, size, children, disabled, isDragging }: {
    id: string; size: 'sm' | 'md' | 'lg'; children: React.ReactNode; disabled?: boolean; isDragging?: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled })
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.25 : 1 }}
            className={sizeClasses[size]}
            {...attributes} {...listeners}
        >
            {children}
        </div>
    )
}

/* ─────────────────────────────────────────
   BENTO LIST CARD
───────────────────────────────────────── */
interface CardProps {
    list: List; tasks: Task[]; pending: Task[]; done: Task[]
    progress: number; hasActive: boolean; size: 'sm' | 'md' | 'lg'
    isMenuOpen: boolean; isArchived: boolean; isDragging?: boolean
    onOpenMenu: (e: React.MouseEvent) => void; onClick: () => void
    onDuplicate: () => void; onEdit: () => void; onArchive: () => void
    onMove: () => void; onRestore: () => void; onPermanentDelete: () => void
    search: string
}

function BentoListCard({
    list, tasks, pending, done, progress, hasActive, size,
    isMenuOpen, isArchived, isDragging, onOpenMenu, onClick,
    onDuplicate, onEdit, onArchive, onMove, onRestore, onPermanentDelete, search
}: CardProps) {
    const accent = list.color || '#6366f1'
    const taskLimit = size === 'sm' ? 2 : size === 'md' ? 6 : 4
    const previewTasks = pending.slice(0, taskLimit)

    const hl = (text: string, q: string) => {
        if (!q) return <>{text}</>
        const i = text.toLowerCase().indexOf(q.toLowerCase())
        if (i === -1) return <>{text}</>
        return <>{text.slice(0, i)}<mark className="bg-yellow-400/25 text-inherit rounded">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
            className={cn(
                "group relative h-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] flex flex-col overflow-hidden transition-all duration-200",
                !isArchived && "cursor-pointer hover:shadow-lg hover:border-[var(--border-hover)] hover:-translate-y-0.5",
                isArchived && "cursor-default opacity-60",
                hasActive && "ring-1 ring-[var(--accent-primary)]/40 shadow-md",
                isDragging && "shadow-2xl scale-[1.02]"
            )}
            onClick={onClick}
        >
            {/* ── Gradient header ── */}
            <div
                className="flex items-start justify-between px-4 pt-4 pb-3 shrink-0"
                style={{ background: `linear-gradient(135deg, ${accent}18 0%, ${accent}06 100%)` }}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar */}
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-md"
                        style={{
                            background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                            boxShadow: `0 4px 12px ${accent}40`
                        }}
                    >
                        {list.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm text-[var(--text-primary)] truncate leading-tight">
                            {hl(list.name, search)}
                        </h3>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            {pending.length} pending · {done.length} done
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {hasActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />}
                    {!isArchived && (
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/10" onClick={onOpenMenu}>
                            <MoreHorizontal size={13} />
                        </button>
                    )}
                    {isArchived && (
                        <button className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]" onClick={onOpenMenu}>
                            <MoreHorizontal size={13} />
                        </button>
                    )}

                    {/* Context menu */}
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.93 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.93 }}
                                transition={{ duration: 0.1 }}
                                className="absolute right-3 top-12 w-44 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl z-50 shadow-2xl overflow-hidden"
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

            {/* ── Progress bar ── */}
            <div className="px-4 pb-2 shrink-0">
                <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: progress === 100 ? '#10b981' : accent }}
                        />
                    </div>
                    <span className="text-[9px] font-bold text-[var(--text-muted)] tabular-nums shrink-0">{progress}%</span>
                </div>
            </div>

            {/* ── Task list ── */}
            <div className="flex-1 px-3 pb-3 overflow-hidden">
                {previewTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-1.5 text-[var(--text-muted)]">
                        {tasks.length === 0
                            ? <><Layers size={20} className="opacity-15" /><p className="text-[10px] opacity-40">No tasks yet</p></>
                            : <><CheckCircle2 size={20} className="text-emerald-500 opacity-40" /><p className="text-[10px] text-emerald-500/50 font-semibold">All done!</p></>
                        }
                    </div>
                ) : (
                    <div className="space-y-1">
                        {previewTasks.map(t => {
                            const p = P_INFO[t.priority]
                            const due = fmtDue(t.due_date)
                            return (
                                <div key={t.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-hover)] transition-colors group/task">
                                    <Circle size={11} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-[var(--text-secondary)] truncate leading-tight">{hl(t.title, search)}</p>
                                        {(due || p) && (
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                {due && (
                                                    <span className="flex items-center gap-0.5 text-[9px] text-[var(--text-muted)]">
                                                        <AlarmClock size={7} /> {due}
                                                    </span>
                                                )}
                                                {p && (
                                                    <span className="text-[9px] font-semibold rounded-full" style={{ color: p.color }}>
                                                        ● {p.label}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {pending.length > taskLimit && (
                            <p className="text-[9px] text-[var(--text-muted)] text-center pt-0.5 italic">
                                +{pending.length - taskLimit} more
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-2 border-t border-[var(--border-default)]/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)]">
                    {hasActive && (
                        <span className="flex items-center gap-1 text-[var(--accent-primary)] font-bold">
                            <Flame size={9} className="animate-pulse" /> Active
                        </span>
                    )}
                    {isArchived && (
                        <span className="flex items-center gap-1 italic">
                            <Archive size={8} /> Archived
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                    <CheckCircle2 size={9} className="text-emerald-500" />
                    <span className="tabular-nums">{done.length}/{tasks.length}</span>
                </div>
            </div>

            {/* Drag grip */}
            {!isArchived && (
                <div className="absolute top-1/2 -translate-y-1/2 -left-3 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
                    <GripVertical size={12} className="text-[var(--text-muted)]" />
                </div>
            )}
        </motion.div>
    )
}

/* ─────────────────────────────────────────
   MINI HELPERS
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
        <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors hover:bg-[var(--bg-hover)]", selected && "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]")}>
            <div className={cn("w-3.5 h-3.5 rounded shrink-0", !color && "border border-dashed border-[var(--text-muted)] opacity-40")} style={color ? { backgroundColor: color } : {}} />
            <span className="flex-1 truncate font-medium">{label}</span>
            {selected && <CheckCircle2 size={13} className="text-[var(--accent-primary)] shrink-0" />}
        </button>
    )
}

function EmptyState({ kind, onCreate, search }: { kind: string; onCreate: () => void; search: string }) {
    if (kind === 'search') return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
            <Search size={28} className="opacity-20" />
            <p className="text-sm">No lists match "<span className="text-[var(--text-primary)]">{search}</span>"</p>
        </div>
    )
    if (kind === 'archived') return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
            <Archive size={28} className="opacity-20" />
            <p className="text-sm opacity-60">No archived lists</p>
        </div>
    )
    if (kind === 'no-workspace') return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <FolderKanban size={32} className="text-[var(--accent-primary)] opacity-30" />
            <div className="text-center"><h3 className="font-bold mb-1">No workspaces yet</h3><p className="text-sm text-[var(--text-muted)]">Create a workspace to start organising</p></div>
            <button onClick={onCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] text-white text-sm font-semibold rounded-xl active:scale-95"><Plus size={14} />Create Workspace</button>
        </div>
    )
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-[var(--text-muted)]">
            <Layers size={32} className="opacity-20" />
            <div className="text-center"><p className="text-sm opacity-60">No lists in this workspace</p></div>
            <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white text-sm font-semibold rounded-lg active:scale-95"><Plus size={13} />Add List</button>
        </div>
    )
}


export function IconButton({ icon, onClick, className = "" }: { icon: React.ReactNode; onClick?: () => void; className?: string }) {
    return <button onClick={onClick} className={`p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 ${className}`}>{icon}</button>
}
