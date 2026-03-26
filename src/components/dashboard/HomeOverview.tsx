import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTaskStore } from '@/store/taskStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useFocusStore } from '@/store/focusStore'
import { useAuthStore } from '@/store/authStore'
import { useListStore } from '@/store/listStore'
import { CheckCircle2, Target, Zap, FolderKanban, ChevronRight, Activity, Plus, Play, BarChart3, Flame } from 'lucide-react'
import { isToday, startOfWeek, format } from 'date-fns'
import { ActivityHeatmap } from './ActivityHeatmap'
import { calculateRealTimeFocus, calculateStreak, isFocusType } from '@/utils/timeCalculations'

const P_INFO: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: '#ef4444' },
    high: { label: 'High', color: '#f97316' },
}

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

    // --- Dynamic KPI Calculations ---
    const stats = useMemo(() => {
        const validTasks = tasks.filter((t: any) => !t.deleted_at && (!t.list_id || lists.some((l: any) => l.id === t.list_id)))
        const active = validTasks.filter((t: any) => t.status !== 'done')
        const doneToday = validTasks.filter((t: any) => t.status === 'done' && t.completed_at?.startsWith(new Date().toISOString().split('T')[0]))
        const focusMin = Math.round(calculateRealTimeFocus(sessions, isActive, startTime, sessionType) / 60)

        // Calculate weekly total
        const startOfCurWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
        let weeklyMins = 0
        sessions.forEach(s => {
            if (isFocusType(s.type) && s.start_time && new Date(s.start_time) >= startOfCurWeek) {
                weeklyMins += (s.seconds || 0) / 60
            }
        })
        const delta = (isActive && isFocusType(sessionType) && startTime) ? Math.floor((Date.now() - startTime) / 1000) : 0
        const currentMins = delta / 60
        weeklyMins += currentMins

        // Current streak logic (using centralized util)
        const currentStreak = calculateStreak(sessions)

        return { active: active.length, doneToday: doneToday.length, focusMin, weeklyMins: Math.round(weeklyMins), currentStreak }
    }, [tasks, startTime, sessions, lists, isActive, sessionType])

    const suggestedTasks = useMemo(() => {
        const pending = tasks.filter((t: any) => !t.deleted_at && t.status !== 'done' && (!t.list_id || lists.some((l: any) => l.id === t.list_id)))

        let priorityTasks = pending
            .filter((t: any) => ['critical', 'high'].includes(t.priority) || (t.due_date && isToday(new Date(t.due_date))))
            .sort((a: any, b: any) => {
                const weights: any = { critical: 3, high: 2, medium: 1, low: 0 }
                return (weights[b.priority] || 0) - (weights[a.priority] || 0)
            })

        if (priorityTasks.length < 5) {
            const addedIds = new Set(priorityTasks.map((t: any) => t.id))
            const otherTasks = pending
                .filter((t: any) => !addedIds.has(t.id))
                .sort((a: any, b: any) => {
                    const weights: any = { critical: 3, high: 2, medium: 1, low: 0, none: 0 }
                    return (weights[b.priority] || 0) - (weights[a.priority] || 0)
                })

            priorityTasks = [...priorityTasks, ...otherTasks]
        }

        return priorityTasks.slice(0, 5)
    }, [tasks, lists])

    return (
        <div className="flex-1 overflow-y-auto w-full h-full p-8 max-w-[1400px] mx-auto space-y-8 custom-scrollbar pb-24 relative overflow-x-hidden">

            {/* Top background glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

            {/* Smart Header + Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <h1 className="text-[28px] font-black tracking-tight text-[var(--text-primary)]">
                        {getGreeting()}, {user?.email?.split('@')[0] || 'User'}.
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)] font-medium">
                        <p>You've focused <strong className="text-emerald-400">{fmtMin(stats.weeklyMins)}</strong> this week.</p>
                        <span className="hidden sm:block w-1 h-1 rounded-full bg-[var(--border-default)]" />
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                            <Flame size={12} className={stats.currentStreak > 0 ? "animate-pulse" : ""} />
                            Streak: {stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}
                        </span>
                        <span className="hidden sm:block w-1 h-1 rounded-full bg-[var(--border-default)]" />
                        <p>{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                    </div>
                </motion.div>

                {/* ── QUICK ACTION BAR ── */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowFocusPanel(true)}
                        className="group relative flex items-center gap-2 px-5 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl font-bold text-sm shadow-[0_4px_15px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Play size={14} className="fill-current relative z-10" />
                        <span className="relative z-10">Start Focus</span>
                    </button>
                    <button
                        onClick={() => {
                            setSelectedList('all')
                            navigate('/planner')
                        }}
                        className="flex items-center gap-2 px-5 py-3 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm"
                    >
                        <Plus size={16} /> Plan Day
                    </button>
                    <button
                        onClick={() => navigate('/reports')}
                        className="flex items-center gap-2 px-5 py-3 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm"
                    >
                        <BarChart3 size={16} /> Analytics
                    </button>
                </div>
            </div>

            {/* Main 2-Column Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* LEFT COLUMN: KPIs & Heatmap */}
                <div className="xl:col-span-7 space-y-8">

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Dominant Focus Card */}
                        <motion.div whileHover={{ scale: 1.01 }} className="group relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-8 overflow-hidden transition-all duration-500 hover:border-blue-500/30 hover:shadow-[0_8px_30px_rgba(59,130,246,0.1)] shadow-sm">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 blur-[60px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700 pointer-events-none" />

                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-blue-400 font-bold tracking-wider text-xs uppercase">
                                        <Zap size={14} className={isActive ? "animate-pulse shadow-blue-500/50" : ""} /> Daily Focus
                                    </div>
                                    <div>
                                        <h2 className="text-5xl font-black text-[var(--text-primary)] tabular-nums tracking-tight">
                                            {fmtMin(stats.focusMin).replace('h', 'h ').replace('m', 'm')}
                                        </h2>
                                        <p className="text-[13px] text-[var(--text-muted)] mt-2 font-medium">
                                            {isActive ? (
                                                <span className="text-blue-400 animate-pulse">Session active right now...</span>
                                            ) : (
                                                <span>Total focus time recorded today</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Circular Progress */}
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="w-full h-full origin-center -rotate-90 transform" viewBox="0 0 100 100">
                                        <circle className="text-[var(--border-default)] stroke-current" strokeWidth="6" cx="50" cy="50" r="40" fill="transparent" />
                                        <motion.circle
                                            initial={{ strokeDashoffset: 251.2 }}
                                            animate={{ strokeDashoffset: Math.max(0, 251.2 - (251.2 * (Math.min(stats.focusMin, 180) / 180))) }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="text-blue-500 stroke-current drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                            strokeWidth="6" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent"
                                            strokeDasharray="251.2"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-lg font-black text-[var(--text-primary)]">{Math.round(Math.min(stats.focusMin, 180) / 180 * 100)}%</span>
                                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">of 3h goal</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. Secondary Tasks KPIs */}
                        <div className="flex flex-col gap-6">
                            <motion.div whileHover={{ scale: 1.02 }} className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 flex flex-col justify-center relative overflow-hidden transition-all hover:border-emerald-500/30 hover:shadow-[0_8px_20px_rgba(16,185,129,0.05)]">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 size={12} /> Completed</p>
                                        <h3 className="text-3xl font-black text-[var(--text-primary)]">{stats.doneToday}</h3>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
                                        <CheckCircle2 size={18} />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.02 }} className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 flex flex-col justify-center relative overflow-hidden transition-all hover:border-indigo-500/30 hover:shadow-[0_8px_20px_rgba(99,102,241,0.05)]">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5"><Target size={12} /> Active</p>
                                        <h3 className="text-3xl font-black text-[var(--text-primary)]">{stats.active}</h3>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                                        <Target size={18} />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Heatmap */}
                    <ActivityHeatmap />
                </div>

                {/* RIGHT COLUMN: Up Next & Workspaces */}
                <div className="xl:col-span-5 space-y-8">

                    {/* Suggested Tasks */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                            <h2 className="text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Up Next</h2>
                        </div>
                        {suggestedTasks.length === 0 ? (
                            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-1">
                                    <CheckCircle2 size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">You're clear for now.</h3>
                                    <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-[200px] mb-4">No critical or due tasks right now. Great time for deep work.</p>
                                </div>
                                <button
                                    onClick={() => setShowFocusPanel(true)}
                                    className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-white/90 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2"
                                >
                                    <Play size={12} className="fill-current" /> Start Focus Session
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {suggestedTasks.map(t => (
                                    <motion.div key={t.id} whileHover={{ scale: 1.01 }}
                                        className="bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-xl p-3 flex items-start gap-3 transition-colors cursor-pointer"
                                        onClick={() => {
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
                                            // Optionally, if they want the focus panel to pop open when they click the task:
                                            // setShowFocusPanel(true)
                                        }}
                                    >
                                        <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-[var(--text-muted)] opacity-50 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {t.list_id && (
                                                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded">List Item</span>
                                                )}
                                                {P_INFO[t.priority] && (
                                                    <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: P_INFO[t.priority].color }}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current" /> {P_INFO[t.priority].label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Workspaces */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <FolderKanban className="w-4 h-4 text-[var(--text-muted)]" />
                            <h2 className="text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Workspaces</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                            {workspaces.map((ws: any) => {
                                // Calculate Workspace Stats
                                const wsLists = lists.filter(l => l.workspace_id === ws.id)
                                const listIds = new Set(wsLists.map(l => l.id))
                                const wsTasks = tasks.filter(t => !t.deleted_at && t.list_id && listIds.has(t.list_id))
                                const wsDone = wsTasks.filter(t => t.status === 'done')
                                const wsTimeMin = wsTasks.reduce((acc, t) => acc + Math.round((t.spent_s || 0) / 60), 0)

                                return (
                                    <motion.button
                                        key={ws.id}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => { setActiveWorkspace(ws.id); navigate('/dashboard') }}
                                        className="bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] rounded-2xl p-5 flex flex-col items-start gap-4 transition-all text-left relative overflow-hidden group"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-[0.03] blur-xl transition-opacity group-hover:opacity-10" style={{ backgroundColor: ws.color }} />

                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0"
                                                style={{ background: `linear-gradient(135deg, ${ws.color}, ${ws.color}bb)` }}>
                                                {ws.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-[var(--text-primary)] truncate text-sm">{ws.name}</h3>
                                                <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5 group-hover:text-[var(--text-primary)] transition-colors font-medium">
                                                    Open Workspace <ChevronRight size={10} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full grid grid-cols-2 gap-2 mt-1">
                                            <div className="bg-[var(--bg-hover)] rounded-lg p-2 flex flex-col gap-1 border border-white/[0.02]">
                                                <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Tasks Done</span>
                                                <span className="text-xs font-semibold text-[var(--text-primary)]">{wsDone.length} / {wsTasks.length}</span>
                                            </div>
                                            <div className="bg-[var(--bg-hover)] rounded-lg p-2 flex flex-col gap-1 border border-white/[0.02]">
                                                <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-muted)]">Focus Time</span>
                                                <span className="text-xs font-semibold text-[var(--text-primary)]">{fmtMin(wsTimeMin)}</span>
                                            </div>
                                        </div>
                                    </motion.button>
                                )
                            })}
                            {workspaces.length === 0 && (
                                <div className="col-span-1 sm:col-span-2 lg:col-span-1 bg-[var(--bg-card)] border border-[var(--border-default)] border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3">
                                    <FolderKanban size={24} className="text-[var(--text-muted)] opacity-50" />
                                    <div>
                                        <h3 className="text-sm font-bold text-[var(--text-primary)]">No workspaces</h3>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">Create one from the sidebar to organize lists.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
