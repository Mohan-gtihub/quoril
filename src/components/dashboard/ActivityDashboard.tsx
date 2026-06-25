import { useEffect, useState, useMemo } from 'react'
import {
    Clock,
    Monitor,
    Globe,
    TrendingUp,
    Zap
} from 'lucide-react'
import { platform } from '@/services/platform'
import { TrackingUnavailable } from '@/components/reports/components/TrackingUnavailable'
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

// Vibrant accent palette for chart bars (cards stay white).
const CHART_PALETTE = ['#c850a0', '#f0b450', '#5bc4c4', '#f4a0c0', '#f08050']

interface AppUsage {
    app_id: string
    total_seconds: number
}

interface DomainUsage {
    domain: string
    total_seconds: number
}

const appTracking = platform.capabilities.appTracking

export function ActivityDashboard() {
    // All hooks must run unconditionally — appTracking is a module-level constant.
    const [appUsage, setAppUsage] = useState<AppUsage[]>([])
    const [domainUsage, setDomainUsage] = useState<DomainUsage[]>([])
    const [loading, setLoading] = useState(true)
    const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})

    useEffect(() => {
        if (!appTracking) return
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

    // Load app categories for accurate productivity scoring
    useEffect(() => {
        if (!appTracking) return
        const today = format(new Date(), 'yyyy-MM-dd')
        window.electronAPI?.db?.getAppUsage(today + 'T00:00:00', today + 'T23:59:59')
            .then((rows: any[]) => {
                const map: Record<string, string> = {}
                rows?.forEach((r: any) => { if (r.appName && r.category) map[r.appName] = r.category })
                setCategoryMap(map)
            })
            .catch(() => {})
    }, [])

    const { totalTime, topApps, topDomains, productivityScore } = useMemo(() => {
        const sortedApps = [...appUsage].sort((a, b) => b.total_seconds - a.total_seconds)
        const sortedDomains = [...domainUsage].sort((a, b) => b.total_seconds - a.total_seconds)

        const totalSeconds = sortedApps.reduce((acc, curr) => acc + curr.total_seconds, 0)

        // Real productivity score based on app categories
        let productiveSeconds = 0
        sortedApps.forEach(app => {
            const cat = categoryMap[app.app_id] || 'Other'
            if (['Development', 'Work'].includes(cat)) {
                productiveSeconds += app.total_seconds
            }
        })
        const score = totalSeconds > 0
            ? Math.min(100, Math.round((productiveSeconds / totalSeconds) * 100))
            : 0

        return {
            totalTime: totalSeconds,
            topApps: sortedApps.slice(0, 5),
            topDomains: sortedDomains.slice(0, 5),
            productivityScore: score
        }
    }, [appUsage, domainUsage, categoryMap])

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
    }

    // ── Web: app tracking unavailable ──────────────────────────────────────────
    if (!appTracking) {
        return (
            <div className="flex flex-col h-full overflow-y-auto bg-[var(--bg-primary)] px-6 md:px-10 py-8 text-[var(--text-primary)]">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
                    <p className="text-[var(--text-secondary)] mt-1 text-sm">Your digital footprint</p>
                </div>
                <TrackingUnavailable />
            </div>
        )
    }

    if (loading && !appUsage.length) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-[var(--bg-primary)] px-6 md:px-10 py-8 text-[var(--text-primary)]">

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
                    <p className="text-[var(--text-secondary)] mt-1 text-sm">
                        Your digital footprint for today, {format(new Date(), 'MMMM do')}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-card)] px-3.5 py-2 rounded-[var(--radius-pill)] border border-[var(--border-default)]">
                    <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Tracking active</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

                {/* Total Time */}
                <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius-card)] border border-[var(--border-default)]">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-semibold text-[var(--text-muted)] mb-3">
                        <Clock size={12} /> Total Screen Time
                    </div>
                    <div className="text-4xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
                        {formatDuration(totalTime)}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <TrendingUp size={13} />
                        <span>Recorded today</span>
                    </div>
                </div>

                {/* Productivity Score */}
                <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius-card)] border border-[var(--border-default)]">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-semibold text-[var(--text-muted)] mb-3">
                        <Zap size={12} /> Productivity Score
                    </div>
                    <div className="text-4xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
                        {productivityScore}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <span>Based on app categories</span>
                    </div>
                </div>

                {/* Most Used */}
                <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius-card)] border border-[var(--border-default)]">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-semibold text-[var(--text-muted)] mb-3">
                        <Monitor size={12} /> Top Application
                    </div>
                    <div className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] truncate">
                        {topApps[0]?.app_id || 'None'}
                    </div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)] tabular-nums">
                        {topApps[0] ? formatDuration(topApps[0].total_seconds) : '-'}
                    </div>
                </div>

            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Top Apps Chart */}
                <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius-card)] border border-[var(--border-default)]">
                    <h3 className="text-[15px] font-semibold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                        <Monitor size={16} className="text-[var(--text-muted)]" />
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
                                        <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Domains Chart */}
                <div className="bg-[var(--bg-card)] p-5 rounded-[var(--radius-card)] border border-[var(--border-default)]">
                    <h3 className="text-[15px] font-semibold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                        <Globe size={16} className="text-[var(--text-muted)]" />
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
                                            <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
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
