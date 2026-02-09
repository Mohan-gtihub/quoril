import { useState, useEffect } from 'react'
import { Clock, Monitor, Activity } from 'lucide-react'

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

export function AppUsageReport({ dateRange }: AppUsageReportProps) {
    const [usage, setUsage] = useState<AppUsage[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                // Fetch app usage from electron API
                const data = await window.electronAPI.db.getAppUsage(
                    dateRange.start.toISOString(),
                    dateRange.end.toISOString()
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
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <p className="text-xs text-white/20 font-bold uppercase tracking-widest">Analyzing Activity...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0D0D0D] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Clock size={64} />
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                        Total Screen Time
                    </div>
                    <div className="text-3xl font-black text-white tabular-nums drop-shadow-lg">
                        {formatDuration(totalTime)}
                    </div>
                </div>

                <div className="bg-[#0D0D0D] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Monitor size={64} />
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        Applications Tracked
                    </div>
                    <div className="text-3xl font-black text-white tabular-nums">
                        {usage.length}
                    </div>
                </div>

                <div className="bg-[#0D0D0D] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Activity size={64} />
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                        Top Platform
                    </div>
                    <div className="text-2xl font-black text-white truncate max-w-full italic">
                        {usage[0]?.appName || 'None Detected'}
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="px-8 py-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Application Activity Log</h3>
                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        Last synced: {new Date().toLocaleTimeString()}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.01]">
                                <th className="px-8 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Application</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Current/Last View</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-right">Activity Share</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {usage.map((app, idx) => (
                                <tr key={app.appName} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm uppercase ring-1 ring-white/5">
                                                {app.appName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                    {app.appName}
                                                </div>
                                                <div className="text-[10px] font-bold text-white/20 tracking-widest uppercase mt-0.5">
                                                    {idx === 0 ? '🏆 Dominant App' : (app.category || 'Uncategorized')}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-xs text-white/40 font-medium italic truncate max-w-[300px] border-l border-white/5 pl-4 py-1">
                                            {app.lastTitle || 'Unknown window title'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="text-sm font-mono font-bold text-white">
                                            {formatDuration(app.totalSeconds)}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 mt-2">
                                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000 shadow-[0_0_8px_rgba(79,70,229,0.3)]"
                                                    style={{ width: `${(app.totalSeconds / totalTime) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono font-bold text-white/20 w-8">
                                                {Math.round((app.totalSeconds / totalTime) * 100)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {usage.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-8 py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-3 opacity-20">
                                            <Monitor className="w-12 h-12 mx-auto mb-4" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Transmission Silent</p>
                                            <p className="text-[10px] normal-case leading-relaxed">System agent has not recorded any application activity for this specific time window.</p>
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
