import { format, parseISO } from 'date-fns'
import {
    ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

export function FocusTrendChart({ data }: {
    data: { day: string; focusMinutes: number; deepMinutes: number }[]
}) {
    if (data.every(d => d.focusMinutes === 0)) {
        return <div className="flex items-center justify-center h-56 text-xs text-[var(--text-muted)]">No focus data yet for this range</div>
    }
    const rows = data.map(d => ({ ...d, label: format(parseISO(d.day), 'EEE') }))
    return (
        <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={rows} margin={{ top: 10, right: 6, left: 6, bottom: 0 }}>
                <defs>
                    <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--focus)" stopOpacity={0.30} />
                        <stop offset="100%" stopColor="var(--focus)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border-default)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dy={4} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={34} allowDecimals={false} tickFormatter={(v: number) => `${v}`} />
                <Tooltip
                    cursor={{ fill: 'var(--bg-hover)' }}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12, boxShadow: 'var(--shadow-soft)' }}
                    labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                    formatter={(v: number, name: string) => [`${v}m`, name === 'focusMinutes' ? 'Focus' : 'Deep work']}
                />
                <Bar dataKey="deepMinutes" barSize={12} radius={[3, 3, 0, 0]} fill="var(--wellbeing)"
                    fillOpacity={0.9} animationDuration={600} />
                <Area type="monotone" dataKey="focusMinutes" stroke="var(--focus)" strokeWidth={2.5}
                    fill="url(#focusFill)" animationDuration={600} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </ComposedChart>
        </ResponsiveContainer>
    )
}
