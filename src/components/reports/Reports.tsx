import { useNavigate } from 'react-router-dom'
import { useReportsController } from './hooks/useReportsController'
import { ReportsHeader } from './components/ReportsHeader'
import { StatsOverview } from './components/StatsOverview'
import { ActivityChart } from './components/ActivityChart'
import { SessionLog } from './components/SessionLog'
import { ModuleDistribution } from './components/ModuleDistribution'

export function Reports() {
    const navigate = useNavigate()
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
                <ReportsHeader
                    navigate={navigate}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                />

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

                        {/* Distribution By Module */}
                        <div>
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] px-1 mb-6">Focus by Module</h3>
                            <ModuleDistribution listDist={stats.listDist} />
                        </div>

                    </div>
                </div>

            </div>
        </div>
    )
}
