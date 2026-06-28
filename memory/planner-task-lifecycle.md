---
name: planner-task-lifecycle
description: How Quoril planner columns/statuses work and the day-rollover behavior decision
metadata:
  type: project
---

Quoril planner columns are derived purely from task `status` (no column field): `todo`=Backlog, `planned`=This Week, `active`/`paused`=Today, `done`=Done (see src/utils/columnMap.ts). Only Today and Done are date-scoped; Backlog and This Week are pure status buckets shown on every day.

**Day-rollover decision (2026-06-28):** unfinished Today tasks fall back to **Backlog** at the calendar-day change — implemented as `rolloverStaleTasks` in taskStore (moves non-recurring active/paused tasks whose due_date is missing or before today → `todo`), triggered from App.tsx on visibility/focus alongside `syncRecurringTasks`. First run on a device only stamps `quoril.lastRolloverDate` without sweeping. Recurring tasks are excluded (handled by `syncRecurringTasks`).

User chose NOT to date-scope This Week/Backlog (kept status-only) because those tasks generally carry no due_date and scoping would hide them.
