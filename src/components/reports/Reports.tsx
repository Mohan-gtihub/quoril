import { useState, useEffect } from 'react'
import { useReportsController } from './hooks/useReportsController'
import { ReportCalendar } from './components/ReportCalendar'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart3, Clock, CheckCircle2, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function Reports() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day')

    const {
        stats,
        setDateRange,
        loading
    } = useReportsController()

    // Update date range when selection changes
    useEffect(() => {
        if (viewMode === 'day') {
            setDateRange({
                start: startOfDay(selectedDate),
                end: endOfDay(selectedDate),
                label: format(selectedDate, 'MMM dd, yyyy')
            })
        } else {
            setDateRange({
                start: startOfMonth(selectedDate),
                end: endOfMonth(selectedDate),
                label: format(selectedDate, 'MMMM yyyy')
            })
        }
    }, [selectedDate, viewMode, setDateRange])

    const handleSelectDate = (date: Date) => {
        setSelectedDate(date)
        setViewMode('day')
    }

    const handleSelectMonth = (date: Date) => {
        setSelectedDate(date)
        setViewMode('month')
    }

    // Get stats for display
    // For Day View: stats.chartData[0] (should correspond to the selected day)
    // For Month View: stats.chartData (array of days)
    const currentStats = viewMode === 'day'
        ? (stats.chartData && stats.chartData.length > 0 ? stats.chartData[0] : null)
        : null

    const totalFocusMinutes = viewMode === 'month'
        ? (stats.chartData || []).reduce((acc, d) => acc + (d.focusMinutes || 0), 0)
        : (currentStats?.focusMinutes || 0)

    const totalTasksCompleted = viewMode === 'month'
        ? (stats.chartData || []).reduce((acc, d) => acc + (d.tasksCompleted || 0), 0)
        : (currentStats?.tasksCompleted || 0)

    // Timeline items for the selected day
    const dayTimeline = viewMode === 'day' && stats.timelineData
        ? stats.timelineData.find(d => d.date === format(selectedDate, 'yyyy-MM-dd'))
        : null

    const timelineItems = dayTimeline ? dayTimeline.items : []

    return (
        <div className="h-full bg-[#050505] p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT SIDEBAR - CALENDAR */}
                <div className="lg:col-span-4 space-y-6">
                    <div>
                        <h1 className="text-2xl font-black text-white mb-1">Reports</h1>
                        <p className="text-white/40 text-sm font-medium">
                            {viewMode === 'day' ? 'Daily Intelligence' : 'Monthly Analysis'}
                        </p>
                    </div>

                    <ReportCalendar
                        selectedDate={selectedDate}
                        onSelectDate={handleSelectDate}
                        onSelectMonth={handleSelectMonth}
                        selectionType={viewMode}
                    />

                    {/* Quick Stats Summary for Sidebar */}
                    <div className="bg-[#0b0e14] border border-white/5 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Efficiency</span>
                            <span className="text-xl font-mono font-bold text-indigo-400">{stats.efficiencyScore || 0}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                style={{ width: `${stats.efficiencyScore || 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Header Card */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0b0e14] border border-white/5 rounded-2xl p-6 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40 shrink-0">
                                {viewMode === 'day' ? <Zap size={24} /> : <BarChart3 size={24} />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {viewMode === 'day'
                                        ? format(selectedDate, 'eeee, MMMM do, yyyy')
                                        : format(selectedDate, 'MMMM yyyy')
                                    }
                                </h2>
                                <p className="text-xs font-bold text-white/30 uppercase tracking-widest">
                                    {loading ? 'Synchronizing...' : (viewMode === 'day' ? 'Daily Overview' : 'Monthly Overview')}
                                </p>
                            </div>
                        </div>

                        <div className="text-left sm:text-right">
                            <div className="text-2xl font-mono font-bold text-white whitespace-nowrap">
                                {Math.floor(totalFocusMinutes / 60)}<span className="text-sm text-white/30 ml-1">h</span>
                                {' '}
                                {totalFocusMinutes % 60}<span className="text-sm text-white/30 ml-1">m</span>
                            </div>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Focus Time</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <StatCard
                            label="Tasks Completed"
                            value={totalTasksCompleted}
                            icon={<CheckCircle2 size={18} />}
                            color="emerald"
                        />
                        <StatCard
                            label="Focus Sessions"
                            value={viewMode === 'day'
                                ? timelineItems.length
                                : (stats.timelineData || []).reduce((acc: number, g: any) => acc + g.items.length, 0)
                            }
                            icon={<Zap size={18} />}
                            color="amber"
                        />
                        <StatCard
                            label="Break Time"
                            value={`${currentStats?.breakHours || 0}h`}
                            icon={<Clock size={18} />}
                            color="blue"
                        />
                    </div>

                    {/* Chart / Log Area */}
                    <div className="bg-[#0b0e14] border border-white/5 rounded-2xl p-6 min-h-[400px]">
                        {viewMode === 'month' ? (
                            <div className="h-[350px] w-full">
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-6">Daily Breakdown</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            stroke="#ffffff30"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            interval={viewMode === 'month' ? 2 : 0}
                                        />
                                        <YAxis
                                            stroke="#ffffff30"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${Math.round(value / 60)}h`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#111',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px'
                                            }}
                                            itemStyle={{ fontSize: '12px', color: '#fff' }}
                                            labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                                            formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Focus Time']}
                                        />
                                        <Bar
                                            dataKey="focusMinutes"
                                            fill="#6366f1"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-6">Session Log</h3>
                                {timelineItems.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-white/20">
                                        <Clock size={48} className="mb-4 opacity-20" />
                                        <p className="text-sm font-medium">No activity recorded for this day.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {timelineItems.map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'break' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                                    <div>
                                                        <div className="text-sm font-bold text-white/80">
                                                            {item.type === 'break' ? 'Break Session' : 'Focus Session'}
                                                        </div>
                                                        <div className="text-[10px] text-white/40 font-mono mt-1">
                                                            {format(new Date(item.start_time), 'hh:mm a')} - {item.end_time ? format(new Date(item.end_time), 'hh:mm a') : 'Now'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-mono font-bold text-white">
                                                        {Math.floor(item.seconds / 60)}m {item.seconds % 60}s
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {

    // Simple color mapping
    const getColors = (c: string) => {
        switch (c) {
            case 'indigo': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
            case 'emerald': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            case 'amber': return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            case 'blue': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
            default: return 'text-white bg-white/10 border-white/20'
        }
    }

    const colorClasses = getColors(color)
    const textColor = colorClasses.split(' ')[0]
    const iconBg = colorClasses.split(' ').slice(0, 2).join(' ')

    return (
        <div className={`p-5 rounded-2xl border ${colorClasses.split(' ')[2].replace('border-', 'border-')} bg-[#0b0e14]`}>
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${iconBg}`}>
                    {icon}
                </div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-2xl font-mono font-bold ${textColor}`}>
                {value}
            </div>
        </div>
    )
}
