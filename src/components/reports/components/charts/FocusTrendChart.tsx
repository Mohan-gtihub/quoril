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
        <ResponsiveContainer width="100%" height={224}>
            <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                    <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--focus)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--focus)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--track)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={34} />
                <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    formatter={(v: number, name: string) => [`${v}m`, name === 'focusMinutes' ? 'Focus' : 'Deep work']}
                />
                <Area type="monotone" dataKey="focusMinutes" stroke="var(--focus)" strokeWidth={2}
                    fill="url(#focusFill)" animationDuration={600} />
                <Bar dataKey="deepMinutes" barSize={10} radius={[3, 3, 0, 0]} fill="#8b5cf6"
                    fillOpacity={0.85} animationDuration={600} />
            </ComposedChart>
        </ResponsiveContainer>
    )
}
