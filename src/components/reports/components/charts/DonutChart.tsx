import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export interface DonutDatum {
    name: string
    value: number
    color: string
    label?: string   // pre-formatted value shown in the legend
}

export function DonutChart({ data, centerValue, centerSub }: {
    data: DonutDatum[]
    centerValue?: string
    centerSub?: string
}) {
    const total = data.reduce((s, d) => s + d.value, 0)
    if (total <= 0) {
        return <div className="h-40 flex items-center justify-center text-xs text-[var(--text-muted)]">No data yet for this range</div>
    }
    return (
        <div className="flex items-center gap-5">
            <div className="relative w-[128px] h-[128px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                            innerRadius={44} outerRadius={62} paddingAngle={2} stroke="none"
                            startAngle={90} endAngle={-270} animationDuration={700}>
                            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {centerValue && <span className="text-[15px] font-semibold text-[var(--text-primary)] tabular-nums leading-none">{centerValue}</span>}
                    {centerSub && <span className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-wide">{centerSub}</span>}
                </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2.5">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                        <span className="text-[var(--text-secondary)] truncate flex-1">{d.name}</span>
                        {d.label && <span className="text-[var(--text-muted)] tabular-nums shrink-0">{d.label}</span>}
                    </div>
                ))}
            </div>
        </div>
    )
}
