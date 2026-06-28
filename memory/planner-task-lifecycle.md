---
name: planner-task-lifecycle
description: How Quoril planner columns/statuses work; follows Jira-style status-based kanban (no auto date-movement)
metadata:
  type: project
---

Quoril planner columns are derived purely from task `status` (no column field): `todo`=Backlog, `planned`=This Week, `active`/`paused`=Today, `done`=Done (see src/utils/columnMap.ts).

**Model decision (2026-06-28):** follow the **industrial / Jira kanban standard** — columns are status buckets and the board NEVER auto-moves cards by date. Cards stay in their column until the user moves them (drag or arrow). No auto-rollover of unfinished Today tasks (an earlier rollover-to-Backlog feature was considered then reverted because it's a planner pattern, not kanban). Backlog and This Week are not date-scoped; only Today and Done filter by the selected date.
