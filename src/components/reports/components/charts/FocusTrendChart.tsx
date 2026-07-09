import { format, parseISO } from 'date-fns'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart'

// Series config drives colours + legend/tooltip labels via shadcn's Chart.
const chartConfig = {
    deepMinutes: { label: 'Deep work', color: 'var(--wellbeing)' },
    shallowMinutes: { label: 'Focus', color: 'var(--focus)' },
} satisfies ChartConfig

export function FocusTrendChart({ data }: {
    data: { day: string; focusMinutes: number; deepMinutes: number }[]
}) {
    if (data.every(d => d.focusMinutes === 0)) {
        return <div className="flex items-center justify-center h-56 text-xs text-[var(--text-muted)]">No focus data yet for this range</div>
    }
    const rows = data.map(d => ({
        // Focus shown as the portion outside deep work, so deep + focus stack
        // into one honest per-day total instead of overlapping.
        deepMinutes: d.deepMinutes,
        shallowMinutes: Math.max(0, d.focusMinutes - d.deepMinutes),
        label: format(parseISO(d.day), 'EEE'),
    }))

    return (
        <ChartContainer config={chartConfig} className="h-60 w-full">
            <BarChart data={rows} margin={{ top: 10, right: 6, left: 6, bottom: 0 }} barCategoryGap="45%">
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border-default)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dy={4} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={34} allowDecimals={false} />
                <ChartTooltip
                    cursor={{ fill: 'var(--bg-hover)' }}
                    content={<ChartTooltipContent formatter={(v, name) => [`${v}m `, chartConfig[name as keyof typeof chartConfig]?.label ?? name]} />}
                />
                {/* Deep work is the solid base; remaining focus stacks lighter on top.
                    maxBarSize caps width so a lone tall day stays a tidy column, not a spike. */}
                <Bar stackId="focus" dataKey="deepMinutes" fill="var(--color-deepMinutes)" fillOpacity={0.95} maxBarSize={44} radius={[0, 0, 4, 4]} />
                <Bar stackId="focus" dataKey="shallowMinutes" fill="var(--color-shallowMinutes)" fillOpacity={0.85} maxBarSize={44} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ChartContainer>
    )
}
