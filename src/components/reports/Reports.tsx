import { useReportsController } from './hooks/useReportsController'
import { ReportsHeader } from './components/ReportsHeader'
import { FocusTimeReport } from './components/FocusTimeReport'
import { Clock, Activity, Flame, Box } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useNavigate } from 'react-router-dom'

export function Reports() {
    const navigate = useNavigate()
    const {
        stats,
        dateRange,
        setDateRange,
        timelineItems
    } = useReportsController()

    return (
        <div className="h-full bg-[#050505] p-6 md:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto">

                <ReportsHeader
                    navigate={navigate}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                />

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Total Focus"
                        value={stats.periodFocus}
                        subLabel={stats.periodLabel}
                        icon={<Clock size={16} />}
                        trend={stats.trend.percentage}
                    />
                    <StatCard
                        label="Deep Work"
                        value={`${stats.deepWorkHours}h`}
                        subLabel="High Quality Focus"
                        icon={<Activity size={16} />}
                        color="indigo"
                    />
                    <StatCard
                        label="Current Streak"
                        value={String(stats.currentStreak)}
                        subLabel="Consecutive Days"
                        icon={<Flame size={16} />}
                        color="orange"
                    />
                    <StatCard
                        label="Total Sessions"
                        value={String(timelineItems.length)}
                        subLabel="In Selected Range"
                        icon={<Box size={16} />}
                        color="zinc"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Chart Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Daily Activity Chart */}
                        <div className="bg-[#09090b] border border-white/5 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Activity Trend</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                        <XAxis
                                            dataKey="day"
                                            stroke="#52525b"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#52525b"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${Math.round(value / 60)}h`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            contentStyle={{
                                                backgroundColor: '#09090b',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                            }}
                                            itemStyle={{ fontSize: '12px', color: '#e4e4e7', fontFamily: 'monospace' }}
                                            labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                            formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Focus Time']}
                                        />
                                        <Bar
                                            dataKey="minutes"
                                            fill="#6366f1"
                                            radius={[2, 2, 0, 0]}
                                            maxBarSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <FocusTimeReport stats={stats} />
                    </div>

                    {/* Sidebar Column: Session Log */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Activity size={14} />
                            Session Log
                        </h3>

                        <div className="bg-[#09090b] border border-white/5 rounded-xl overflow-hidden min-h-[500px]">
                            {timelineItems.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-zinc-700">
                                    <Clock size={32} className="mb-3 opacity-20" />
                                    <p className="text-xs font-medium">No sessions recorded</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {timelineItems.map((item: any) => (
                                        <div key={item.id} className="p-4 hover:bg-white/[0.02] transition-colors group">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="text-xs font-mono text-zinc-500">
                                                    {item.startTime}
                                                </div>
                                                <div className={`text-xs font-mono font-bold ${item.type === 'break' ? 'text-blue-400' : 'text-emerald-400'}`}>
                                                    {item.duration}
                                                </div>
                                            </div>
                                            <div className="font-medium text-zinc-300 text-sm group-hover:text-white transition-colors">
                                                {item.title}
                                            </div>
                                            {item.notes && (
                                                <div className="mt-2 text-xs text-zinc-500 italic bg-white/[0.02] p-2 rounded">
                                                    "{item.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, subLabel, icon, trend, color = 'indigo' }: any) {
    // Minimalist color handling
    return (
        <div className="bg-[#09090b] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
                <div className={`opacity-50 ${getColorText(color)}`}>{icon}</div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-zinc-100">{value}</span>
                {trend !== undefined && (
                    <span className={`text-xs font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <div className="mt-1 text-xs text-zinc-600 font-medium">
                {subLabel}
            </div>
        </div>
    )
}

function getColorText(color: string) {
    if (color === 'orange') return 'text-orange-500'
    if (color === 'emerald') return 'text-emerald-500'
    if (color === 'blue') return 'text-blue-500'
    return 'text-indigo-500'
}
