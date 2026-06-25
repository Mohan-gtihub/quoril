import { BarChart3, Calendar, Clock, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import type { ProductivityTrends } from '../types/reports.types'

interface ProductivityTrendsReportProps {
    stats: ProductivityTrends
}

export function ProductivityTrendsReport({ stats }: ProductivityTrendsReportProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
                Productivity Trends
            </h2>

            {/* Weekly Graph */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Weekly Progress (Last 4 Weeks)
                </h3>

                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                        <XAxis
                            dataKey="label"
                            stroke="var(--text-muted)"
                            fontSize={11}
                            fontFamily="monospace"
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            fontSize={11}
                            fontFamily="monospace"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '12px',
                                padding: '12px'
                            }}
                            labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '8px' }}
                            itemStyle={{ color: 'var(--text-secondary)', fontSize: '12px' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                        <Bar
                            dataKey="focusMinutes"
                            fill="var(--accent-primary)"
                            name="Focus Minutes"
                            radius={[8, 8, 0, 0]}
                        />
                        <Bar
                            dataKey="tasksCompleted"
                            fill="var(--text-secondary)"
                            name="Tasks Completed"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Monthly Graph */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Monthly Trends (Last 6 Months)
                </h3>

                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                        <XAxis
                            dataKey="label"
                            stroke="var(--text-muted)"
                            fontSize={11}
                            fontFamily="monospace"
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            fontSize={11}
                            fontFamily="monospace"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '12px',
                                padding: '12px'
                            }}
                            labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '8px' }}
                            itemStyle={{ color: 'var(--text-secondary)', fontSize: '12px' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                        <Line
                            type="monotone"
                            dataKey="focusMinutes"
                            stroke="var(--accent-primary)"
                            strokeWidth={3}
                            name="Focus Minutes"
                            dot={{ fill: 'var(--accent-primary)', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="tasksCompleted"
                            stroke="var(--text-secondary)"
                            strokeWidth={3}
                            name="Tasks Completed"
                            dot={{ fill: 'var(--text-secondary)', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Focus Distribution by Day */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">
                        Focus Distribution by Day
                    </h3>

                    <div className="space-y-3">
                        {stats.focusDistributionByDay.map((day) => {
                            const maxMinutes = Math.max(...stats.focusDistributionByDay.map(d => d.avgMinutes), 1)
                            const widthPercent = (day.avgMinutes / maxMinutes) * 100

                            return (
                                <div key={day.day} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-[var(--text-secondary)] font-medium w-12">
                                            {day.day}
                                        </span>
                                        <span className="text-xs font-semibold text-[var(--text-tertiary)] tabular-nums">
                                            {day.avgMinutes}m
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-500"
                                            style={{ width: `${widthPercent}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Most Productive Time of Day */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-tile)] p-5">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Most Productive Hours
                    </h3>

                    {stats.mostProductiveTimeOfDay.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="w-12 h-12 text-[var(--text-muted)]/30 mx-auto mb-4" />
                            <p className="text-sm text-[var(--text-muted)]">No data available yet</p>
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
                                                <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums w-6">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                                                    {time.label}
                                                </span>
                                            </div>
                                            <span className="text-xs font-semibold text-[var(--text-tertiary)] tabular-nums">
                                                {time.avgMinutes}m avg
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--text-tertiary)] rounded-full transition-all duration-500"
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
