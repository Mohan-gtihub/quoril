import { describe, expect, it } from 'vitest'
import { getPlannerTaskBuckets } from '../plannerBuckets'
import type { Task } from '@/types/database'

const today = new Date()
const isoToday = today.toISOString()

function task(overrides: Partial<Task>): Task {
    return {
        id: 'task-id',
        user_id: 'user-id',
        list_id: 'list-a',
        title: 'Task',
        description: null,
        status: 'active',
        priority: 'medium',
        estimate_m: 0,
        spent_s: 0,
        started_at: null,
        due_at: null,
        completed_at: null,
        parent_id: null,
        sort_order: 0,
        created_at: isoToday,
        updated_at: isoToday,
        deleted_at: null,
        synced: 1,
        is_recurring: false,
        last_reset_date: null,
        estimated_minutes: 0,
        estimateMinutes: 0,
        actual_seconds: 0,
        focusSeconds: 0,
        due_date: null,
        due_time: null,
        parent_task_id: null,
        parentTaskId: null,
        sync_status: 'synced',
        ...overrides,
    }
}

describe('getPlannerTaskBuckets', () => {
    it('keeps completed tasks visible in All Tasks even when their list is missing', () => {
        const completed = task({
            id: 'done-from-archived-list',
            list_id: 'archived-list',
            status: 'done',
            completed_at: isoToday,
        })

        const { columns } = getPlannerTaskBuckets(
            [completed],
            'all',
            [{ id: 'list-a' }],
            today
        )

        expect(columns.done.map(t => t.id)).toEqual(['done-from-archived-list'])
    })

    it('uses updated_at as a fallback date for legacy completed tasks', () => {
        const completed = task({
            id: 'legacy-done',
            status: 'done',
            completed_at: null,
            updated_at: isoToday,
        })

        const { columns } = getPlannerTaskBuckets(
            [completed],
            'all',
            [{ id: 'list-a' }],
            today
        )

        expect(columns.done.map(t => t.id)).toEqual(['legacy-done'])
    })

    it('still filters non-all views to the selected list', () => {
        const selected = task({ id: 'selected', list_id: 'list-a', status: 'done', completed_at: isoToday })
        const other = task({ id: 'other', list_id: 'list-b', status: 'done', completed_at: isoToday })

        const { columns } = getPlannerTaskBuckets(
            [selected, other],
            'list-a',
            [{ id: 'list-a' }, { id: 'list-b' }],
            today
        )

        expect(columns.done.map(t => t.id)).toEqual(['selected'])
    })
})
