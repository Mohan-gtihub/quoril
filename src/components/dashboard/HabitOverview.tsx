import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/store/taskStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useFocusStore } from '@/store/focusStore'
import { useDisplayName } from '@/hooks/useDisplayName'
import { useListStore } from '@/store/listStore'
import { format, subDays } from 'date-fns'
import {
    Flame, Plus, Check, TrendingUp, Target, CalendarCheck, ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import { calculateStreak } from '@/utils/timeCalculations'

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const isBreakType = (type?: string) => type === 'break' || type === 'long_break'

function currentStreak(days: boolean[]) {
    let s = 0
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i]) s++
        else break
    }
    return s
}

export function HabitOverview() {
    const { tasks, toggleComplete, setSelectedTask } = useTaskStore()
    const { lists, setSelectedList } = useListStore()
    const { workspaces, setActiveWorkspace } = useWorkspaceStore()
    const { sessions } = useFocusStore()
    const navigate = useNavigate()

    const name = useDisplayName()
    const today = new Date()
    const todayKey = format(today, 'yyyy-MM-dd')

    // Real per-task activity: the set of "<taskId>|<localDay>" keys for which a
    // (non-break) focus session exists. This replaces the previous hash-of-id
    // fabrication so streaks/consistency/dots reflect actual work.
    const activityKeys = useMemo(() => {
        const set = new Set<string>()
        for (const s of sessions as any[]) {
            if (!s.task_id || !s.start_time || isBreakType(s.session_type)) continue
            set.add(`${s.task_id}|${format(new Date(s.start_time), 'yyyy-MM-dd')}`)
        }
        return set
    }, [sessions])

    // Treat each active task as a "habit" so this works against the real store.
    const habits = useMemo(() => {
        const dayKeys = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), 'yyyy-MM-dd'))
        const valid = tasks.filter((t: any) =>
            !t.deleted_at && (!t.list_id || lists.some((l: any) => l.id === t.list_id)))
        return valid.map((t: any) => {
            const doneToday = t.status === 'done' &&
                (t.completed_at ? format(new Date(t.completed_at), 'yyyy-MM-dd') === todayKey : false)
            const list = t.list_id ? lists.find((l: any) => l.id === t.list_id) : null
            const ws = list ? workspaces.find((w: any) => w.id === list.workspace_id) : null
            // A day counts if real focus activity exists for this task that day;
            // today additionally counts if the task is marked done.
            const days = dayKeys.map((dk, i) =>
                activityKeys.has(`${t.id}|${dk}`) || (i === 6 && !!doneToday))
            return {
                id: t.id,
                title: t.title,
                doneToday: !!doneToday,
                wsName: ws?.name || 'Personal',
                wsColor: ws?.color || 'var(--accent-primary)',
                days,
                streak: currentStreak(days),
            }
        })
    }, [tasks, lists, workspaces, activityKeys, todayKey])

    const completedToday = habits.filter(h => h.doneToday).length
    const total = habits.length
    const pct = total ? Math.round((completedToday / total) * 100) : 0
    const focusStreak = calculateStreak(sessions)
    const bestStreak = habits.reduce((m, h) => Math.max(m, h.streak), 0)

    // 7-day completion rate for the consistency bar
    const weekRate = useMemo(() => {
        if (!habits.length) return Array(7).fill(0)
        const totals = Array(7).fill(0)
        habits.forEach(h => h.days.forEach((d, i) => { if (d) totals[i]++ }))
        return totals.map(c => Math.round((c / habits.length) * 100))
    }, [habits])

    const open = (h: any) => {
        setSelectedTask(h.id)
        const list = lists.find((l: any) => l.id === tasks.find((t: any) => t.id === h.id)?.list_id)
        setActiveWorkspace(list?.workspace_id || 'unassigned')
        setSelectedList(list?.id || 'inbox')
        navigate('/dashboard')
    }

    return (
        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar pb-24">
            <div className="w-full max-w-[1280px] mx-auto px-6 md:px-10 py-8">

                {/* ── Header ── */}
                <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2">
                            {format(today, 'EEEE, MMMM d')}
                        </p>
                        <h1 className="text-[28px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">
                            {getGreeting()}, {name}
                        </h1>
                        <p className="mt-2.5 text-[13.5px] text-[var(--text-tertiary)]">
                            {completedToday === total && total > 0
                                ? 'Every habit done today. Outstanding.'
                                : `${completedToday} of ${total} habits done — keep the momentum.`}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/planner')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-[var(--radius-pill)] font-semibold text-[13px] hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                        <Plus size={16} /> New habit
                    </button>
                </div>

                {/* ── Stat strip ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <StatCard
                        icon={<CalendarCheck size={16} />}
                        label="Done today"
                        value={`${completedToday}/${total}`}
                    />
                    <StatCard
                        icon={<Flame size={16} className="text-[var(--accent-primary)]" />}
                        label="Focus streak"
                        value={`${focusStreak}d`}
                    />
                    <StatCard
                        icon={<TrendingUp size={16} />}
                        label="Best streak"
                        value={`${bestStreak}d`}
                    />
                    <StatCard
                        icon={<Target size={16} />}
                        label="Consistency"
                        value={`${pct}%`}
                    />
                </div>

                {/* ── Main grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">

                    {/* Habit tracker */}
                    <Panel className="p-0 overflow-hidden">
                        <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Today's habits</h2>
                                <span className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                                    {total}
                                </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-[7px] pr-1">
                                {WEEK_LABELS.map((d, i) => (
                                    <span key={i} className="w-6 text-center text-[10px] font-semibold text-[var(--text-muted)]">{d}</span>
                                ))}
                            </div>
                        </div>

                        {habits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center gap-3 py-20 px-6">
                                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                                    <Target size={24} className="text-[var(--text-tertiary)]" />
                                </div>
                                <p className="text-sm text-[var(--text-tertiary)]">No habits yet. Add one to start building streaks.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-[var(--border-default)]">
                                {habits.map(h => (
                                    <li key={h.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-hover)] transition-colors">
                                        {/* Check toggle */}
                                        <button
                                            onClick={() => toggleComplete(h.id)}
                                            className={cn(
                                                'shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center border transition-all active:scale-90',
                                                h.doneToday
                                                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                    : 'border-[var(--border-hover)] hover:border-[var(--accent-primary)]'
                                            )}
                                            title={h.doneToday ? 'Done today' : 'Mark done'}
                                        >
                                            {h.doneToday && <Check size={13} strokeWidth={3} className="text-[var(--accent-contrast)]" />}
                                        </button>

                                        {/* Title + meta */}
                                        <button onClick={() => open(h)} className="flex-1 min-w-0 text-left">
                                            <span className={cn(
                                                'block text-[14px] font-medium truncate leading-tight',
                                                h.doneToday ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'
                                            )}>
                                                {h.title}
                                            </span>
                                            <span className="mt-1 flex items-center gap-2 text-[11.5px] text-[var(--text-tertiary)]">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: h.wsColor }} />
                                                    {h.wsName}
                                                </span>
                                                {h.streak > 0 && (
                                                    <span className="flex items-center gap-0.5 text-[var(--accent-primary)] font-semibold">
                                                        <Flame size={11} /> {h.streak}
                                                    </span>
                                                )}
                                            </span>
                                        </button>

                                        {/* Weekly dots */}
                                        <div className="hidden sm:flex items-center gap-[7px] shrink-0">
                                            {h.days.map((d, i) => (
                                                <span
                                                    key={i}
                                                    className={cn(
                                                        'w-6 h-6 rounded-[7px] flex items-center justify-center transition-colors',
                                                        d ? '' : 'bg-[var(--bg-tertiary)]'
                                                    )}
                                                    style={d ? { background: 'var(--accent-primary)' } : undefined}
                                                    title={format(subDays(today, 6 - i), 'EEE, MMM d')}
                                                >
                                                    {d && <Check size={11} strokeWidth={3} className="text-[var(--accent-contrast)]" />}
                                                </span>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    {/* Right rail */}
                    <div className="space-y-4">

                        {/* Completion ring */}
                        <Panel className="flex items-center gap-5">
                            <ProgressRing pct={pct} />
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Daily goal</p>
                                <p className="mt-1.5 text-[20px] font-semibold tracking-tight tabular-nums text-[var(--text-primary)] leading-none whitespace-nowrap">
                                    {completedToday}<span className="text-[var(--text-muted)] text-[15px]">/{total}</span>
                                </p>
                                <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                                    {total - completedToday > 0 ? `${total - completedToday} left today` : 'Goal reached'}
                                </p>
                            </div>
                        </Panel>

                        {/* This week consistency */}
                        <Panel className="p-0 overflow-hidden">
                            <div className="px-4 py-3.5 flex items-center justify-between border-b border-[var(--border-default)]">
                                <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">This week</h2>
                                <span className="text-xs text-[var(--text-tertiary)]">avg {Math.round(weekRate.reduce((a, b) => a + b, 0) / 7)}%</span>
                            </div>
                            <div className="px-4 py-4 flex items-end justify-between gap-2">
                                {weekRate.map((r, i) => {
                                    const isDay = i === 6
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                            <div className="w-full h-[72px] rounded-md bg-[var(--bg-tertiary)] flex items-end overflow-hidden">
                                                <div
                                                    className="w-full rounded-md transition-all"
                                                    style={{
                                                        height: `${Math.max(r, 6)}%`,
                                                        background: isDay ? 'var(--accent-primary)' : 'var(--border-hover)',
                                                    }}
                                                />
                                            </div>
                                            <span className={cn('text-[10px] font-semibold', isDay ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
                                                {WEEK_LABELS[i]}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </Panel>

                        {/* Categories (workspaces) */}
                        {workspaces.length > 0 && (
                            <Panel className="p-0 overflow-hidden">
                                <div className="px-4 py-3.5 flex items-center justify-between border-b border-[var(--border-default)]">
                                    <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Categories</h2>
                                    <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{workspaces.length}</span>
                                </div>
                                <div className="divide-y divide-[var(--border-default)]">
                                    {workspaces.map((ws: any) => {
                                        const listIds = new Set(lists.filter(l => l.workspace_id === ws.id).map(l => l.id))
                                        const wsHabits = habits.filter(h => {
                                            const t = tasks.find((x: any) => x.id === h.id)
                                            return t?.list_id && listIds.has(t.list_id)
                                        })
                                        const wsDone = wsHabits.filter(h => h.doneToday).length
                                        const p = wsHabits.length ? Math.round((wsDone / wsHabits.length) * 100) : 0
                                        return (
                                            <button
                                                key={ws.id}
                                                onClick={() => { setActiveWorkspace(ws.id); navigate('/dashboard') }}
                                                className="group w-full text-left px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ws.color }} />
                                                    <span className="flex-1 min-w-0 text-[13px] font-semibold text-[var(--text-primary)] truncate">{ws.name}</span>
                                                    <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums shrink-0">{wsDone}/{wsHabits.length}</span>
                                                    <ArrowUpRight size={13} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                                                </div>
                                                <div className="mt-2.5 h-1.5 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: ws.color }} />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </Panel>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                {icon}
                <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <p className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums text-[var(--text-primary)] leading-none">{value}</p>
        </div>
    )
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-[var(--radius-tile)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[0_1px_2px_rgba(60,54,42,0.05),0_10px_30px_-18px_rgba(60,54,42,0.18)] p-5 ${className || ''}`}>
            {children}
        </div>
    )
}

function ProgressRing({ pct }: { pct: number }) {
    return (
        <div
            className="relative w-[72px] h-[72px] shrink-0 rounded-full"
            style={{ background: `conic-gradient(var(--accent-primary) ${pct * 3.6}deg, var(--bg-tertiary) 0deg)` }}
        >
            <div className="absolute inset-[6px] rounded-full bg-[var(--bg-card)] flex items-center justify-center">
                <span className="text-[16px] font-semibold tabular-nums text-[var(--text-primary)]">{pct}%</span>
            </div>
        </div>
    )
}
