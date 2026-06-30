import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/store/taskStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useFocusStore } from '@/store/focusStore'
import { useAuthStore } from '@/store/authStore'
import { useListStore } from '@/store/listStore'
import { isToday, format } from 'date-fns'
import { ArrowUpRight, Flame, CheckCircle2, Circle, Play } from 'lucide-react'
import { ActivityHeatmap } from './ActivityHeatmap'
import { cn } from '@/utils/helpers'
import { calculateRealTimeFocus, calculateStreak } from '@/utils/timeCalculations'
import { canEditTaskTime } from '@/utils/assignee'
import { useTimerDisplay } from '@/hooks/useTimerDisplay'

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

function getGreetingEmoji() {
    const hour = new Date().getHours()
    if (hour < 12) return '☕'
    if (hour < 17) return '🌤️'
    return '🌙'
}

function fmtMin(m: number) {
    if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
    return m ? `${m}m` : '0m'
}

// Seconds → m:ss (or h:mm:ss) for the live running-task clock.
function fmtClock(totalSeconds: number) {
    const s = Math.max(0, Math.round(Math.abs(totalSeconds)))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    const pad = (n: number) => n.toString().padStart(2, '0')
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

export function HomeOverview() {
    const { user } = useAuthStore()
    const { tasks, setSelectedTask, toggleComplete } = useTaskStore()
    const { lists, setSelectedList } = useListStore()
    const { workspaces, setActiveWorkspace } = useWorkspaceStore()
    const { startTime, isActive, sessionType, sessions, taskId: activeTaskId, setShowFocusPanel, startFocus } = useFocusStore()
    const { displayTime, isOvertime } = useTimerDisplay()
    const navigate = useNavigate()

    const currentEmail = user?.email ?? null

    // A task assigned to someone else must not appear on (or be startable from)
    // this user's Home — it belongs only to its assignee. Unassigned tasks and
    // tasks assigned to me stay visible (canEditTaskTime encodes exactly that).
    const visibleTasks = useMemo(
        () => tasks.filter((t: any) => canEditTaskTime(t.assigned_to, currentEmail)),
        [tasks, currentEmail]
    )

    const stats = useMemo(() => {
        const validTasks = visibleTasks.filter((t: any) => !t.deleted_at && (!t.list_id || lists.some((l: any) => l.id === t.list_id)))
        const active = validTasks.filter((t: any) => t.status !== 'done')
        // Compare on the LOCAL calendar day (matches focus-minute bucketing).
        const todayKey = format(new Date(), 'yyyy-MM-dd')
        const doneToday = validTasks.filter((t: any) => t.status === 'done' && t.completed_at && format(new Date(t.completed_at), 'yyyy-MM-dd') === todayKey)
        const focusMin = Math.round(calculateRealTimeFocus(sessions, isActive, startTime, sessionType) / 60)

        return {
            active: active.length,
            doneToday: doneToday.length,
            focusMin,
            currentStreak: calculateStreak(sessions),
        }
    }, [visibleTasks, startTime, sessions, lists, isActive, sessionType])

    const suggestedTasks = useMemo(() => {
        // Exclude the currently-running task — it gets its own card above — and
        // tasks assigned to other people (visibleTasks already drops those).
        const pending = visibleTasks.filter((t: any) => !t.deleted_at && t.status !== 'done' && t.id !== activeTaskId && (!t.list_id || lists.some((l: any) => l.id === t.list_id)))
        let priorityTasks = pending
            .filter((t: any) => ['critical', 'high'].includes(t.priority) || (t.due_date && isToday(new Date(t.due_date))))
            .sort((a: any, b: any) => {
                const w: any = { critical: 3, high: 2, medium: 1, low: 0 }
                return (w[b.priority] || 0) - (w[a.priority] || 0)
            })
        if (priorityTasks.length < 6) {
            const ids = new Set(priorityTasks.map((t: any) => t.id))
            const rest = pending.filter((t: any) => !ids.has(t.id))
            priorityTasks = [...priorityTasks, ...rest]
        }
        return priorityTasks.slice(0, 6)
    }, [visibleTasks, lists, activeTaskId])

    const name = user?.email?.split('@')[0] || 'there'

    const openTask = (t: any) => {
        setSelectedTask(t.id)
        if (t.list_id) {
            const list = lists.find((l: any) => l.id === t.list_id)
            setActiveWorkspace(list?.workspace_id || 'unassigned')
            setSelectedList(list?.id || 'inbox')
        } else {
            setActiveWorkspace('unassigned')
            setSelectedList('inbox')
        }
        navigate('/dashboard')
    }

    const totalToday = stats.active + stats.doneToday
    const progressPct = totalToday > 0 ? Math.round((stats.doneToday / totalToday) * 100) : 0

    // The top suggestion becomes the featured "Next task"; the rest fill the list.
    const featured = suggestedTasks[0]
    const restTasks = suggestedTasks.slice(1)

    const startTask = (t: any) => {
        // Guard: never let a non-assignee start someone else's task, even if a
        // stale render surfaced it. Mirrors TaskCard's start gate.
        if (!canEditTaskTime(t.assigned_to, currentEmail)) return
        setSelectedTask(t.id)
        startFocus(t.id)
    }

    // The task for the in-flight focus session, shown above "Next task".
    const runningTask = activeTaskId ? tasks.find((t: any) => t.id === activeTaskId) : null

    const taskMeta = (t: any) => {
        const list = t.list_id ? lists.find((l: any) => l.id === t.list_id) : null
        const ws = list ? workspaces.find((w: any) => w.id === list.workspace_id) : null
        return { wsName: ws?.name || 'Unassigned', wsColor: ws?.color || 'var(--text-muted)' }
    }
    const PRIORITY_COLOR: Record<string, string> = {
        critical: 'var(--priority-critical)', high: 'var(--priority-high)', medium: 'var(--priority-medium)', low: 'var(--priority-low)',
    }

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar pb-24">
            <div className="w-full max-w-[1320px] mx-auto px-6 md:px-10 py-8">

                {/* ── Hero band ── */}
                <div className="mb-10 flex flex-wrap items-center justify-between gap-5">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                            {format(new Date(), 'EEEE, MMMM d')}
                        </p>
                        <h1 className="text-[30px] leading-none font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
                            <span>{getGreeting()}, {name}</span>
                            <span className="text-[26px] leading-none" aria-hidden>{getGreetingEmoji()}</span>
                        </h1>
                        <div className="mt-4 flex items-center gap-4 text-[13px]">
                                <span className="flex items-baseline gap-1.5">
                                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">{stats.active}</span>
                                    <span className="text-[var(--text-tertiary)]">to do</span>
                                </span>
                                <span className="w-px h-3.5 bg-[var(--border-default)]" />
                                <span className="flex items-baseline gap-1.5">
                                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">{stats.doneToday}</span>
                                    <span className="text-[var(--text-tertiary)]">done</span>
                                </span>
                                <span className="w-px h-3.5 bg-[var(--border-default)]" />
                                <span className="flex items-baseline gap-1.5">
                                    <span className={cn('font-semibold tabular-nums', isActive ? 'text-[var(--focus)]' : 'text-[var(--text-primary)]')}>{fmtMin(stats.focusMin)}</span>
                                <span className="text-[var(--text-tertiary)]">focused</span>
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowFocusPanel(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-[var(--radius-pill)] font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                        <Flame size={16} /> Start focus
                    </button>
                </div>

                {/* ── Running now (in-flight focus session) ── */}
                {isActive && runningTask && (() => {
                    const { wsName, wsColor } = taskMeta(runningTask)
                    return (
                        <Panel className="mb-4 flex flex-wrap items-center justify-between gap-5 border-[var(--focus)]/40">
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--focus)] mb-2 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--focus)] animate-pulse" />
                                    Running now
                                </p>
                                <button onClick={() => openTask(runningTask)} className="block text-left max-w-full">
                                    <span className="block text-[19px] font-semibold tracking-tight text-[var(--text-primary)] truncate leading-tight">{runningTask.title}</span>
                                </button>
                                <div className="mt-2 flex items-center gap-2.5 text-[12.5px] text-[var(--text-tertiary)]">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: wsColor }} />
                                        {wsName}
                                    </span>
                                    <span className="w-px h-3 bg-[var(--border-default)]" />
                                    <span className={cn('tabular-nums font-semibold', isOvertime ? 'text-[var(--priority-critical)]' : 'text-[var(--focus)]')}>
                                        {isOvertime ? '+' : ''}{fmtClock(displayTime)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowFocusPanel(true)}
                                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[var(--focus)] text-[var(--accent-contrast)] rounded-[var(--radius-pill)] font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                            >
                                <Flame size={15} /> View session
                            </button>
                        </Panel>
                    )
                })()}

                {/* ── Next task ── */}
                {featured && (() => {
                    const { wsName, wsColor } = taskMeta(featured)
                    const est = featured.estimated_minutes ? fmtMin(featured.estimated_minutes) : null
                    const pColor = PRIORITY_COLOR[featured.priority] || 'var(--text-muted)'
                    return (
                        <Panel className="mb-4 flex flex-wrap items-center justify-between gap-5">
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Next task</p>
                                <button onClick={() => openTask(featured)} className="block text-left max-w-full">
                                    <span className="block text-[19px] font-semibold tracking-tight text-[var(--text-primary)] truncate leading-tight">{featured.title}</span>
                                </button>
                                <div className="mt-2 flex items-center gap-2.5 text-[12.5px] text-[var(--text-tertiary)]">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: wsColor }} />
                                        {wsName}
                                    </span>
                                    {est && (<><span className="w-px h-3 bg-[var(--border-default)]" /><span>{est}</span></>)}
                                    {(featured.priority === 'critical' || featured.priority === 'high') && (
                                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md" style={{ background: `color-mix(in srgb, ${pColor} 14%, transparent)`, color: pColor }}>
                                            {featured.priority === 'critical' ? 'Urgent' : 'High'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => startTask(featured)}
                                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-[var(--radius-pill)] font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                            >
                                <Play size={15} /> Start task
                            </button>
                        </Panel>
                    )
                })()}

                {/* ── Main asymmetric grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">

                    {/* LEFT: Today */}
                    <Panel className="p-0 overflow-hidden">
                        <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Today</h2>
                                {stats.active > 0 && (
                                    <span className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">{stats.active}</span>
                                )}
                            </div>
                            <button
                                onClick={() => { setSelectedList('all'); navigate('/planner') }}
                                className="text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                            >
                                All tasks <ArrowUpRight size={13} />
                            </button>
                        </div>

                        {restTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center gap-3 py-20 px-6">
                                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                                    <CheckCircle2 size={24} className="text-[var(--text-tertiary)]" />
                                </div>
                                <p className="text-sm text-[var(--text-tertiary)]">{featured ? "That's your last one — nice." : "You're all clear. Good time for deep work."}</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-[var(--border-default)]">
                                {restTasks.map(t => {
                                    const urgent = t.priority === 'critical' || t.priority === 'high'
                                    const dueToday = t.due_date && isToday(new Date(t.due_date))
                                    const { wsName, wsColor } = taskMeta(t)
                                    const pColor = PRIORITY_COLOR[t.priority] || 'var(--text-muted)'
                                    return (
                                        <li key={t.id} className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-[var(--bg-hover)] transition-colors">
                                            <button
                                                onClick={() => toggleComplete(t.id)}
                                                className="shrink-0 relative w-[18px] h-[18px] flex items-center justify-center"
                                                title="Mark done"
                                            >
                                                <Circle size={18} className="text-[var(--border-hover)] group-hover:text-[var(--accent-primary)] transition-colors" />
                                            </button>
                                            <button
                                                onClick={() => openTask(t)}
                                                className="flex-1 min-w-0 flex items-center gap-3 text-left"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pColor }} title={t.priority} />
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-[14px] font-medium text-[var(--text-primary)] truncate leading-tight">{t.title}</span>
                                                    <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[var(--text-tertiary)]">
                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: wsColor }} />
                                                        {wsName}
                                                    </span>
                                                </span>
                                                {urgent && (
                                                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md" style={{ background: `color-mix(in srgb, ${pColor} 14%, transparent)`, color: pColor }}>
                                                        {t.priority === 'critical' ? 'Urgent' : 'High'}
                                                    </span>
                                                )}
                                                {dueToday && !urgent && (
                                                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">Today</span>
                                                )}
                                                <ArrowUpRight size={14} className="shrink-0 text-transparent group-hover:text-[var(--text-muted)] transition-colors" />
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </Panel>

                    {/* RIGHT rail */}
                    <div className="space-y-4">

                        {/* Focus snapshot with progress ring */}
                        <Panel className="flex items-center gap-4">
                            <ProgressRing pct={progressPct} live={isActive} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Today's progress</p>
                                <p className="mt-1.5 text-[20px] font-semibold tracking-tight tabular-nums text-[var(--text-primary)] leading-none">
                                    {stats.doneToday}<span className="text-[var(--text-muted)] text-[15px]">/{totalToday || 0}</span>
                                    <span className="ml-1.5 text-[12px] font-medium text-[var(--text-tertiary)]">done</span>
                                </p>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1 pl-3 border-l border-[var(--border-default)] self-stretch justify-center">
                                <span className="flex items-center gap-1.5 text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
                                    <Flame size={14} className="text-[var(--break)]" />
                                    {stats.currentStreak}
                                </span>
                                <span className="text-[11px] text-[var(--text-tertiary)]">day streak</span>
                            </div>
                        </Panel>

                        {/* Workspaces */}
                        {workspaces.length > 0 && (
                            <Panel className="p-0 overflow-hidden">
                                <div className="px-4 py-3.5 flex items-center justify-between border-b border-[var(--border-default)]">
                                    <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Workspaces</h2>
                                    <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{workspaces.length}</span>
                                </div>
                                <div className="divide-y divide-[var(--border-default)]">
                                    {workspaces.map((ws: any) => {
                                        const listIds = new Set(lists.filter(l => l.workspace_id === ws.id).map(l => l.id))
                                        const wsTasks = tasks.filter(t => !t.deleted_at && t.list_id && listIds.has(t.list_id))
                                        const wsDone = wsTasks.filter(t => t.status === 'done').length
                                        const wsOpen = wsTasks.length - wsDone
                                        const pct = wsTasks.length ? Math.round((wsDone / wsTasks.length) * 100) : 0
                                        return (
                                            <button
                                                key={ws.id}
                                                onClick={() => { setActiveWorkspace(ws.id); navigate('/dashboard') }}
                                                className="group w-full text-left px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ws.color }} />
                                                    <span className="flex-1 min-w-0 text-[13px] font-semibold text-[var(--text-primary)] truncate">{ws.name}</span>
                                                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums shrink-0">{wsOpen} open</span>
                                                    <ArrowUpRight size={13} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                                                </div>
                                                <div className="mt-2.5 h-1.5 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: ws.color }} />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </Panel>
                        )}
                    </div>
                </div>

                {/* ── Activity heatmap ── */}
                <div className="mt-4">
                    <ActivityHeatmap />
                </div>
            </div>
        </div>
    )
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] p-5 ${className || ''}`}>
            {children}
        </div>
    )
}

function ProgressRing({ pct, live }: { pct: number; live?: boolean }) {
    return (
        <div
            className="relative w-[68px] h-[68px] shrink-0 rounded-full"
            style={{ background: `conic-gradient(var(--wellbeing) ${pct * 3.6}deg, var(--bg-tertiary) 0deg)` }}
        >
            <div className="absolute inset-[5px] rounded-full bg-[var(--bg-card)] flex items-center justify-center">
                <span className="text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">{pct}%</span>
            </div>
            {live && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--focus)] ring-2 ring-[var(--bg-card)] animate-pulse" />}
        </div>
    )
}

