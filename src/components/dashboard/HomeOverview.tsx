import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/store/taskStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useFocusStore } from '@/store/focusStore'
import { useAuthStore } from '@/store/authStore'
import { useListStore } from '@/store/listStore'
import { isToday, startOfWeek, format, differenceInCalendarDays } from 'date-fns'
import { ArrowUpRight, Flame, CheckCircle2, Circle, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { ActivityHeatmap } from './ActivityHeatmap'
import { calculateRealTimeFocus, calculateStreak, isFocusType } from '@/utils/timeCalculations'
import { cn } from '@/utils/helpers'

const FOCUS_GOAL_MIN = 180 // 3h daily focus goal
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

function fmtMin(m: number) {
    if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
    return m ? `${m}m` : '0m'
}

export function HomeOverview() {
    const { user } = useAuthStore()
    const { tasks, setSelectedTask } = useTaskStore()
    const { lists, setSelectedList } = useListStore()
    const { workspaces, setActiveWorkspace } = useWorkspaceStore()
    const { startTime, isActive, sessionType, sessions, setShowFocusPanel } = useFocusStore()
    const navigate = useNavigate()

    const stats = useMemo(() => {
        const validTasks = tasks.filter((t: any) => !t.deleted_at && (!t.list_id || lists.some((l: any) => l.id === t.list_id)))
        const active = validTasks.filter((t: any) => t.status !== 'done')
        const doneToday = validTasks.filter((t: any) => t.status === 'done' && t.completed_at?.startsWith(new Date().toISOString().split('T')[0]))
        const focusMin = Math.round(calculateRealTimeFocus(sessions, isActive, startTime, sessionType) / 60)

        const startOfCurWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
        let weeklyMins = 0
        const weekBars = [0, 0, 0, 0, 0, 0, 0] // Mon..Sun
        sessions.forEach(s => {
            if (isFocusType(s.type) && s.start_time && new Date(s.start_time) >= startOfCurWeek) {
                const mins = (s.seconds || 0) / 60
                weeklyMins += mins
                const idx = differenceInCalendarDays(new Date(s.start_time), startOfCurWeek)
                if (idx >= 0 && idx < 7) weekBars[idx] += mins
            }
        })
        const delta = (isActive && isFocusType(sessionType) && startTime) ? Math.floor((Date.now() - startTime) / 1000) : 0
        weeklyMins += delta / 60
        if (delta > 0) {
            const idx = differenceInCalendarDays(new Date(), startOfCurWeek)
            if (idx >= 0 && idx < 7) weekBars[idx] += delta / 60
        }

        return {
            active: active.length,
            doneToday: doneToday.length,
            focusMin,
            weeklyMins: Math.round(weeklyMins),
            currentStreak: calculateStreak(sessions),
            weekBars,
            todayIdx: differenceInCalendarDays(new Date(), startOfCurWeek),
        }
    }, [tasks, startTime, sessions, lists, isActive, sessionType])

    const suggestedTasks = useMemo(() => {
        const pending = tasks.filter((t: any) => !t.deleted_at && t.status !== 'done' && (!t.list_id || lists.some((l: any) => l.id === t.list_id)))
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
    }, [tasks, lists])

    const focusPct = Math.round(Math.min(stats.focusMin, FOCUS_GOAL_MIN) / FOCUS_GOAL_MIN * 100)
    const donePct = (stats.doneToday + stats.active) > 0
        ? Math.round((stats.doneToday / (stats.doneToday + stats.active)) * 100)
        : 0
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

    const maxBar = Math.max(...stats.weekBars, 1)
    const ringCirc = 2 * Math.PI * 52

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar pb-24">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-10">

                {/* Header */}
                <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-[var(--text-tertiary)] mb-2">
                            {format(new Date(), 'EEEE, MMMM d')}
                        </p>
                        <h1 className="text-[34px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">
                            {getGreeting()}, <span className="text-[var(--accent-primary)]">{name}</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowFocusPanel(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-full font-semibold text-sm hover:brightness-105 active:scale-95 transition-all shadow-[0_8px_24px_var(--accent-glow)]"
                    >
                        <Flame size={16} /> Start focus
                    </button>
                </header>

                {/* Bento grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">

                    {/* Focus — weekly bars */}
                    <Tile className="lg:col-span-1 flex flex-col">
                        <TileHead title="Focus" onClick={() => setShowFocusPanel(true)} />
                        <div className="flex-1 flex items-end justify-between gap-2 mt-6 mb-4 min-h-[120px]">
                            {stats.weekBars.map((m, i) => {
                                const h = Math.max((m / maxBar) * 100, 6)
                                const isToday = i === stats.todayIdx
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="w-full flex items-end h-[100px]">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${h}%` }}
                                                transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                                                className={cn('w-full rounded-full', isToday ? 'bg-[var(--accent-primary)]' : 'bg-[var(--accent-violet)]/60')}
                                            />
                                        </div>
                                        <span className={cn('text-[11px] font-medium', isToday ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)]')}>
                                            {WEEKDAYS[i]}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex items-baseline justify-between border-t border-[var(--border-default)] pt-3">
                            <span className="text-xs text-[var(--text-tertiary)]">This week</span>
                            <span className="text-2xl font-semibold tracking-tight tabular-nums">{fmtMin(stats.weeklyMins)}</span>
                        </div>
                    </Tile>

                    {/* Focus ring — today vs goal */}
                    <Tile className="lg:col-span-1 flex flex-col">
                        <TileHead title="Today" onClick={() => setShowFocusPanel(true)} />
                        <div className="flex-1 flex items-center justify-center my-2 min-h-[120px]">
                            <div className="relative w-[140px] h-[140px]">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-hover)" strokeWidth="12" />
                                    <motion.circle
                                        cx="60" cy="60" r="52" fill="none" stroke="var(--accent-primary)" strokeWidth="12" strokeLinecap="round"
                                        strokeDasharray={ringCirc}
                                        initial={{ strokeDashoffset: ringCirc }}
                                        animate={{ strokeDashoffset: ringCirc - (focusPct / 100) * ringCirc }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        style={{ filter: 'drop-shadow(0 0 6px var(--accent-glow))' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-semibold tabular-nums leading-none">{fmtMin(stats.focusMin)}</span>
                                    {isActive && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-baseline justify-between border-t border-[var(--border-default)] pt-3">
                            <span className="text-xs text-[var(--text-tertiary)]">Goal 3h</span>
                            <span className="text-2xl font-semibold tracking-tight tabular-nums">{focusPct}%</span>
                        </div>
                    </Tile>

                    {/* Stacked: streak (lime) + open tasks (violet) */}
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        <div className="rounded-[var(--radius-tile)] bg-[var(--accent-primary)] text-[var(--accent-contrast)] p-5 flex items-center justify-between shadow-[0_8px_24px_var(--accent-glow)]">
                            <div>
                                <div className="text-3xl font-bold tracking-tight tabular-nums leading-none">{stats.currentStreak}</div>
                                <div className="mt-1.5 text-xs font-semibold opacity-80">Day streak</div>
                            </div>
                            <Flame size={28} className={stats.currentStreak > 0 ? 'animate-pulse' : 'opacity-40'} />
                        </div>
                        <button
                            onClick={() => { setSelectedList('all'); navigate('/planner') }}
                            className="flex-1 text-left rounded-[var(--radius-tile)] bg-[var(--accent-violet)] text-white p-5 flex flex-col justify-between min-h-[120px] hover:brightness-110 transition-all shadow-[0_8px_24px_var(--accent-violet-glow)]"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold">Open tasks</span>
                                <Target size={18} className="opacity-80" />
                            </div>
                            <div className="text-3xl font-bold tracking-tight tabular-nums">{stats.active}</div>
                        </button>
                    </div>

                    {/* Up next — checklist with progress footer */}
                    <Tile className="lg:col-span-1 lg:row-span-2 flex flex-col">
                        <TileHead title="Up next" onClick={() => { setSelectedList('all'); navigate('/planner') }} />
                        <div className="flex-1 mt-4 -mx-1">
                            {suggestedTasks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
                                    <CheckCircle2 size={28} className="text-[var(--accent-primary)] opacity-60" />
                                    <p className="text-sm text-[var(--text-tertiary)]">You're all clear.<br />Good time for deep work.</p>
                                </div>
                            ) : (
                                <ul className="space-y-1">
                                    {suggestedTasks.map(t => {
                                        const urgent = t.priority === 'critical' || t.priority === 'high'
                                        return (
                                            <li key={t.id}>
                                                <button
                                                    onClick={() => openTask(t)}
                                                    className="group w-full flex items-center gap-3 px-1 py-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-left"
                                                >
                                                    <Circle size={16} className={cn('shrink-0', urgent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]')} />
                                                    <span className="flex-1 min-w-0 text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors truncate">
                                                        {t.title}
                                                    </span>
                                                    {t.due_date && isToday(new Date(t.due_date)) && (
                                                        <span className="text-[11px] font-semibold text-[var(--accent-primary)] shrink-0">Today</span>
                                                    )}
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                        <div className="border-t border-[var(--border-default)] pt-4 mt-2">
                            <div className="h-2 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-[var(--accent-primary)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${donePct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                            </div>
                            <div className="flex items-baseline justify-between mt-3">
                                <span className="text-xs text-[var(--text-tertiary)]">Completed today</span>
                                <span className="text-2xl font-semibold tabular-nums">{stats.doneToday}</span>
                            </div>
                        </div>
                    </Tile>

                    {/* Workspaces — spans 3 cols under the top row */}
                    <Tile className="lg:col-span-3 flex flex-col">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">Workspaces</h2>
                            <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{workspaces.length}</span>
                        </div>
                        {workspaces.length === 0 ? (
                            <p className="text-[var(--text-tertiary)] text-sm py-6">No workspaces yet. Create one from the sidebar.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-4">
                                {workspaces.map((ws: any) => {
                                    const listIds = new Set(lists.filter(l => l.workspace_id === ws.id).map(l => l.id))
                                    const wsTasks = tasks.filter(t => !t.deleted_at && t.list_id && listIds.has(t.list_id))
                                    const wsDone = wsTasks.filter(t => t.status === 'done').length
                                    const pct = wsTasks.length ? Math.round((wsDone / wsTasks.length) * 100) : 0
                                    return (
                                        <button
                                            key={ws.id}
                                            onClick={() => { setActiveWorkspace(ws.id); navigate('/dashboard') }}
                                            className="group text-left rounded-2xl bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] p-4 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ws.color }} />
                                                <span className="flex-1 min-w-0 text-sm font-semibold text-[var(--text-primary)] truncate">{ws.name}</span>
                                                <ArrowUpRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-[var(--bg-card)] overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ws.color }} />
                                            </div>
                                            <p className="mt-2 text-[11px] text-[var(--text-tertiary)] tabular-nums">{wsDone}/{wsTasks.length} done</p>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </Tile>
                </div>

                {/* Activity heatmap */}
                <ActivityHeatmap />
            </div>
        </div>
    )
}

function Tile({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] p-5 shadow-sm', className)}>
            {children}
        </div>
    )
}

function TileHead({ title, onClick }: { title: string; onClick?: () => void }) {
    return (
        <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
            {onClick && (
                <button
                    onClick={onClick}
                    className="w-7 h-7 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowUpRight size={14} />
                </button>
            )}
        </div>
    )
}
