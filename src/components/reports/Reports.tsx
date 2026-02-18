import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useReportsController } from './hooks/useReportsController'
import { ReportsHeader } from './components/ReportsHeader'
import { StatsOverview } from './components/StatsOverview'
import { ActivityChart } from './components/ActivityChart'
import { SessionLog } from './components/SessionLog'
import { CompletedTasksLog } from './components/CompletedTasksLog'
import { FocusTimeReport } from './components/FocusTimeReport'
import { TimelineGroup } from './types/reports.types'
import { List, CheckCircle2 } from 'lucide-react'

export function Reports() {
    const navigate = useNavigate()
    const {
        stats,
        dateRange,
        setDateRange,
        timelineItems,
        completedTasksGrouped,
        dailyFocusGoalMinutes
    } = useReportsController()

    const [logView, setLogView] = useState<'sessions' | 'tasks'>('tasks')

    // TRANSFORM: Chart Data
    const chartData = stats.productivity.weeklyData.map((d: any) => ({
        ...d,
        focusHours: Math.round((d.focusMinutes / 60) * 10) / 10,
        breakHours: Math.round(((d.breakMinutes || 0) / 60) * 10) / 10,
        activityMinutes: d.focusMinutes + (d.breakMinutes || 0)
    }))

    // TRANSFORM: Session Log Groups
    const sessionLogGroups = groupSessionsByDay(timelineItems)

    return (
        <div className="h-full bg-transparent p-6 md:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-8">

                <ReportsHeader
                    navigate={navigate}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                />

                <StatsOverview
                    stats={stats}
                    dailyFocusGoalMinutes={dailyFocusGoalMinutes}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <ActivityChart data={chartData} />
                        <FocusTimeReport stats={stats} />
                    </div>

                    <div className="space-y-6">
                        {/* Toggle Header */}
                        <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-default)]">
                            <button
                                onClick={() => setLogView('tasks')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${logView === 'tasks'
                                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                    }`}
                            >
                                <CheckCircle2 size={14} />
                                Tasks
                            </button>
                            <button
                                onClick={() => setLogView('sessions')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${logView === 'sessions'
                                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                    }`}
                            >
                                <List size={14} />
                                Sessions
                            </button>
                        </div>

                        {logView === 'sessions' ? (
                            <SessionLog
                                timelineData={sessionLogGroups as any}
                                activeTasks={[]} // Tasks are integrated in title
                            />
                        ) : (
                            <CompletedTasksLog
                                taskGroups={completedTasksGrouped}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function groupSessionsByDay(items: any[]): TimelineGroup[] {
    const groups: Record<string, TimelineGroup> = {}

    items.forEach(item => {
        // Use rawStartTime if available, otherwise fallback (which shouldn't happen)
        const dateStr = item.rawStartTime
            ? format(parseISO(item.rawStartTime), 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd');

        // Full ISO string for header formatting
        const fullDate = item.rawStartTime || new Date().toISOString();

        if (!groups[dateStr]) {
            groups[dateStr] = {
                date: fullDate,
                items: []
            }
        }
        groups[dateStr].items.push(item)
    })

    return Object.values(groups).sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
}
