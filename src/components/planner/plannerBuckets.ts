import { isSameDay, startOfToday, startOfWeek, endOfWeek } from 'date-fns'
import type { Task } from '@/types/database'
import type { TaskColumn } from '@/types/list'
import { COLUMN_STATUS } from '@/utils/columnMap'

export function getPlannerTaskBuckets(
    tasks: Task[],
    selectedListId: string | null,
    lists: { id: string }[],
    selectedDate: Date
) {
    const cols: Record<TaskColumn, Task[]> = {
        backlog: [],
        this_week: [],
        today: [],
        done: [],
    }

    const sortedTasks = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    sortedTasks.forEach(task => {
        if (task.deleted_at) return

        if (selectedListId === 'all') {
            // All Tasks is intentionally inclusive. Historical completed tasks
            // may point to archived/deleted/missing lists and should still be visible.
        } else if (selectedListId && task.list_id !== selectedListId) {
            return
        } else if (!selectedListId && task.list_id && !lists.some(l => l.id === task.list_id)) {
            return
        }

        const taskDate = task.due_date ? new Date(task.due_date) : null
        // Bucket completed tasks by completion time only. Fall back to the
        // stable created_at for legacy rows missing completed_at — never
        // updated_at, which drifts every time a done task is edited and would
        // silently migrate it to a different day in the Done column.
        const completedDate = task.completed_at
            ? new Date(task.completed_at)
            : task.created_at
                ? new Date(task.created_at)
                : null

        if (task.is_recurring && !isSameDay(selectedDate, startOfToday()) && selectedDate > startOfToday()) {
            cols.today.push({ ...task, status: 'active' as any, completed_at: null })
            return
        }

        if (COLUMN_STATUS.backlog.includes(task.status as any)) {
            cols.backlog.push(task)
        } else if (COLUMN_STATUS.this_week.includes(task.status as any)) {
            cols.this_week.push(task)
        } else if (COLUMN_STATUS.today.includes(task.status as any)) {
            if (isSameDay(selectedDate, startOfToday())) {
                cols.today.push(task)
            } else if (taskDate && isSameDay(taskDate, selectedDate)) {
                cols.today.push(task)
            }
        } else if (COLUMN_STATUS.done.includes(task.status as any)) {
            if (completedDate) {
                const isTodaySelected = isSameDay(selectedDate, startOfToday())

                // Bucket a completed task strictly by the calendar day of its
                // completion timestamp. This matches how focus *time* is bucketed
                // (always by the event's own timestamp), so the done-count and the
                // focus-time for a given day never disagree (M1). The previous
                // "before 4 AM counts as the prior day" heuristic is removed.
                if (isTodaySelected) {
                    cols.done.push(task)
                } else if (isSameDay(completedDate, selectedDate)) {
                    cols.done.push(task)
                }
            }
        }
    })

    const getProgress = (targetCols: Task[], doneCol: Task[]) => {
        const targetEst = targetCols.reduce((s, t) => s + (t.estimated_minutes || 0), 0)
        const doneEst = doneCol.reduce((s, t) => s + (t.estimated_minutes || 0), 0)
        const total = targetEst + doneEst
        return total > 0 ? Math.min(100, (doneEst / total) * 100) : 0
    }

    const progressMap: Partial<Record<TaskColumn, number>> = {
        today: getProgress(cols.today, cols.done),
        // M2: Anchor "this week" progress to the current calendar week
        // (Mon–Sun) rather than a rolling trailing-7-days window, so the
        // denominator matches what the column actually represents and resets
        // cleanly at the week boundary.
        this_week: getProgress(cols.this_week, tasks.filter(t => {
            if (!t.completed_at) return false
            const d = new Date(t.completed_at)
            const now = new Date()
            const weekStart = startOfWeek(now, { weekStartsOn: 1 })
            const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
            return d >= weekStart && d <= weekEnd
        }))
    }

    return { columns: cols, progressMap }
}
