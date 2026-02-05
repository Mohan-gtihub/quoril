import { useMemo, useEffect } from 'react'
import { useFocusStore } from '@/store/focusStore'
import { useTaskStore } from '@/store/taskStore'
import { useListStore } from '@/store/listStore'
import { format, subDays, isSameDay, parseISO, startOfDay, getHours, getDay } from 'date-fns'
import { useNavigate } from 'react-router-dom'

// @ts-ignore
import * as Recharts from 'recharts'
// @ts-ignore
import * as Lucide from 'lucide-react'

const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } = Recharts
const { CheckCircle2, Zap, ChevronLeft, MoreHorizontal, Search, LayoutGrid, Settings, HelpCircle } = Lucide

export function Reports() {
    const navigate = useNavigate()
    const { sessions, fetchSessions } = useFocusStore()
    const { tasks, fetchTasks } = useTaskStore()
    const { lists, fetchLists } = useListStore()

    useEffect(() => {
        fetchSessions()
        fetchTasks()
        fetchLists()
    }, [fetchSessions, fetchTasks, fetchLists])

    const stats = useMemo(() => {
        // Filter out ghosted (deleted) tasks
        const activeTasks = tasks.filter(t => !t.deleted_at)
        const doneTasks = activeTasks.filter(t => t.status === 'done')

        // 1. Weekly Activity Logic (matching the screenshot's 3-bar style)
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const date = subDays(startOfDay(new Date()), 13 - i)
            return {
                date,
                label: format(date, 'eee dd, MMM'),
                tasks: 0, // Focus minutes
                breaks: 0, // Break minutes
                total: 0 // Sum
            }
        })

        let totalFocusSeconds = 0
        let totalBreakSeconds = 0
        const workDaysSet = new Set<string>()

        // Productive bins
        const hourBins = new Array(24).fill(0)
        const dayBins = new Array(7).fill(0)
        const monthBins: Record<string, number> = {}

        sessions.forEach(s => {
            const start = parseISO(s.start_time)
            const duration = s.seconds || 0
            const dayStr = format(start, 'yyyy-MM-dd')

            // Weekly Chart Data
            const daySlot = last14Days.find(d => isSameDay(d.date, start))
            if (daySlot) {
                if (s.type === 'break') {
                    daySlot.breaks += Math.round(duration / 60)
                } else {
                    daySlot.tasks += Math.round(duration / 60)
                }
                daySlot.total = daySlot.tasks + daySlot.breaks
            }

            if (s.type !== 'break') {
                totalFocusSeconds += duration
                workDaysSet.add(dayStr)

                // Hour binning
                hourBins[getHours(start)] += duration
                // Day binning
                dayBins[getDay(start)] += duration
                // Month binning
                const monthStr = format(start, "MMM 'yy")
                monthBins[monthStr] = (monthBins[monthStr] || 0) + duration
            } else {
                totalBreakSeconds += duration
            }
        })

        // Best Hour
        let bestHourIdx = 0
        for (let i = 1; i < 24; i++) {
            if (hourBins[i] > hourBins[bestHourIdx]) bestHourIdx = i
        }
        const hourLabel = `${bestHourIdx % 12 || 12}-${(bestHourIdx + 1) % 12 || 12} ${bestHourIdx >= 12 ? 'PM' : 'AM'}`

        // Best Day
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        let bestDayIdx = 0
        for (let i = 1; i < 7; i++) {
            if (dayBins[i] > dayBins[bestDayIdx]) bestDayIdx = i
        }

        // Best Month
        let bestMonth = "N/A"
        let maxMonthSec = 0
        Object.entries(monthBins).forEach(([m, sec]) => {
            if (sec > maxMonthSec) {
                maxMonthSec = sec
                bestMonth = m
            }
        })

        // Time By List
        const listData = lists.map(list => {
            const listSeconds = sessions
                .filter(s => {
                    const task = activeTasks.find(t => t.id === s.task_id)
                    return task?.list_id === list.id && s.type !== 'break'
                })
                .reduce((acc, s) => acc + (s.seconds || 0), 0)

            return {
                id: list.id,
                name: list.name,
                color: list.color,
                seconds: listSeconds,
                minutes: Math.round(listSeconds / 60)
            }
        }).filter(l => l.seconds > 0).sort((a, b) => b.seconds - a.seconds)

        // Done Tasks grouped by date
        const doneTasksByDate: Record<string, typeof doneTasks> = {}
        doneTasks.forEach(t => {
            if (t.completed_at) {
                const d = format(parseISO(t.completed_at), 'dd MMM, yy')
                if (!doneTasksByDate[d]) doneTasksByDate[d] = []
                doneTasksByDate[d].push(t)
            }
        })

        return {
            totalWorkDays: workDaysSet.size,
            totalTasksDone: doneTasks.length,
            totalTimeWorkedDisplay: `${Math.floor(totalFocusSeconds / 3600)}hr ${Math.floor((totalFocusSeconds % 3600) / 60)}min`,
            avgTimePerTask: doneTasks.length > 0 ? `${Math.round((totalFocusSeconds / doneTasks.length) / 60)}min` : '0min',
            weeklyActivity: last14Days,
            mostProductiveHour: hourLabel,
            mostProductiveDay: daysOfWeek[bestDayIdx],
            mostProductiveMonth: bestMonth,
            listData,
            totalTimeAcrossListsMins: listData.reduce((acc, l) => acc + l.minutes, 0),
            doneTasksByDate: Object.entries(doneTasksByDate).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
        }
    }, [sessions, tasks, lists])

    return (
        <div className="h-full overflow-auto bg-[#0a0a0a] text-white custom-scrollbar select-none">
            {/* Header / Top Bar */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-white transition uppercase tracking-widest"
                    >
                        <ChevronLeft size={14} /> Back
                    </button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Quoril Analytics</h1>
                        <p className="text-xs text-white/40 font-medium mt-1">Measuring your deep work frontiers.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-xs font-bold hover:from-purple-500 hover:to-blue-500 transition flex items-center gap-2 shadow-lg">
                        <Zap size={14} className="fill-white" />
                        Upgrade Now
                    </button>
                    <div className="flex items-center gap-4 text-white/40">
                        <Search size={18} className="hover:text-white transition cursor-pointer" />
                        <LayoutGrid size={18} className="hover:text-white transition cursor-pointer" />
                        <Settings size={18} className="hover:text-white transition cursor-pointer" />
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[11px] font-black text-white border-2 border-white/20 shadow-lg">
                            M
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8 max-w-[1600px] mx-auto">

                {/* Top Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <SimpleStatCard title="Total work days" value={stats.totalWorkDays} />
                    <SimpleStatCard title="Total tasks done" value={stats.totalTasksDone} />
                    <SimpleStatCard title="Total time worked" value={stats.totalTimeWorkedDisplay} />
                    <SimpleStatCard title="Avg. Time per task" value={stats.avgTimePerTask} />
                </div>

                {/* Main Bar Chart */}
                <div className="bg-[#0f0f0f] border border-white/[0.08] rounded-2xl p-8 shadow-2xl relative">
                    <div className="flex items-center justify-between mb-8">
                        {/* Fake Filter UI from screenshot */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm bg-[#6366f1]"></span>
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tasks</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm bg-[#10b981]"></span>
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Breaks</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm bg-[#fbbf24]"></span>
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total</span>
                            </div>
                        </div>
                        <button className="p-2 text-white/40 hover:text-white transition">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>

                    <div className="h-[400px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.weeklyActivity} barGap={2}>
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 'bold' }}
                                    interval={1}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '12px' }}
                                />
                                <Bar dataKey="tasks" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                                <Bar dataKey="breaks" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                                <Bar dataKey="total" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Productive Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SimpleStatCard title="Most Productive hour" value={stats.mostProductiveHour} />
                    <SimpleStatCard title="Most Productive day" value={stats.mostProductiveDay} />
                    <SimpleStatCard title="Most Productive month" value={stats.mostProductiveMonth} />
                </div>

                {/* Bottom Row: Time By List and Done Tasks */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-20">

                    {/* Time By List */}
                    <div className="bg-[#111111] border border-white/[0.05] rounded-xl p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Time By List</h3>
                            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                {stats.listData.length} Lists, Total Time : {Math.floor(stats.totalTimeAcrossListsMins / 60)}hr {stats.totalTimeAcrossListsMins % 60}min
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-12 flex-1">
                            <div className="w-48 h-48 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.listData}
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={4}
                                            dataKey="seconds"
                                            stroke="none"
                                        >
                                            {stats.listData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex-1 w-full space-y-4">
                                {stats.listData.map((list) => {
                                    const percentage = stats.totalTimeAcrossListsMins > 0
                                        ? Math.round((list.minutes / stats.totalTimeAcrossListsMins) * 100)
                                        : 0
                                    return (
                                        <div key={list.id} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }}></div>
                                                <span className="text-xs font-bold text-white/80 group-hover:text-white transition truncate max-w-[150px]">{list.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-mono font-bold">
                                                <span className="text-white/40">{Math.floor(list.minutes / 60)}hr {list.minutes % 60}min</span>
                                                <span className="text-white/80 w-8 text-right">{percentage}%</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Done Tasks Timeline */}
                    <div className="bg-[#111111] border border-white/[0.05] rounded-xl p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Done Tasks</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Completed</span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-8 overflow-auto custom-scrollbar pr-2 max-h-[400px]">
                            {stats.doneTasksByDate.length > 0 ? stats.doneTasksByDate.map(([date, tasks]) => (
                                <div key={date} className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{date}</span>
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {tasks.map(t => (
                                            <div key={t.id} className="flex items-center justify-between group px-2 py-1 rounded-lg hover:bg-white/[0.02] transition">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded border border-emerald-500/50 flex items-center justify-center">
                                                        <CheckCircle2 size={10} className="text-emerald-500" />
                                                    </div>
                                                    <span className="text-xs font-medium text-white/60 group-hover:text-white transition">{t.title}</span>
                                                </div>
                                                {t.completed_at && (
                                                    <span className="text-[9px] font-mono font-bold text-white/20">{format(parseISO(t.completed_at), 'HH:mm')}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-white/10 space-y-4 opacity-40">
                                    <CheckCircle2 size={32} strokeWidth={1} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">No completed tasks recorded</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Utility Icons mockup */}
                <div className="fixed bottom-4 right-4 flex items-center gap-2 pointer-events-none opacity-50">
                    <div className="w-8 h-8 rounded-lg bg-[#18181b] border border-white/10 flex items-center justify-center text-white/40">
                        <HelpCircle size={14} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function SimpleStatCard({ title, value }: { title: string, value: string | number }) {
    return (
        <div className="bg-[#111111] border border-white/[0.05] rounded-xl p-5 shadow-lg group hover:bg-white/[0.01] transition-colors">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">{title}</p>
            <p className="text-2xl font-black text-white tracking-tight">{value}</p>
        </div>
    )
}
