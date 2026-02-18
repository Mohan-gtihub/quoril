import {
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { DailyChartData } from '../types/reports.types'

interface ActivityChartProps {
    data: DailyChartData[]
}

export function ActivityChart({ data }: ActivityChartProps) {
    return (
        <div className="glass-panel rounded-3xl p-8 min-h-[400px]">
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} barSize={32} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}
                        dy={10}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload
                                const totalActivityHrs = (d.activityMinutes || 0) / 60
                                return (
                                    <div className="glass-thick rounded-xl p-4 shadow-xl border border-[var(--border-default)]">
                                        <p className="text-xs font-bold text-[var(--text-primary)] mb-2">{d.label}</p>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Deep Focus</span>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{d.focusHours}h</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-[var(--text-muted)]/20" />
                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Total Active</span>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-[var(--text-tertiary)]">{totalActivityHrs.toFixed(1)}h</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 border-t border-[var(--border-default)] pt-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                                                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Breaks</span>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">{d.breakHours}h</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        }}
                        cursor={{ fill: 'var(--bg-hover)' }}
                    />
                    {/* Background Bar: Total Activity */}
                    <Bar
                        dataKey={(d) => (d.activityMinutes || 0) / 60}
                        name="activity"
                        fill="var(--bg-hover)"
                        radius={[4, 4, 4, 4]}
                        isAnimationActive={false}
                    />
                    <Bar dataKey="focusHours" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="breakHours" stackId="a" fill="rgba(16, 185, 129, 0.3)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
