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
    breakMinutes?: number
    tasksCompleted: number
    goalMet?: boolean
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
    periodLabel: string
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
    title: string
    duration: string
    startTime: string
    rawStartTime: string
    type: string
    notes: string | null
    isRunning: boolean
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

export interface CompletedTaskItem {
    id: string
    title: string
    completedAt: string // ISO
    totalSeconds: number
    totalDurationFormatted: string
    listName?: string
    listColor?: string
}

export interface CompletedTaskGroup {
    date: string
    items: CompletedTaskItem[]
}
