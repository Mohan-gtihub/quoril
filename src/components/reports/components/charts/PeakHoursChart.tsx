import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'

function hourLabel(h: number) {
    const suffix = h < 12 ? 'a' : 'p'
    const base = h % 12 === 0 ? 12 : h % 12
    return `${base}${suffix}`
}

export function PeakHoursChart({ bins }: {
    bins: { hour: number; minutes: number; isPeak: boolean }[]
}) {
    if (bins.every(b => b.minutes === 0)) {
        return <div className="flex items-center justify-center h-48 text-xs text-[var(--text-muted)]">No focus sessions yet for this range</div>
    }
    const rows = bins.map(b => ({ ...b, label: hourLabel(b.hour) }))
    return (
        <ResponsiveContainer width="100%" height={192}>
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" interval={2} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={34} />
                <Tooltip
                    cursor={{ fill: 'var(--bg-hover)' }}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v}m`, 'Focus']}
                />
                <Bar dataKey="minutes" radius={[3, 3, 0, 0]} animationDuration={600}>
                    {rows.map((r, i) => (
                        <Cell key={i} fill={r.isPeak ? 'var(--focus)' : 'color-mix(in srgb, var(--focus) 45%, transparent)'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
