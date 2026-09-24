import { describe, it, expect } from 'vitest'
import { analyzeDayFit, learnedAdjustment, WORK_START_HOUR } from '../dayFitAnalyzer'
import type { Task } from '@/types/database'

function task(partial: Partial<Task>): Task {
    return {
        id: partial.id ?? crypto.randomUUID(),
        user_id: 'u',
        list_id: null,
        title: partial.title ?? 'Task',
        description: null,
        status: partial.status ?? 'todo',
        priority: partial.priority ?? 'medium',
        estimate_m: partial.estimate_m ?? 0,
        spent_s: partial.spent_s ?? 0,
        started_at: null,
        due_at: partial.due_at ?? null,
        completed_at: null,
        parent_id: partial.parent_id ?? null,
        sort_order: 0,
        created_at: '', updated_at: '', deleted_at: null, synced: 1,
        estimateMinutes: partial.estimateMinutes ?? partial.estimate_m ?? 0,
        focusSeconds: partial.focusSeconds ?? partial.spent_s ?? 0,
        parentTaskId: partial.parentTaskId ?? partial.parent_id ?? null,
        is_recurring: false,
    } as Task
}

const day = new Date(2026, 7, 11) // fixed local day

describe('learnedAdjustment', () => {
    it('defaults to 1.0 with fewer than 3 samples', () => {
        expect(learnedAdjustment([])).toBe(1.0)
    })
    it('uses the median actual/estimate and clamps to [0.75, 2.0]', () => {
        const history = [
            task({ status: 'done', estimateMinutes: 60, focusSeconds: 120 * 60 }), // 2x
            task({ status: 'done', estimateMinutes: 60, focusSeconds: 180 * 60 }), // 3x → clamp
            task({ status: 'done', estimateMinutes: 60, focusSeconds: 150 * 60 }), // 2.5x
        ]
        expect(learnedAdjustment(history)).toBe(2.0)
    })
})

describe('analyzeDayFit', () => {
    it('computes full capacity for an empty calendar (9h work window)', () => {
        const a = analyzeDayFit({ day, tasks: [], history: [], busy: [] })
        expect(a.capacityMinutes).toBe(9 * 60)
        expect(a.proposals).toHaveLength(0)
        expect(a.isOverloaded).toBe(false)
    })

    it('subtracts a busy interval from capacity', () => {
        const start = new Date(day); start.setHours(WORK_START_HOUR, 0, 0, 0)
        const end = new Date(day); end.setHours(WORK_START_HOUR + 1, 0, 0, 0)
        const a = analyzeDayFit({ day, tasks: [], history: [], busy: [{ start, end }] })
        expect(a.capacityMinutes).toBe(8 * 60)
    })

    it('proposes higher-priority tasks first and fits them into free windows', () => {
        const tasks = [
            task({ id: 'low', title: 'Low', priority: 'low', estimateMinutes: 30 }),
            task({ id: 'crit', title: 'Crit', priority: 'critical', estimateMinutes: 30 }),
        ]
        const a = analyzeDayFit({ day, tasks, history: [], busy: [] })
        expect(a.proposals[0].task.id).toBe('crit')
        expect(a.proposals[0].start.getHours()).toBe(WORK_START_HOUR)
    })

    it('excludes subtasks (parentTaskId set) and done tasks from proposals', () => {
        const tasks = [
            task({ id: 'child', parentTaskId: 'p', estimateMinutes: 30 }),
            task({ id: 'done', status: 'done', estimateMinutes: 30 }),
        ]
        const a = analyzeDayFit({ day, tasks, history: [], busy: [] })
        expect(a.proposals).toHaveLength(0)
    })

    it('flags overload when planned work exceeds capacity', () => {
        const tasks = Array.from({ length: 30 }, (_, i) =>
            task({ id: `t${i}`, estimateMinutes: 60 }))
        const a = analyzeDayFit({ day, tasks, history: [], busy: [] })
        expect(a.isOverloaded).toBe(true)
        expect(a.remainingMinutes).toBeLessThan(0)
    })
})
