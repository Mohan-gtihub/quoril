import { Task } from '@/types/database'

export interface DailyChartData {
    date: Date
    label: string
    focusHours: number
    breakHours: number
    totalMinutes: number
    focusMinutes: number
    goalMet: boolean
}

export interface SessionItem {
    id: string
    task_id: string | null
    start_time: string
    end_time: string | null
    seconds: number | null
    type: 'focus' | 'break' | 'long_break'
    planned_seconds?: number // Optional for now
}

export interface TimelineGroup {
    date: string // yyyy-MM-dd
    items: SessionItem[]
}

export interface ListDistItem {
    name: string
    value: number
    color: string
}

export interface ReportStats {
    totalFocusDisplay: string
    totalBreakDisplay: string
    efficiencyScore: number
    chartData: DailyChartData[]
    currentStreak: number
    rangeConsistency: number
    minutesToday: number
    timelineData: TimelineGroup[]
    activeTasks: Task[]
    listDist: ListDistItem[]
}
