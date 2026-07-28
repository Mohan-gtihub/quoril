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
    // Landing "hourly heatmap" recipe: peak hour stands out in amber (BREAK) at
    // full strength; every other bar is focus-blue with opacity graduated by
    // height (taller = more opaque), giving the periwinkle fade instead of a
    // flat wash. color-mix drives the fade so the blue stays theme-token driven.
    const maxMin = Math.max(1, ...rows.map(r => r.minutes))
    return (
        <ResponsiveContainer width="100%" height={196}>
            <BarChart data={rows} margin={{ top: 10, right: 6, left: 6, bottom: 0 }} barCategoryGap={2}>
                <XAxis dataKey="label" interval={2} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dy={4} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={34} tickFormatter={(v: number) => `${v}`} allowDecimals={false} />
                <Tooltip
                    cursor={{ fill: 'var(--bg-hover)' }}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v}m`, 'Focus']}
                />
                <Bar dataKey="minutes" radius={[3, 3, 0, 0]} animationDuration={600}>
                    {rows.map((r, i) => {
                        const pctOpacity = Math.round((0.22 + (r.minutes / maxMin) * 0.55) * 100)
                        return (
                            <Cell key={i} fill={r.isPeak
                                ? 'var(--break)'
                                : `color-mix(in srgb, var(--focus) ${pctOpacity}%, transparent)`} />
                        )
                    })}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
