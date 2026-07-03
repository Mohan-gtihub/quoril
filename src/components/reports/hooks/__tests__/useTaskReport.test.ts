import { describe, it, expect } from 'vitest'
import { computeTaskFocusLinkage } from '../useTaskReport'

describe('computeTaskFocusLinkage', () => {
  it('computes % of range-done tasks that had focus time and top tasks', () => {
    const taskFocus = [
      { taskId: 'a', title: 'A', status: 'done', focusSeconds: 3600 },
      { taskId: 'b', title: 'B', status: 'done', focusSeconds: 600 },
      { taskId: 'c', title: 'C', status: 'todo', focusSeconds: 1200 },
    ]
    const out = computeTaskFocusLinkage(taskFocus, 3)
    // 3 done-in-range tasks; 2 done tasks (a,b) appear in taskFocus -> 67%
    expect(out.linkedPct).toBe(67)
    expect(out.topTasks[0]).toEqual({ taskId: 'a', title: 'A', focusSeconds: 3600 })
    expect(out.topTasks[1]).toEqual({ taskId: 'b', title: 'B', focusSeconds: 600 })
    expect(out.topTasks).toHaveLength(2)
  })

  it('returns 0% when there are no done tasks in range', () => {
    expect(computeTaskFocusLinkage([], 0).linkedPct).toBe(0)
  })

  it('returns 0% when doneInRange is 0 even with focus data (avoid divide by zero)', () => {
    const taskFocus = [{ taskId: 'a', title: 'A', status: 'done', focusSeconds: 100 }]
    expect(computeTaskFocusLinkage(taskFocus, 0).linkedPct).toBe(0)
  })

  it('caps linkedPct at 100 when doneWithFocus exceeds doneInRange', () => {
    const taskFocus = [{ taskId: 'a', title: 'A', status: 'done', focusSeconds: 100 }]
    expect(computeTaskFocusLinkage(taskFocus, 1).linkedPct).toBe(100)
  })
})
