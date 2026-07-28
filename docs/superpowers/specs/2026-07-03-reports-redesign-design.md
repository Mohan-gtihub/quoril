# Reports Page Redesign — Design Spec

**Date:** 2026-07-03
**Status:** Approved for planning
**Scope:** Personal single-user analytics. The shared "Performance Reports Hub" screenshot is used as **visual/layout inspiration only** — none of its team semantics (assignees, "your team's metrics") apply.

---

## 1. Goals

- Replace the current cluttered/redundant Reports UI with a **curated set of 6–7 scientifically meaningful productivity metrics**.
- Remove the redundant pair "Focus Minutes / Day" + "Focus Quality / Day" (collapse into one richer focus chart).
- Introduce two genuinely new high-value metrics that the data already supports but the UI never surfaced: **Distraction During Focus** and **Task ↔ Focus linkage**.
- Level up visualizations and animations to a consistent, professional system using **Recharts** (already installed at `^2.10.3` — no new dependency) plus framer-motion for card choreography.

## 2. Data availability (verified against schema)

Tables (from `electron/main/db.ts`):

- `focus_sessions(id, user_id, task_id, type, seconds, start_time, end_time, metadata, created_at)`
- `tasks(id, user_id, list_id, title, status, priority, estimate_m, spent_s, started_at, due_at, completed_at, parent_id, created_at, deleted_at)`
- `app_sessions(id, user_id, app_id, context_id, start_time, end_time, duration_seconds, idle_seconds, window_title, activity_level)` + `apps(category)` — **desktop build only**; web has no rows.

**Hard constraint:** app-tracking metrics (Context Switching, Distraction-During-Focus, Top Apps) only have data on desktop. The page must be **adaptive: those cards are hidden on web** (driven by a `hasAppData` flag), never shown as empty cards.

## 3. Metric definitions (locked)

| Metric | Definition | Source |
|---|---|---|
| **Deep Work Hours** | Sum of focus sessions where `type != 'break'` AND `seconds >= 1500` (≥25 min uninterrupted = one deep-work block). Report total hours + block count. | `focus_sessions` |
| **Focus Quality Score** | 0–100. Keep existing formula as baseline; on desktop, refine using real in-focus app-switch count instead of session-count proxy where available. | `focus_sessions` (+ `app_sessions` overlap on desktop) |
| **Peak Productivity Hours** | Focus seconds bucketed by hour-of-day (`strftime('%H', start_time)`, local time), 24 bins. Highlight the best window. Based on **focus time** (works on web too), not app-active time. | `focus_sessions` |
| **Task ↔ Focus linkage** | Join `focus_sessions.task_id → tasks`. Show (a) % of completed tasks that had ≥1 focus session, (b) top completed tasks ranked by focus minutes. | `focus_sessions` + `tasks` |
| **Distraction During Focus** (desktop) | For each focus window `[start_time, end_time]`, sum overlapping `app_sessions` whose category ∈ {Social, Entertainment, Gaming, News}. Report distraction seconds and % of focus time. | `focus_sessions` × `app_sessions` |
| **Planned vs Actual Work** | (a) estimate_m vs spent_s per completed task (keeps existing under/overestimated lists), (b) tasks with `due_at` today planned vs actually completed. | `tasks` |
| **Context Switching Rate** (desktop) | Existing per-day `app_sessions` count with Deep Work / Balanced / Scattered classification. | `app_sessions` |

## 4. Data layer changes

Extend `dbOps.getReportsDashboardData(userId, startDate, endDate)` in `electron/main/db.ts` with new queries, returned in the same single IPC payload:

1. `deepWork` — count + total seconds of sessions `type!='break' AND seconds>=1500`.
2. `peakHours` — `SELECT strftime('%H', start_time,'localtime') AS hour, SUM(seconds) FROM focus_sessions WHERE type!='break' AND user/date filter GROUP BY hour`.
3. `taskFocus` — per `task_id`: SUM(seconds) joined to task title/status; plus aggregate % of `status='done'` tasks having a linked session.
4. `distractionDuringFocus` (desktop) — overlap sum between focus windows and distracting `app_sessions` categories. Implemented as a correlated query over focus windows, or computed in JS from raw focus windows + app sessions if SQL overlap is unwieldy (decide in plan).
5. `plannedVsActual` — reuse existing estimate/spent data; add a `due_at` today planned-vs-completed count.

Add `hasAppData: boolean` to the payload (true when any `app_sessions` rows exist in range).

New/updated hooks in `src/components/reports/hooks/`:
- `useFocusReport` — add deep-work aggregation, peak-hours series, drop nothing but expose a single combined focus+deepwork series for the merged chart.
- `useTaskReport` — add task↔focus linkage + planned-vs-actual-today.
- `useAppReport` — add distraction-during-focus.
- `useReportsData` — thread `hasAppData` through.

## 5. UI structure

`src/components/reports/Reports.tsx` rebuilt around a curated layout.

**KPI strip (4 tiles):**
- Deep Work Hours · Focus Quality Score · Tasks Done · Distraction % — on web the Distraction tile is replaced by Avg Session (existing).

**Bento grid cards:**
1. **Focus & Deep Work Trend** — single Recharts composed/area chart replacing the two redundant day-bar cards (total focus area + deep-work band overlay + 7-day moving avg line).
2. **Peak Productivity Hours** — Recharts hour-of-day bar (or radial), best window highlighted.
3. **Task ↔ Focus Linkage** — gauge ("X% of done tasks were focused") + top tasks by focus time.
4. **Planned vs Actual** — diverging bars (estimate vs actual) + under/overestimated lists.
5. **Context Switching** *(desktop only)* — Recharts, Deep Work/Balanced/Scattered classification.
6. **Top Apps / Distraction** *(desktop only)* — bar list + top distraction callout.
7. **Workspace Productivity** — kept largely as-is (already effective).

Cards 5 & 6 render only when `hasAppData` is true.

## 6. Visual & animation system

- **Recharts** for all series charts: consistent tooltips, `ResponsiveContainer`, entrance animation via `isAnimationActive` + `animationDuration ≈ 600ms` ease-out.
- **framer-motion** limited to card mount/stagger and KPI number count-up.
- **One shared color/legend system** reusing existing CSS vars (`--focus`, `--wellbeing`, `--break`, `--violet`, `--error`, `--track`) so every chart reads as one family; light + dark aware.
- Follow the **dataviz** skill for palette/mark/legend consistency and the **frontend-design** skill for overall polish during implementation.

## 7. Out of scope (YAGNI)

- No team/multi-user aggregation (single-user scoped queries stay as-is).
- No configurable deep-work threshold UI (hardcode 25 min; revisit later).
- No new tracking data collection — everything is computed from data already stored.
- No web app-tracking backfill.

## 8. Testing

- Extend `src/components/reports/__tests__/webReports.test.tsx`: assert app-tracking cards are hidden when `hasAppData` is false, and focus/task cards still render.
- Unit-test new hook aggregations (deep-work threshold boundary at exactly 1500s, empty ranges, peak-hour bucketing, task↔focus % with zero completed tasks).
- Manual verification via the `/run` and `verify` flow on desktop with real data.
