import { useState, useEffect } from 'react'
import { platform } from '@/services/platform'
import { TrackingUnavailable } from './TrackingUnavailable'

interface AppUsage {
    appName: string
    totalSeconds: number
    lastTitle: string
    category?: string
}

interface AppUsageReportProps {
    dateRange: {
        start: Date
        end: Date
    }
}

const appTracking = platform.capabilities.appTracking

export function AppUsageReport({ dateRange }: AppUsageReportProps) {
    const [usage, setUsage] = useState<AppUsage[]>([])
    const [loading, setLoading] = useState(true)
    const [trackingAvailable, setTrackingAvailable] = useState(appTracking)

    useEffect(() => {
        if (!appTracking) {
            setLoading(false)
            return
        }

        const load = async () => {
            setLoading(true)
            try {
                const available = await Promise.resolve(platform.screenTime.isTrackingAvailable())
                setTrackingAvailable(available)
                if (!available) {
                    setUsage([])
                    return
                }
                // Fetch app usage from electron API
                const end = new Date(dateRange.end)
                end.setHours(23, 59, 59, 999)

                const data = await window.electronAPI.db.getAppUsage(
                    dateRange.start.toISOString(),
                    end.toISOString()
                )
                setUsage(data)
            } catch (e) {
                console.error('[AppUsageReport] Failed to fetch usage:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [dateRange])

    if (!appTracking || (!loading && !trackingAvailable)) {
        return (
            <TrackingUnavailable
                title={appTracking ? 'App Tracking Optional' : undefined}
                description={
                    appTracking
                        ? 'App usage reporting requires macOS Accessibility access. Focus and task reports remain available without it.'
                        : undefined
                }
            />
        )
    }

    const totalTime = usage.reduce((acc, curr) => acc + curr.totalSeconds, 0)

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.round(seconds % 60)

        if (h > 0) return `${h}h ${m}m`
        if (m > 0) return `${m}m ${s}s`
        return `${s}s`
    }

    if (loading) {
        return (
            <div className="h-[400px] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] animate-spin" />
                    <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">Analyzing Activity...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-6 rounded-3xl">
                    <div className="text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-[0.2em] mb-4">
                        Total Screen Time
                    </div>
                    <div className="text-3xl font-semibold text-[var(--text-primary)] tabular-nums">
                        {formatDuration(totalTime)}
                    </div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-6 rounded-3xl">
                    <div className="text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-[0.2em] mb-4">
                        Applications Tracked
                    </div>
                    <div className="text-3xl font-semibold text-[var(--text-primary)] tabular-nums">
                        {usage.length}
                    </div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-6 rounded-3xl">
                    <div className="text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-[0.2em] mb-4">
                        Top Platform
                    </div>
                    <div className="text-2xl font-semibold text-[var(--text-primary)] truncate max-w-full">
                        {usage[0]?.appName || 'None Detected'}
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl overflow-hidden">
                <div className="px-8 py-5 border-b border-[var(--border-default)] flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Application Activity Log</h3>
                    <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        Last synced: {new Date().toLocaleTimeString()}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[var(--border-default)]">
                                <th className="px-8 py-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Application</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Current/Last View</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Activity Share</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                            {usage.map((app, idx) => (
                                <tr key={app.appName} className="group hover:bg-[var(--bg-hover)] transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] font-semibold text-sm uppercase">
                                                {app.appName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-[var(--text-primary)]">
                                                    {app.appName}
                                                </div>
                                                <div className="text-[11px] font-bold text-[var(--text-muted)] tracking-widest uppercase mt-0.5">
                                                    {idx === 0 ? 'Dominant App' : (app.category || 'Uncategorized')}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-xs text-[var(--text-tertiary)] font-medium truncate max-w-[300px] border-l border-[var(--border-default)] pl-4 py-1">
                                            {app.lastTitle || 'Unknown window title'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="text-sm font-mono font-bold text-[var(--text-primary)]">
                                            {formatDuration(app.totalSeconds)}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 mt-2">
                                            <div className="w-24 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[var(--accent-primary)]"
                                                    style={{ width: `${(app.totalSeconds / totalTime) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] w-8">
                                                {Math.round((app.totalSeconds / totalTime) * 100)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {usage.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-8 py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">No Activity Recorded</p>
                                            <p className="text-[11px] normal-case leading-relaxed text-[var(--text-muted)]">No application activity was recorded for this time window.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
