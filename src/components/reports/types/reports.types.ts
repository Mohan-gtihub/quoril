export interface TaskCompletionStats {
    completedToday: number
    completionRatePercent: number
    overdueTasks: number
    completedByList: { listName: string; count: number; color: string }[]
}

export interface FocusTimeStats {
    totalMinutesToday: number
    totalMinutesWeek: number
    focusPerTask: { taskTitle: string; minutes: number; taskId: string }[]
    deepWorkSessionsCount: number
}

export interface StreakStats {
    dailyFocusStreak: number
    dailyCompletionStreak: number
}

export interface DailyChartData {
    date: Date
    label: string
    focusMinutes: number
    tasksCompleted: number
}

export interface ListDistItem {
    listName: string
    count: number
    color: string
}

export interface FocusDistributionByDay {
    day: string
    avgMinutes: number
}

export interface MostProductiveTimeOfDay {
    hour: number
    label: string
    avgMinutes: number
}

export interface ProductivityTrends {
    weeklyData: DailyChartData[]
    monthlyData: DailyChartData[]
    focusDistributionByDay: FocusDistributionByDay[]
    mostProductiveTimeOfDay: MostProductiveTimeOfDay[]
}

export interface ComprehensiveReportStats {
    focusTime: FocusTimeStats
    taskCompletion: TaskCompletionStats
    streaks: StreakStats
    productivity: ProductivityTrends

    // Legacy stats for compatibility
    totalFocusDisplay: string
    totalBreakDisplay: string
    efficiencyScore: number
    chartData: any[]
    currentStreak: number
    rangeConsistency: number
    minutesToday: number
    timelineData: any[]
    activeTasks: any[]
    listDist: any[]
}

export interface SessionItem {
    id: string
    task_id: string
    start_time: string
    end_time: string | null
    seconds: number
    type: string
    planned_seconds?: number
}

export interface TimelineGroup {
    date: string
    items: SessionItem[]
}

export type DateRange = {
    start: Date
    end: Date
    label: string
}

// Alias for legacy compatibility
export type ReportStats = ComprehensiveReportStats
