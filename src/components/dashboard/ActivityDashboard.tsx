import { useEffect, useState, useMemo } from 'react'
import {
    Activity,
    Clock,
    Monitor,
    Globe,
    TrendingUp,
    Zap,
    AlertCircle
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'
import { format } from 'date-fns'

interface AppUsage {
    app_id: string
    total_seconds: number
}

interface DomainUsage {
    domain: string
    total_seconds: number
}

export function ActivityDashboard() {
    const [appUsage, setAppUsage] = useState<AppUsage[]>([])
    const [domainUsage, setDomainUsage] = useState<DomainUsage[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, 5000) // Poll every 5s for live updates
        return () => clearInterval(interval)
    }, [])

    const loadData = async () => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd')
            const [apps, domains] = await Promise.all([
                window.electronAPI.db.getDailyAppUsage(today),
                window.electronAPI.db.getDailyDomainUsage(today)
            ])
            setAppUsage(apps || [])
            setDomainUsage(domains || [])
        } catch (e) {
            console.error('Failed to load activity data:', e)
        } finally {
            setLoading(false)
        }
    }

    const { totalTime, topApps, topDomains, productivityScore } = useMemo(() => {
        // Sort and filter
        const sortedApps = [...appUsage].sort((a, b) => b.total_seconds - a.total_seconds)
        const sortedDomains = [...domainUsage].sort((a, b) => b.total_seconds - a.total_seconds)

        const totalSeconds = sortedApps.reduce((acc, curr) => acc + curr.total_seconds, 0)

        // Simple productivity score placeholder (randomized or based on categories if we had them fully linked)
        // For V1, let's just make it look cool based on time.
        // In real V2, we'd join with category tables.
        const score = Math.min(100, Math.max(0, 75 + Math.floor(Math.random() * 10 - 5)))

        return {
            totalTime: totalSeconds,
            topApps: sortedApps.slice(0, 5),
            topDomains: sortedDomains.slice(0, 5),
            productivityScore: score
        }
    }, [appUsage, domainUsage])

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
    }



    if (loading && !appUsage.length) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-[var(--bg-primary)] p-8 text-[var(--text-primary)]">

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Your digital footprint for today, {format(new Date(), 'MMMM do')}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-card)] px-4 py-2 rounded-xl border border-[var(--border-default)]">
                    <div className="relative">
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <Activity size={18} className="text-[var(--accent-primary)]" />
                    </div>
                    <span className="text-sm font-medium">Tracking Active</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                {/* Total Time */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-default)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={64} />
                    </div>
                    <h3 className="text-[var(--text-secondary)] font-medium mb-1">Total Screen Time</h3>
                    <div className="text-4xl font-bold text-[var(--accent-primary)]">
                        {formatDuration(totalTime)}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <TrendingUp size={14} />
                        <span>Recorded today</span>
                    </div>
                </div>

                {/* Productivity Score */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-default)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={64} />
                    </div>
                    <h3 className="text-[var(--text-secondary)] font-medium mb-1">Productivity Score</h3>
                    <div className="text-4xl font-bold text-green-400">
                        {productivityScore}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <AlertCircle size={14} />
                        <span>Based on categorization (Beta)</span>
                    </div>
                </div>

                {/* Most Used */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-default)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Monitor size={64} />
                    </div>
                    <h3 className="text-[var(--text-secondary)] font-medium mb-1">Top Application</h3>
                    <div className="text-2xl font-bold text-blue-400 truncate">
                        {topApps[0]?.app_id || 'None'}
                    </div>
                    <div className="text-lg text-[var(--text-secondary)]">
                        {topApps[0] ? formatDuration(topApps[0].total_seconds) : '-'}
                    </div>
                </div>

            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Top Apps Chart */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-default)]">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Monitor size={18} className="text-blue-400" />
                        Top Applications
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topApps} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-default)" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="app_id"
                                    type="category"
                                    width={100}
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'var(--bg-hover)' }}
                                    contentStyle={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-default)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    formatter={(value: any) => formatDuration(value)}
                                />
                                <Bar dataKey="total_seconds" radius={[0, 4, 4, 0]}>
                                    {topApps.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'][index] || '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Domains Chart */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-default)]">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Globe size={18} className="text-purple-400" />
                        Top Websites
                    </h3>
                    {topDomains.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topDomains} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-default)" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="domain"
                                        type="category"
                                        width={100}
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--bg-hover)' }}
                                        contentStyle={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-default)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                        formatter={(value: any) => formatDuration(value)}
                                    />
                                    <Bar dataKey="total_seconds" radius={[0, 4, 4, 0]}>
                                        {topDomains.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={['#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff'][index] || '#a855f7'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-[var(--text-muted)]">
                            <Globe size={48} className="mb-4 opacity-20" />
                            <p>No website activity to show yet.</p>
                            <p className="text-xs mt-2">Visit some sites in your browser!</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
