import { useState } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useFocusStore } from '@/store/focusStore'
import { usePlannerStore } from '@/store/plannerStore'
import type { TaskColumn } from '@/types/list'

const DAILY_LIMIT = 8 * 60 // 8 hours

export function useCreateTask(listId: string) {
    const { createTask, getTodayPlannedMinutes } = useTaskStore()
    const { startFocus } = useFocusStore()
    const { selectedDate } = usePlannerStore()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit(data: {
        title: string
        minutes: number
        priority: 'low' | 'medium' | 'high'
        focusAfter: boolean
        isRecurring?: boolean
        column?: TaskColumn
        position?: 'top' | 'bottom'
    }) {
        const column = data.column ?? 'today'
        setError(null)

        if (!data.title.trim()) {
            setError('Title is required')
            return
        }

        if (data.minutes < 0) {
            setError('Focus time cannot be negative')
            return
        }

        const today = getTodayPlannedMinutes()

        if (today + data.minutes > DAILY_LIMIT) {
            setError('Daily focus limit exceeded')
            return
        }

        setLoading(true)

        try {
            const task = await createTask(
                {
                    list_id: listId,
                    title: data.title.trim(),
                    priority: data.priority,
                    estimated_minutes: data.minutes,
                    // Only Today tasks are date-anchored; Backlog/This Week are not
                    // date-scoped, so don't stamp them with the selected day.
                    due_date: column === 'today' ? selectedDate.toISOString() : null,
                    is_recurring: data.isRecurring,
                    last_reset_date: data.isRecurring ? new Date().toISOString().split('T')[0] : null
                },
                column,
                data.position ?? 'bottom'
            )

            if (data.focusAfter) {
                startFocus(task.id)
            }

            return task
        } catch {
            setError('Failed to create task')
        } finally {
            setLoading(false)
        }
    }

    return {
        submit,
        loading,
        error,
    }
}
