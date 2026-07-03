import { describe, it, expect } from 'vitest'
import { computeTaskFocusLinkage } from '../useTaskReport'

describe('computeTaskFocusLinkage', () => {
  it('computes % of done tasks that had focus time and top tasks', () => {
    const taskFocus = [
      { taskId: 'a', title: 'A', status: 'done', focusSeconds: 3600 },
      { taskId: 'b', title: 'B', status: 'done', focusSeconds: 600 },
      { taskId: 'c', title: 'C', status: 'todo', focusSeconds: 1200 },
    ]
    const tasks = [{ status: 'done' }, { status: 'done' }, { status: 'done' }, { status: 'todo' }]
    const out = computeTaskFocusLinkage(taskFocus, tasks)
    // 3 done tasks total; 2 done tasks (a,b) appear in taskFocus -> 67%
    expect(out.linkedPct).toBe(67)
    expect(out.topTasks[0]).toEqual({ taskId: 'a', title: 'A', focusSeconds: 3600 })
    expect(out.topTasks).toHaveLength(3)
  })

  it('returns 0% when there are no done tasks', () => {
    expect(computeTaskFocusLinkage([], [{ status: 'todo' }]).linkedPct).toBe(0)
  })
})
