import { BarChart3, Calendar, Clock, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import type { ProductivityTrends } from '../types/reports.types'

interface ProductivityTrendsReportProps {
    stats: ProductivityTrends
}

export function ProductivityTrendsReport({ stats }: ProductivityTrendsReportProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/60 flex items-center gap-3">
                <TrendingUp className="w-4 h-4" />
                Productivity Trends
            </h2>

            {/* Weekly Graph */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Weekly Progress (Last 4 Weeks)
                </h3>

                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis
                            dataKey="label"
                            stroke="#ffffff40"
                            fontSize={11}
                            fontFamily="monospace"
                        />
                        <YAxis
                            stroke="#ffffff40"
                            fontSize={11}
                            fontFamily="monospace"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '12px'
                            }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                        <Bar
                            dataKey="focusMinutes"
                            fill="#6366f1"
                            name="Focus Minutes"
                            radius={[8, 8, 0, 0]}
                        />
                        <Bar
                            dataKey="tasksCompleted"
                            fill="#10b981"
                            name="Tasks Completed"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Monthly Graph */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Monthly Trends (Last 6 Months)
                </h3>

                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis
                            dataKey="label"
                            stroke="#ffffff40"
                            fontSize={11}
                            fontFamily="monospace"
                        />
                        <YAxis
                            stroke="#ffffff40"
                            fontSize={11}
                            fontFamily="monospace"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '12px'
                            }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                        <Line
                            type="monotone"
                            dataKey="focusMinutes"
                            stroke="#6366f1"
                            strokeWidth={3}
                            name="Focus Minutes"
                            dot={{ fill: '#6366f1', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="tasksCompleted"
                            stroke="#10b981"
                            strokeWidth={3}
                            name="Tasks Completed"
                            dot={{ fill: '#10b981', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Focus Distribution by Day */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-6">
                        Focus Distribution by Day
                    </h3>

                    <div className="space-y-3">
                        {stats.focusDistributionByDay.map((day) => {
                            const maxMinutes = Math.max(...stats.focusDistributionByDay.map(d => d.avgMinutes), 1)
                            const widthPercent = (day.avgMinutes / maxMinutes) * 100

                            return (
                                <div key={day.day} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-white/60 font-medium w-12">
                                            {day.day}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-indigo-400 tabular-nums">
                                            {day.avgMinutes}m
                                        </span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                            style={{ width: `${widthPercent}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Most Productive Time of Day */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Most Productive Hours
                    </h3>

                    {stats.mostProductiveTimeOfDay.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-sm text-white/30">No data available yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.mostProductiveTimeOfDay.map((time, index) => {
                                const maxMinutes = stats.mostProductiveTimeOfDay[0]?.avgMinutes || 1
                                const widthPercent = (time.avgMinutes / maxMinutes) * 100

                                return (
                                    <div key={time.hour} className="group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-white/30 tabular-nums w-6">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-sm text-white/60 font-mono">
                                                    {time.label}
                                                </span>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                                                {time.avgMinutes}m avg
                                            </span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                                                style={{ width: `${widthPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
