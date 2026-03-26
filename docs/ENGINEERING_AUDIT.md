is my app autidt# Quoril — Full Engineering Audit & Product Review
**Reviewer:** Senior Engineer / System Architect
**Date:** 2026-03-26
**Branch:** `feature/quoril`
**Verdict:** Solid foundation with real architectural thinking. Not production-ready. Specific, fixable problems across every layer.

---

## Table of Contents

1. [Current System Overview](#1-current-system-overview)
2. [Code Quality & Structure](#2-code-quality--structure)
3. [Architecture & Scalability](#3-architecture--scalability)
4. [Database & Data Handling](#4-database--data-handling)
5. [Security](#5-security)
6. [Performance](#6-performance)
7. [Edge Cases & Reliability](#7-edge-cases--reliability)
8. [Production Readiness — What's Missing](#8-production-readiness--whats-missing)
9. [Product Thinking — Quoril vs Blitzit](#9-product-thinking--quoril-vs-blitzit)
10. [Refactoring Plan — Prioritized](#10-refactoring-plan--prioritized)
11. [Scalable Architecture Proposal](#11-scalable-architecture-proposal)
12. [Final Scorecard](#12-final-scorecard)

---

## 1. Current System Overview

Quoril is an **offline-first Electron desktop app** for focus and habit tracking.

| Layer | Technology | Assessment |
|---|---|---|
| UI | React 18 + TailwindCSS | Good |
| State | Zustand | Good, with issues |
| Local DB | SQLite (better-sqlite3) | Good |
| Cloud | Supabase (Postgres + Auth) | Needs RLS audit |
| Sync | Custom bidirectional push | Clever but fragile |
| IPC Bridge | Electron contextBridge | Correct pattern |
| Auth | Supabase + custom layer | Over-engineered in wrong places |

### Tech Stack
- **Desktop:** Electron 28.3.3
- **Frontend:** React 18.2.0 + TypeScript 5.2.2
- **Build:** Vite 5.4.11
- **Styling:** TailwindCSS 3.4.0
- **State:** Zustand 4.5.7 + React Query 5.17.0
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Local DB:** SQLite via better-sqlite3 9.4.3

### Core Architectural Pattern
The app uses an **offline-first with cloud sync** pattern:
1. Every write goes to local SQLite first
2. A `dataSyncService` runs every 10 seconds, pushing `synced=0` rows to Supabase
3. Supabase Realtime subscriptions pull remote changes back
4. `updated_at` timestamp wins conflict resolution

This is architecturally sound. The execution has gaps — documented below.

---

## 2. Code Quality & Structure

### 2.1 Critical Anti-Patterns

#### Raw SQL via Dynamic Column Names — SQL Injection Risk
**File:** [`src/services/localStorage.ts:193`](../src/services/localStorage.ts#L193)

```ts
await db().exec(
  `UPDATE tasks SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`,
  [...Object.values(row), id]
)
```

The column names in `keys` come from the `updates` object passed in from stores. SQLite parameterisation (`?`) protects **values** but not **identifiers**. Column names are string-interpolated directly. If any caller passes untrusted data as object keys, this is SQL injection through column names. The same pattern exists in `db.ts:saveTask`, `saveList`, `saveWorkspace`.

**Fix:** Maintain an explicit allowlist of column names per table. Filter `keys` against the allowlist before building the SQL string.

---

#### `db:exec` IPC Exposes Raw SQL to the Renderer
**File:** [`electron/preload/index.ts:73`](../electron/preload/index.ts#L73)

```ts
exec: (sql: string, params: any[]) => ipcRenderer.invoke('db:exec', sql, params),
```

You are exposing a raw SQL execution endpoint to the renderer process. Even with `contextIsolation: true` and `sandbox: true`, any XSS or compromised dependency in your React code can now run arbitrary SQL on the user's local database. This is the most dangerous line in the codebase.

**Fix:** Remove `db:exec` from the preload and the IPC handler entirely. Every database operation must go through a named, purpose-built, validated IPC handler.

---

#### `getPending` and `markSynced` Take Unvalidated Table Names
**File:** [`electron/main/db.ts:192`](../electron/main/db.ts#L192)

```ts
getPending(table: string) {
    return exec(`SELECT * FROM ${table} WHERE synced = 0 LIMIT 50`)
}
```

`table` is passed directly from the renderer via IPC. The IPC handler does not validate it. This is a direct SQL injection vector — a compromised renderer can query any table in the database.

**Fix:** In the `ipcMain.handle('db:getPending')` handler, validate `table` against the `SYNC_ORDER` constant before calling `dbOps`.

---

#### Duplicate `useEffect` in App.tsx
**File:** [`src/App.tsx:91`](../src/App.tsx#L91) and [`src/App.tsx:127`](../src/App.tsx#L127)

Both effects are identical — they add/remove the `super-focus-mode` class on the document root based on `settings.superFocusMode`. This is a copy-paste bug. One of them is dead code. It makes the file misleading to read and introduces two event listener registrations for the same purpose.

---

#### `pauseTask` Exists but Is Not in the Interface
**File:** [`src/store/taskStore.ts:342`](../src/store/taskStore.ts#L342)

`pauseTask` is implemented inside the store object but is not declared in the `TaskState` TypeScript interface. TypeScript cannot see it. Callers cannot type-safely reference it. This indicates the interface has diverged from the implementation — a sign of ongoing drift.

---

#### `celebratedTask: any`
**File:** [`src/store/focusStore.ts:52`](../src/store/focusStore.ts#L52)

```ts
celebratedTask: any | null
```

The codebase has a full `Task` type defined in `types/database.ts`. Using `any` here means the celebration modal cannot safely access task fields without risking runtime errors. The comment `// This is 'any' type in state, technically Task` confirms the developer knows this is wrong.

---

### 2.2 Naming & Consistency — Three Names for the Same Concept

The same piece of data has different names depending on where it lives:

| Concept | SQLite column | App layer (`mapTask`) | FocusStore | Supabase |
|---|---|---|---|---|
| Time spent on task | `spent_s` | `actual_seconds` | `elapsed` | `spent_s` |
| Estimated duration | `estimate_m` | `estimated_minutes` | `duration` (goal) | `estimate_m` |
| Subtask completion | `done` (INTEGER) | `completed` (boolean) | — | `done` (boolean) |

This creates defensive code everywhere: `sub.completed || sub.done`, `task.estimate_m || task.estimated_minutes`. Every new developer must learn the mapping. Every new store operation risks using the wrong field name.

**Fix:** Pick one canonical name per concept. Apply it end-to-end. Use the mapping layer (`mapTask`) as the single translation point and enforce it.

---

### 2.3 ListStore — Alias Accumulation

**File:** [`src/store/listStore.ts`](../src/store/listStore.ts)

The store has two levels of duplication:

**Duplicate state:**
- `archived` and `archivedLists` — both set to the same data in `loadArchived`. One is redundant.

**Duplicate operations (10 functions for 5 operations):**

| Real function | Alias | Comment in code |
|---|---|---|
| `create` | `createList` | "COMPATIBILITY FOR OLD UI" |
| `update` | `updateList` | same |
| `archive` | `deleteList` | same |
| `restore` | `restoreList` | same |
| `duplicate` | `duplicateList` | same |

The comment `/* 🔥 COMPATIBILITY FOR OLD UI */` is a code smell. If the old UI is gone, remove the aliases. If it isn't gone, that's a separate architectural problem.

---

### 2.4 Folder Structure Inconsistency

The `reports` feature has a mature internal structure:
```
src/components/reports/
    components/    ← 15 sub-components
    hooks/         ← 5 hooks
    types/         ← typed contracts
```

No other feature (`focus/`, `planner/`, `dashboard/`) follows this pattern despite having equivalent complexity. Pick one structure and apply it uniformly across all features.

---

## 3. Architecture & Scalability

### 3.1 The Sync Engine — Real Failure Modes

The `dataSyncService` is the most important service in the app. The design is correct. The execution has three specific problems.

#### Session Verification Per Row (200 Network Calls)
**File:** [`src/services/dataSyncService.ts:139`](../src/services/dataSyncService.ts#L139)

Inside the per-row sync loop, every row triggers `supabase.auth.getSession()`. If a user has 200 pending rows after being offline, that is 200 network round-trips just to verify the auth token before even pushing data. Auth should be verified once per sync cycle, not once per row.

#### `syncFromCloud` in ListStore Runs Parallel Sync Logic
**File:** [`src/store/listStore.ts:145`](../src/store/listStore.ts#L145)

`listStore.syncFromCloud()` manually fetches from Supabase and writes to SQLite. This duplicates the `dataSyncService` logic and creates a race condition: if both run simultaneously, one can overwrite the other's writes. There are now two independent sync mechanisms for lists — the `dataSyncService` and this manual method.

**Fix:** Remove `syncFromCloud` from the list store. Let `dataSyncService` handle all cloud-to-local merging. Use Supabase Realtime for push notifications, and respond to those by calling `load()` (local DB only), not by fetching from Supabase again.

#### `LIMIT 50` is a Silent Ceiling With No User Feedback
**File:** [`electron/main/db.ts:192`](../electron/main/db.ts#L192)

```ts
getPending(table: string) {
    return exec(`SELECT * FROM ${table} WHERE synced = 0 LIMIT 50`)
}
```

If a user creates 200 tasks while offline, they need 4 sync cycles to fully sync. There is no indicator to the user that sync is partial. No "X items pending." No progress bar. No warning. The user assumes their data is safe when it may not be fully uploaded yet.

---

### 3.2 State Management Problems

#### FocusStore at 715 Lines Is Doing Too Much
**File:** [`src/store/focusStore.ts`](../src/store/focusStore.ts)

The store manages five distinct concerns: timer tick state, Pomodoro/break logic, DB session lifecycle, celebration state, and session history. This makes it very hard to reason about individual behaviors.

**Suggested split:**
- `timerStore` — `elapsed`, `startTime`, `isActive`, `isPaused`
- `pomodoroStore` — break timing, interval configuration
- `sessionStore` — session records, `fetchSessions`, history

#### ListStore Is Persisted but Shouldn't Be
**File:** [`src/store/listStore.ts:537`](../src/store/listStore.ts#L537)

```ts
persist((set, get) => ({ ... }), {
    name: 'list-store',
    partialize: (state) => ({ selectedListId: state.selectedListId, lists: state.lists })
})
```

Persisting `lists` means that on every app launch, the UI shows stale data from the previous session before the async `load()` call completes. You now have three sources of truth for lists: SQLite (correct), localStorage (stale Zustand state), and Supabase (cloud). The correct fix is to only persist UI state (`selectedListId`) and let the DB be the source for data.

#### `fetchTasks` Triggers `syncRecurringTasks` on Every Call
**File:** [`src/store/taskStore.ts:104`](../src/store/taskStore.ts#L104)

Every `fetchTasks` call chains into `syncRecurringTasks`. `fetchTasks` is called on component mount, on visibility change, and on window focus events. `syncRecurringTasks` iterates all tasks and does sequential `updateTask` calls — each of which makes a network request (see §3.3 below). This path is called multiple times per session.

---

### 3.3 Network Call on Every Task Update

**File:** [`src/services/localStorage.ts:135`](../src/services/localStorage.ts#L135)

Every call to `tasks.update` — regardless of what fields are changing — calls `getExistingDueDateTime`, which does:

```ts
const { data } = await supabase.from('tasks').select('due_at').eq('id', taskId).single()
```

This is a **Supabase network request on every task update**. A task status change, a sort order update, a time increment — all trigger this fetch. The function is called unconditionally:

```ts
await updateDueDateTime(id, row, updates) // always called
```

**Fix:** Guard with `if (updates.due_date !== undefined || updates.due_time !== undefined)`. Only fetch the existing date when you're actually changing date fields.

---

## 4. Database & Data Handling

### 4.1 `synced` Column Exists in Supabase Type Definitions

**File:** [`src/types/database.ts:38`](../src/types/database.ts#L38)

```ts
Row: {
    ...
    synced: number  // ← this should not exist in Supabase
}
```

`synced` is a local SQLite tracking field. It should never exist in Supabase. If Supabase actually has this column, it is accidental schema pollution. If it doesn't, the type definition is lying and will cause TypeScript to accept code that will fail at runtime. Either way, the type file is incorrect.

### 4.2 `Task` Type Is a Leaky Abstraction

**File:** [`src/types/database.ts:280`](../src/types/database.ts#L280)

```ts
export type Task = Database['public']['Tables']['tasks']['Row'] & {
    actual_seconds?: number
    estimated_minutes?: number
    due_date?: string | null
    ...
}
```

The app `Task` type extends the Supabase Row type, meaning `task.estimate_m` and `task.estimated_minutes` can both exist on the same object simultaneously. The `mapTask` function sets `estimated_minutes = row.estimate_m`, but `estimate_m` is still present. Any code accidentally using `task.estimate_m` will silently work sometimes and return stale data others.

**Fix:** Separate `DbTask` (raw DB row) from `Task` (app domain type). Never expose `DbTask` to components. The `mapTask` function is the sole translation point.

### 4.3 Missing Composite Indexes

Migration v8 added indexes for `start_time` and `completed_at`, but the most frequent query patterns are unindexed:

| Query pattern | Missing index |
|---|---|
| `WHERE user_id=? AND deleted_at IS NULL` (tasks) | `(user_id, deleted_at)` |
| `WHERE task_id=?` (subtasks) | `task_id` |
| `WHERE user_id=?` (focus_sessions) | already has partial via start_time, but user_id filter hits full scan |

As data grows, every task list load will do a full table scan filtered by `user_id`.

### 4.4 `focus.deleteAll` Hard-Deletes Locally But Not in Cloud

**File:** [`src/services/localStorage.ts:601`](../src/services/localStorage.ts#L601)

```ts
await db().exec('DELETE FROM focus_sessions WHERE user_id = ?', [user.id])
```

This is a hard delete in SQLite. The sync engine operates on `synced = 0`. After the hard delete, there are no rows with `synced = 0` for the sync engine to push. Supabase still has all the sessions. The user clears their history locally, believes it is gone, but it persists indefinitely in the cloud. On the next device sync, the sessions come back.

### 4.5 `getSessions` Caps at 100 Rows

**File:** [`electron/main/db.ts:129`](../electron/main/db.ts#L129)

```ts
getSessions(userId: string) {
    return exec("SELECT * FROM focus_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 100", [userId])
}
```

Reports, streak calculations, and focus distribution all run against the sessions array. For a user who has been using the app for several months, the 100-session cap silently truncates history. Streak calculations will show `0` incorrectly. Long-range reports will show incomplete data. The user sees wrong numbers and loses trust in the app.

---

## 5. Security

### 5.1 Critical Vulnerabilities

| Issue | File | Severity |
|---|---|---|
| `db:exec` IPC exposes raw SQL execution to renderer | `preload/index.ts:73` | **Critical** |
| Column names in dynamic SQL are not validated against allowlist | `localStorage.ts:193`, `db.ts:57,100` | **High** |
| `getPending(table)` and `markSynced(table)` accept unvalidated table names from renderer | `index.ts:435,439` | **High** |
| DevTools keyboard shortcuts registered in production builds | `index.ts:138` | **High** |
| `ELECTRON_DISABLE_SECURITY_WARNINGS` set unconditionally | `index.ts:25` | **Medium** |
| `secureStore` uses base64, documented as "encryption" | `securityUtils.ts:447` | **Medium** |

### 5.2 The Custom Session Layer Is Broken After Restart

**File:** [`src/utils/securityUtils.ts:307`](../src/utils/securityUtils.ts#L307)

```ts
const sessionStore = new Map<string, SessionData>()
```

The `createSession`, `validateSession`, `sessionStore` functions implement a second session management layer on top of Supabase Auth. This `Map` is in memory. On every app restart, it is empty. The `checkSessionValidity` in `authStore` calls `validateSession(state.session.access_token)`. Since the token is not in the in-memory map after a restart, this returns `{ valid: false, reason: 'not-found' }`, which triggers `signOut()`.

**This is a latent bug that signs users out on every restart in certain conditions.** It has not been caught because `initialized` gating prevents the check from running too early, but as usage patterns vary it will surface.

**Fix:** Remove the custom `sessionStore` entirely. Supabase JWTs have expiry built in. Use `supabase.auth.onAuthStateChange` and the Supabase session lifecycle. The inactivity timeout logic (checking `lastActivity`) is valid — implement it purely against the Zustand `lastActivity` state without the in-memory session map.

### 5.3 DevTools Accessible in Production

**File:** [`electron/main/index.ts:138`](../electron/main/index.ts#L138)

```ts
// Register devtools shortcuts regardless of environment for debugging
globalShortcut.register('CommandOrControl+Shift+I', () => { ... })
globalShortcut.register('F12', () => { ... })
```

The comment explicitly says "regardless of environment." Production users can press F12 and open DevTools. They can inspect all Zustand state, see your Supabase anon key, read localStorage, and run arbitrary JavaScript in the renderer. This must be gated on `isDev`.

### 5.4 `secureStore` Is Not Secure

**File:** [`src/utils/securityUtils.ts:446`](../src/utils/securityUtils.ts#L446)

```ts
// In production, you would encrypt this value
// For now, we'll use base64 encoding as a basic obfuscation
const encoded = btoa(value)
localStorage.setItem(`secure_${key}`, encoded)
```

Base64 is encoding, not encryption. Any "for now" comment on a security function will outlive its intention. Either implement real encryption using the Web Crypto API (`window.crypto.subtle`), or remove the function and use Supabase session storage directly. The danger is that future code will use `secureStore` under the assumption that it is actually secure.

### 5.5 Rate Limiter Is Ephemeral

**File:** [`src/utils/securityUtils.ts:184`](../src/utils/securityUtils.ts#L184)

The `rateLimitStore` is an in-memory `Map`. Every app restart resets all rate limit state. A user locked out for 5 failed login attempts can simply restart the app. For a desktop app this is less severe than a web app, but it means your rate limiting provides no real protection. The correct fix is to persist rate limit state to the Electron `app.getPath('userData')` directory, or rely on Supabase's server-side rate limiting.

---

## 6. Performance

### 6.1 Reports Recalculate Every Second While Timer Is Active

**File:** [`src/components/reports/hooks/useReportsController.ts:78`](../src/components/reports/hooks/useReportsController.ts#L78)

```ts
const activeVirtualSession = useMemo(() => {
    ...
}, [isActive, startTime, taskId, sessionType, tick]) // ← tick increments every second
```

`tick` increments every 1000ms. `activeVirtualSession` depends on `tick`. `allSessions` depends on `activeVirtualSession`. `stats` depends on `allSessions`. The `stats` memo runs: session filtering, `calculateMultiDayStats` (O(sessions × days)), `calculateFocusDistribution`, `calculateStreak`, and completed task grouping — all in the React render thread **every second** while the timer runs.

**Fix:** Separate live display from analytical stats. The timer display needs only a lightweight elapsed value updated every second. The stats block should only recompute when the date range changes or a session is committed.

### 6.2 `syncRecurringTasks` Is Sequential Awaits in a Hot Path

**File:** [`src/store/taskStore.ts:481`](../src/store/taskStore.ts#L481)

```ts
for (const task of toReset) {
    await updateTask(task.id, { ... })  // sequential, one by one
}
```

Each `updateTask` call:
1. Runs `parseTitleForTime`
2. Calls `localService.tasks.update` which calls `getExistingDueDateTime` (a Supabase network call)
3. Runs an IPC call to SQLite
4. Calls `dataSyncService.trigger()`

For 10 recurring tasks, that is 10 sequential Supabase network calls on a path triggered by every `fetchTasks`. This should be `Promise.all` with a batch update operation.

### 6.3 `calculateMultiDayStats` Is O(sessions × days)

**File:** [`src/utils/timeCalculations.ts:130`](../src/utils/timeCalculations.ts#L130)

For each day in the range, `calculateDayFocus` iterates all sessions and filters by date string. For a 30-day report with 500 sessions, that is 15,000 iterations per render. This should be a single-pass `reduce` that buckets sessions by date key (`yyyy-MM-dd`), then maps over days to look up the bucket.

---

## 7. Edge Cases & Reliability

### 7.1 System Sleep/Wake Produces Phantom Timer Values

If the computer sleeps while the focus timer is running, `startTime` is preserved in localStorage. On wake, `Date.now() - startTime` can be hours. `syncTimer` computes `delta` without clamping:

```ts
const delta = Math.floor((now - s.startTime) / 1000)  // can be 28800 (8 hours)
```

`backupService.save(s.taskId, total)` is called with a multi-hour value. The task's `actual_seconds` is corrupted. The user's time reports are permanently inflated for that task.

**Fix:** In `syncTimer`, clamp `delta` to a reasonable maximum (e.g. 1 hour). If `delta > 3600`, force-pause the session and show a toast: "Session paused — long inactivity detected."

### 7.2 `toggleComplete` Is One-Way by Design Without a Decision

**File:** [`src/store/taskStore.ts:306`](../src/store/taskStore.ts#L306)

```ts
if (task.status === 'done') return  // "we might want to move back to 'today'?"
```

The comment says "we might want to" — this decision was never made. Real users frequently complete a task by accident. The inability to undo a completion is a daily frustration. Either make it explicitly one-way by design (with a "Reopen" action that is separate and intentional), or implement the toggle properly.

### 7.3 Deep Link Handler Calls `window.location.reload()`

**File:** [`src/App.tsx:182`](../src/App.tsx#L182)

```ts
window.location.reload()
```

After a successful PKCE OAuth exchange, a full renderer reload is triggered. All non-persisted Zustand state is destroyed. If a focus session was active (and `startTime` is not persisted), the session context is lost. The user authenticated successfully but lost their in-progress work.

**Fix:** Instead of `reload()`, call `supabase.auth.getSession()` and dispatch to `authStore.setSession`. No reload needed — `onAuthStateChange` should fire automatically.

### 7.4 `startSession` Calls `window.electronAPI` Outside Try/Catch

**File:** [`src/store/focusStore.ts:320`](../src/store/focusStore.ts#L320)

```ts
} catch (e) {
    console.error('[Focus] start failed', e)
}

window.electronAPI.tracker.setContext(taskId)  // ← outside try/catch
```

This line is called after the try/catch block closes. If `window.electronAPI` is undefined (test environment, web build, preload failure), this throws an uncaught error that crashes the focus start flow silently.

### 7.5 `permanentDeleteTask` and `archiveTask` Are the Same Operation

**File:** [`src/store/taskStore.ts:251`](../src/store/taskStore.ts#L251) and [`src/store/taskStore.ts:272`](../src/store/taskStore.ts#L272)

Both set `deleted_at = new Date().toISOString()`. The "permanent delete" is neither permanent nor a delete. The data persists in SQLite and Supabase indefinitely. The UI labels are misleading to users. This is a product-level dishonesty problem, not just a code smell.

---

## 8. Production Readiness — What's Missing

### 8.1 Missing Entirely

| Item | Priority | Notes |
|---|---|---|
| Zero tests | **Critical** | No unit, integration, or e2e tests anywhere |
| No Supabase RLS policies | **Critical** | Without RLS, all users can read each other's data if they have the anon key |
| No error reporting | **High** | Crashes write to a desktop `.log` file — no remote visibility |
| No analytics / telemetry | **High** | Cannot see what features are used or where users drop off |
| No auto-update mechanism | **Medium** | electron-builder supports this; not configured |
| No CI/CD pipeline | **Medium** | No `build.yml`, no type-check on PR, no automated release |
| No `.env.example` | **Low** | Other developers cannot bootstrap the project |

### 8.2 Partially Implemented

| Item | Status |
|---|---|
| Crash logging | Writes to desktop `.log` — no structured logging, no log rotation, no remote ingestion |
| Session monitoring | Logic is correct but broken after restart (custom sessionStore issue, §5.2) |
| Input validation | Good in `dataValidation.ts` — but not enforced at the IPC boundary |
| Offline support | Works for core CRUD — breaks for reports, session history |
| Sync progress | Engine runs but no user-facing indicator of sync state |

---

## 9. Product Thinking — Quoril vs Blitzit

This section evaluates Quoril not as a codebase, but as a product experience. The comparison is against Blitzit as the target bar.

---

### 9.1 Trust Layer — The Biggest Gap

Users don't consciously think "this app has a security flaw." They think: *"this app feels risky"* or *"I'm not sure my data is safe."*

Blitzit gives users confidence that:
- Their data won't disappear
- The app won't behave unpredictably
- Nothing shady is happening under the hood

Quoril currently breaks trust on three specific points:

| Behavior | User Interpretation |
|---|---|
| `LIMIT 50` sync with no progress indicator | "Did my data upload?" |
| `permanentDelete` that isn't permanent | "I deleted this but it came back" |
| Ghost timer state after wake | "My time tracking is wrong" |
| Sessions coming back after "clearing history" | "This app is doing something I didn't ask for" |

**The rule:** Trust is built by predictable behavior and broken by invisible exceptions.

---

### 9.2 Predictability — "It Just Works" vs "Usually Works"

Blitzit likely:
- Syncs instantly and shows a status indicator
- Never shows stale data on launch
- Handles sleep/wake and offline cleanly

Quoril currently:
- Shows stale Zustand state briefly on launch (persisted listStore)
- Partially syncs without informing the user
- Can produce ghost timer states after system sleep
- Resets recurring tasks multiple times due to `fetchTasks` trigger frequency

The difference between an **engineer-built system** and a **user-ready product** is that the product handles the boring edge cases invisibly. The user never encounters them.

---

### 9.3 UX Polish — Micro-Interactions and Feedback

Blitzit likely has:
- Smooth transitions on every state change
- Consistent terminology throughout
- Clear feedback states (loading, syncing, success, error)
- Intentional empty states that guide the user

Quoril issues in this area:
- Naming inconsistencies (`spent_s` / `elapsed` / `actual_seconds`) leak into ambiguous UI copy
- Duplicate APIs (10 functions for 5 list operations) create inconsistent behavior across screens
- No user-facing sync state — users don't know if they're online, syncing, or up-to-date
- `toggleComplete` silently ignores completed tasks without feedback

**Users interpret inconsistency as incompleteness.** Even if the feature works, if it behaves differently in different places, the app feels unfinished.

---

### 9.4 Mental Model Clarity

Blitzit has a simple story: *Start focus → track time → see results.*

Quoril internally manages:
- Tasks + subtasks
- Focus sessions (multiple types)
- Recurring task logic
- Workspace/list hierarchy
- A sync engine
- Multiple timer modes

That complexity is fine — it enables powerful features. But it must not leak into the UI. Currently it does:

- Users can see duplicate list actions (archive vs delete doing the same thing)
- `toggleComplete` being one-way without a clear "Reopen" affordance
- Reports showing wrong data when history is capped at 100 sessions
- Clearing history locally doesn't clear it from cloud

**Complexity inside the system is acceptable. Complexity visible to the user is product debt.**

---

### 9.5 Error Handling and Recovery

Blitzit likely:
- Retries automatically and transparently
- Shows clear, actionable error messages
- Never silently fails

Quoril currently:
- Silently caps sync at 50 rows
- Silent network errors in `syncRecurringTasks` are swallowed with `console.error`
- No retry visibility
- No crash reporting (only a desktop log file that users never see)

**The worst-case scenario:** User thinks their data is saved. It isn't. They churn. You never know why because there's no telemetry.

---

### 9.6 Observability — Flying Blind

Blitzit's team likely knows:
- Where users drop off in the onboarding flow
- Which features are actually used
- Crash rates by version

Quoril currently has:
- No analytics
- No error tracking (Sentry or equivalent)
- No telemetry
- A desktop crash log that users would have to manually email to you

You cannot tell if a feature is broken in production. You cannot tell if anyone uses the Reports section. You cannot tell if users are churning because of ghost timer states or sync failures.

**You cannot fix what you cannot see.**

---

### 9.7 Auth Complexity

Blitzit likely:
- Relies on a single auth system
- Has strict backend rules enforced server-side

Quoril:
- Has a custom `sessionStore` that duplicates Supabase Auth
- The custom layer breaks after every restart (§5.2)
- Supabase RLS status is unknown

The result is an auth system that is more complex than it needs to be, less reliable than it should be, and potentially insecure at the data layer.

---

### 9.8 Performance Consistency

Blitzit: Stable CPU usage. Predictable responsiveness.

Quoril:
- Reports page recomputes heavy analytics every second while timer runs
- Sequential async operations in recurring task sync
- Unnecessary Supabase network call on every task update
- 10-second sync interval with no backoff

Users feel this as "the app gets laggy when I'm in a focus session." That is exactly when you want the app to feel fastest.

---

### 9.9 Opinionated Product Decisions — Still Evolving

Blitzit made clear decisions about what things mean:
- What completing a task does
- How focus sessions relate to tasks
- What "done" means in every context

Quoril shows signs of undecided behavior:
- `toggleComplete` is one-way — but the code says "we might want to change this"
- "Permanent delete" that isn't permanent
- Archive and delete doing the same thing
- Duplicate APIs "for UI compatibility" with a UI that may no longer exist

Each undecided behavior becomes a UX inconsistency. Each inconsistency costs user trust.

---

### 9.10 The Real Difference — Condensed

| Area | Blitzit | Quoril |
|---|---|---|
| Trust | High | Fragile |
| Sync clarity | Clear | Implicit / hidden |
| UX polish | Refined | Inconsistent |
| Reliability | Predictable | Edge-case prone |
| Performance | Stable | Spiky |
| Security | Hardened | Vulnerable |
| Observability | Strong | None |
| Error recovery | Visible | Silent |
| Product clarity | Opinionated | Still evolving |
| Data integrity | Guaranteed | Situational |

---

### 9.11 The Core Truth

Quoril doesn't lack capability. It lacks **refinement, safety, and decisiveness.**

> Systems can be refined into products.
> Shallow products cannot grow into deep systems.

Quoril is in the right position. The foundation exists. The gap to a production product is real but bridgeable.

---

## 10. Refactoring Plan — Prioritized

### Phase 1 — Security & Correctness (Do Before Any Release)

These are not optional. Do them before shipping to any real user.

| # | Task | File | Impact |
|---|---|---|---|
| 1 | Remove `db:exec` from preload and IPC | `preload/index.ts`, `index.ts` | Critical |
| 2 | Validate table names in `getPending` and `markSynced` against `SYNC_ORDER` | `index.ts:435,439` | Critical |
| 3 | Whitelist column names in all dynamic SQL builders | `localStorage.ts`, `db.ts` | High |
| 4 | Gate DevTools shortcuts behind `isDev` | `index.ts:138` | High |
| 5 | Remove `ELECTRON_DISABLE_SECURITY_WARNINGS` or gate on `isDev` | `index.ts:25` | Medium |
| 6 | Remove custom `sessionStore` — trust Supabase session lifecycle | `securityUtils.ts` | High |
| 7 | Fix duplicate `useEffect` in App.tsx | `App.tsx:91,127` | Low |
| 8 | Write Supabase RLS policies for all tables | Supabase Dashboard | Critical |

---

### Phase 2 — Data Integrity (Do Before Beta)

| # | Task | File | Impact |
|---|---|---|---|
| 9 | Fix `focus.deleteAll` — soft-delete or sync deletion to cloud | `localStorage.ts:587` | High |
| 10 | Guard `getExistingDueDateTime` call — only when date fields change | `localStorage.ts:183` | High |
| 11 | Remove auth verification from per-row loop in sync engine | `dataSyncService.ts:139` | Medium |
| 12 | Remove `LIMIT 100` from `getSessions` — paginate or remove cap | `db.ts:129` | High |
| 13 | Separate `DbTask` from app `Task` type | `types/database.ts` | Medium |
| 14 | Add composite index `(user_id, deleted_at)` on tasks | `db.ts:autoMigrate` | Medium |
| 15 | Add index on `subtasks(task_id)` | `db.ts:autoMigrate` | Medium |

---

### Phase 3 — Performance (Do Before Public Launch)

| # | Task | File | Impact |
|---|---|---|---|
| 16 | Decouple live tick from stats recalculation in `useReportsController` | `useReportsController.ts:78` | High |
| 17 | Make `syncRecurringTasks` parallel with `Promise.all` | `taskStore.ts:481` | Medium |
| 18 | Clamp `delta` in `syncTimer` — max 1 hour, force-pause on overflow | `focusStore.ts:570` | Medium |
| 19 | Optimize `calculateMultiDayStats` to single-pass bucket approach | `timeCalculations.ts:130` | Low |

---

### Phase 4 — Structural Cleanup (Do Incrementally)

| # | Task | File | Impact |
|---|---|---|---|
| 20 | Remove `archived`/`archivedLists` duplication — keep one | `listStore.ts` | Medium |
| 21 | Remove alias functions from listStore or replace old callers | `listStore.ts` | Medium |
| 22 | Remove listStore from persist middleware for `lists` array | `listStore.ts:537` | Medium |
| 23 | Remove `syncFromCloud` from listStore — let dataSyncService own this | `listStore.ts:145` | Medium |
| 24 | Standardize naming — one canonical name per concept end-to-end | everywhere | High |
| 25 | Type `celebratedTask` as `Task` | `focusStore.ts:52` | Low |
| 26 | Add `pauseTask` to `TaskState` interface | `taskStore.ts` | Low |
| 27 | Move `startSession`'s `window.electronAPI` call inside try/catch | `focusStore.ts:320` | Low |
| 28 | Apply `reports/` folder structure to all features | all features | Low |

---

### Phase 5 — Production Infrastructure (Do Before Scale)

| # | Task | Notes |
|---|---|---|
| 29 | Add Sentry for Electron (`@sentry/electron`) | Crash reports, error rates, user impact |
| 30 | Write test suite for `timeCalculations.ts` | Pure functions — easiest tests to write |
| 31 | Write test suite for `dataSyncService` with mocked IPC | Most critical path to test |
| 32 | Configure electron-builder auto-updater | Users stuck on buggy versions is churn |
| 33 | Set up GitHub Actions CI — lint + type-check on every PR | Catches regressions before merge |
| 34 | Add visible sync status indicator in UI | "Syncing 12 items..." / "All synced ✓" |
| 35 | Add structured logging (log levels, persistent log file) | Replace scattered `console.error` |
| 36 | Make `toggleComplete` reversible with explicit "Reopen" action | Core product decision |
| 37 | Fix `permanentDelete` to be genuinely permanent or rename honestly | Data integrity + user trust |

---

## 11. Scalable Architecture Proposal

### Current Flow (Problematic)

```
Renderer
  → raw db:exec IPC (SQL injection risk)
  → named IPC handlers (correct, but unvalidated)
    → SQLite (direct, no service layer validation)
    → dataSyncService (10s interval)
      → Supabase upsert
```

### Target Flow

```
Renderer
  → typed action IPC (validated at boundary, no raw SQL)
    → SQLite service layer (column allowlist, typed operations)
      → Outbox table (every write is an outbox entry)
        → SyncEngine (drains outbox in order, resumable)
          → Supabase upsert
            → mark outbox entry synced
              → Realtime subscription
                → local load() (DB only, no cloud fetch)
```

### Key Architectural Changes

**1. Outbox Pattern for Sync**

Instead of the `synced` flag on every table, maintain a dedicated `outbox` table:
```sql
CREATE TABLE outbox (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,  -- 'upsert' | 'delete'
    payload TEXT NOT NULL,    -- JSON
    created_at TEXT NOT NULL,
    attempts INTEGER DEFAULT 0
)
```

Benefits:
- Partial syncs are resumable with full context
- Users can see "N changes pending" accurately
- Retry logic is explicit and visible
- No more `LIMIT 50` silent ceiling

**2. Separate Live Timer Signal from Analytical State**

```
Timer signal: { startTime, isActive, sessionType }
  ← updated every second by a single root interval
  ← read by timer display components directly

Session store: { sessions[] }
  ← updated only when a session is committed (paused/ended)
  ← read by reports, streaks, analytics
```

Reports never depend on the live timer. They depend only on committed sessions. This eliminates the per-second analytics recalculation entirely.

**3. IPC Boundary Validation**

```ts
// main process
const ALLOWED_TABLES = new Set(['tasks', 'lists', 'subtasks', 'focus_sessions', 'workspaces'])

ipcMain.handle('db:getPending', (_, table: string) => {
    if (!ALLOWED_TABLES.has(table)) throw new Error(`Table not allowed: ${table}`)
    return dbOps.getPending(table)
})
```

**4. Unified Naming Convention**

Pick once, apply everywhere:

| Concept | Canonical name |
|---|---|
| Time spent on a task | `focusSeconds` |
| Estimated duration | `estimateMinutes` |
| Subtask completed | `done` (boolean everywhere) |
| Session counted as focus | `isFocusSession(type)` |

---

## 12. Final Scorecard

| Category | Score | Key Blocker |
|---|---|---|
| Security | 4/10 | Raw SQL IPC, DevTools in production, broken session layer |
| Data Integrity | 5/10 | deleteAll not cloud-synced, 100-session cap, stale persisted state |
| Performance | 5/10 | Per-second analytics recompute, sequential recurring sync |
| Code Quality | 7/10 | Naming inconsistency, duplicate aliases, type gaps |
| Architecture | 7/10 | Offline-first design is sound, sync engine is thoughtful |
| Product Clarity | 5/10 | Undecided behaviors, missing "Reopen", trust-breaking patterns |
| Production Readiness | 3/10 | No tests, no RLS, no error tracking, no CI |
| **Overall** | **5/10** | Excellent foundation, pre-production execution |

---

### The 5 Highest-Leverage Fixes

If you can only do five things before launch, do these:

| Priority | Fix | Why |
|---|---|---|
| 1 | Remove `db:exec` IPC + validate table names | Closes the most dangerous security holes |
| 2 | Add visible sync status ("3 items syncing...") | Highest trust-building change per line of code |
| 3 | Remove custom session layer — trust Supabase | Fixes silent sign-out bug, eliminates broken security theater |
| 4 | Decouple reports tick from stats calculation | Removes the biggest performance issue at the most critical moment |
| 5 | Add Sentry + structured logging | First day of real users = first day you need visibility |

---

### Closing Assessment

> **Right now:** Quoril feels like a powerful system mid-construction.
> **Blitzit feels like:** A finished product.

That is actually the right position to be in.

Systems can be refined into products. Shallow products cannot grow into deep systems. The offline-first sync engine, the multi-theme UI, the Pomodoro + break flow, the workspace hierarchy — these are the hard parts. They exist and they mostly work.

What remains is the last 30%: the part that transforms "it works" into "I trust it." That 30% is what users pay for. It is security, reliability, predictability, and the invisible work of handling every edge case before the user encounters it.

The bones are solid. Build the walls.

---

*Document generated from deep codebase audit — `feature/quoril` branch, 2026-03-26.*
*All file references are relative to the project root.*
