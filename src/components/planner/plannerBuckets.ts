import { isSameDay, startOfToday } from 'date-fns'
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
        const completedDate = task.completed_at
            ? new Date(task.completed_at)
            : task.updated_at
                ? new Date(task.updated_at)
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

                if (isTodaySelected) {
                    cols.done.push(task)
                } else if (isSameDay(completedDate, selectedDate)) {
                    cols.done.push(task)
                } else {
                    const dayAfter = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
                    if (isSameDay(completedDate, dayAfter) && completedDate.getHours() < 4) {
                        cols.done.push(task)
                    }
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
        this_week: getProgress(cols.this_week, tasks.filter(t => {
            if (!t.completed_at) return false
            const d = new Date(t.completed_at)
            const now = new Date()
            const diff = now.getTime() - d.getTime()
            return diff < 7 * 24 * 60 * 60 * 1000
        }))
    }

    return { columns: cols, progressMap }
}
