import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReportsController } from './hooks/useReportsController'
import { ReportsHeader } from './components/ReportsHeader'
import { StatsOverview } from './components/StatsOverview'
import { ActivityChart } from './components/ActivityChart'
import { SessionLog } from './components/SessionLog'
import { AppUsageReport } from './components/AppUsageReport'


export function Reports() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'executive' | 'system'>('executive')

    const {
        stats,
        dateRange,
        setDateRange,
        dailyFocusGoalMinutes
    } = useReportsController()

    return (
        <div className="h-full bg-[#050505] text-white overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto p-8 space-y-8">

                {/* 1. Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <ReportsHeader
                        navigate={navigate}
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                    />

                    {/* Tab Switcher */}
                    <div className="flex bg-[#111] p-1 rounded-2xl border border-white/5 self-start">
                        <button
                            onClick={() => setActiveTab('executive')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'executive'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-white/30 hover:text-white/60'
                                }`}
                        >
                            Executive
                        </button>
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'system'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-white/30 hover:text-white/60'
                                }`}
                        >
                            Intelligence
                        </button>
                    </div>
                </div>

                {activeTab === 'executive' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* 2. Stats Overview (Hero Grid) */}
                        <StatsOverview
                            stats={stats}
                            dailyFocusGoalMinutes={dailyFocusGoalMinutes}
                        />

                        {/* 3. Detailed Data Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Activity Chart */}
                            <div>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] px-1 mb-6">Activity Trends</h3>
                                <ActivityChart data={stats.chartData} />
                            </div>

                            {/* Right Column: Session Log & Distribution */}
                            <div className="space-y-8">
                                {/* Session Log */}
                                <div>
                                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] px-1 mb-6">Session Log</h3>
                                    <SessionLog
                                        timelineData={stats.timelineData}
                                        activeTasks={stats.activeTasks}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <AppUsageReport dateRange={dateRange} />
                    </div>
                )}
            </div>
        </div>
    )
}
