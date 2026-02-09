# 📊 Blitzit Clone - Complete Data Dictionary

> **Last Updated:** February 7, 2026  
> **Purpose:** Comprehensive documentation of all data fields, their sources, transformations, and UI dependencies

---

## Table of Contents

1. [Data Field Dictionary](#1-data-field-dictionary)
2. [Feature-by-Feature Breakdown](#2-feature-by-feature-breakdown)
3. [Calendar/Planner System](#3-calendarplanner-system)
4. [Data Flow Mapping](#4-data-flow-mapping)
5. [SQLite Schema → UI Mapping](#5-sqlite-schema--ui-mapping)
6. [Supabase Sync Impact](#6-supabase-sync-impact)
7. [React Component Map](#7-react-component-map)
8. [IPC & Side Effects](#8-ipc--side-effects)
9. [Impact Analysis](#9-impact-analysis)
10. [Navigation Guide](#10-navigation-guide)

---

## 1️⃣ Data Field Dictionary

### 📋 Task Fields

| Field Name | Meaning | Source | Read In | Updated In | UI Components |
|------------|---------|--------|---------|------------|---------------|
| `id` | Unique task identifier (UUID) | Generated on creation | All task-related files | Never (immutable) | All task displays |
| `user_id` | Owner of the task | Supabase auth session | `localStorage.ts`, `db.ts` | Never after creation | None (internal) |
| `list_id` | Parent list/project | User selection in UI | `taskStore.ts`, `localStorage.ts` | `taskStore.updateTask()` | `TaskCard.tsx`, `Planner.tsx` |
| `title` | Task name/description | User input | `TaskCard.tsx`, `CreateTaskModal.tsx` | `taskStore.updateTask()` | `TaskCard.tsx`, `FocusTimerPanel.tsx` |
| `description` | Detailed task notes | User input (optional) | `TaskDetailsPanel.tsx` | `taskStore.updateTask()` | `TaskDetailsPanel.tsx` |
| `status` | Current task state | Column mapping + user actions | `taskStore.ts`, `columnMap.ts` | `taskStore.moveTaskToColumn()`, `startTask()`, `pauseTask()` | `Planner.tsx`, `TaskCard.tsx` |
| `priority` | Task importance level | User selection | `TaskDetailsPanel.tsx` | `taskStore.updateTask()` | `TaskCard.tsx` (color coding) |
| `estimate_m` (SQLite) / `estimated_minutes` (App) | Time estimate in minutes | User input OR parsed from title | `timeParser.ts`, `taskStore.ts` | `taskStore.createTask()`, `updateTask()` | `TaskCard.tsx`, `FocusTimerPanel.tsx` |
| `spent_s` (SQLite) / `actual_seconds` (App) | Actual time spent in seconds | Focus timer tracking | `focusStore.ts`, `sessionUtils.ts` | `focusStore.syncTimer()`, `taskStore.updateTask()` | `TaskCard.tsx`, `FocusTimerPanel.tsx`, `Reports.tsx` |
| `started_at` | Timestamp when task became active | Focus timer start | `db.ts`, `focusStore.ts` | `db.startTask()`, `db.pauseTask()` | `FocusTimerPanel.tsx` |
| `due_at` (SQLite) / `due_date` + `due_time` (App) | Task deadline | User input | `TaskDetailsPanel.tsx` | `taskStore.updateTask()` | `TaskCard.tsx`, `TaskDetailsPanel.tsx` |
| `completed_at` | Completion timestamp | Auto-set on status=done | `taskStore.ts` | `taskStore.toggleComplete()`, `moveTaskToColumn()` | `TaskCard.tsx` |
| `parent_id` / `parent_task_id` | Parent task for subtasks | Task hierarchy | `taskStore.ts` | `taskStore.createTask()` | `TaskDetailsPanel.tsx` |
| `sort_order` | Display order in column | Drag-and-drop | `taskStore.ts` | `taskStore.reorderTasks()` | `Planner.tsx` (DnD) |
| `created_at` | Creation timestamp | Auto-generated | `localStorage.ts` | Never | None (metadata) |
| `updated_at` | Last modification time | Auto-updated on changes | `localStorage.ts`, `db.ts` | Every update operation | None (sync tracking) |
| `deleted_at` | Soft delete timestamp | Soft delete action | `taskStore.ts` | `taskStore.archiveTask()`, `deleteTask()` | None (filtered out) |
| `synced` | Sync status flag (0/1) | Sync service | `dataSyncService.ts` | `dataSyncService.syncTable()` | None (internal) |

### 📁 List Fields

| Field Name | Meaning | Source | Read In | Updated In | UI Components |
|------------|---------|--------|---------|------------|---------------|
| `id` | Unique list identifier | Generated on creation | All list operations | Never | `Sidebar.tsx`, `PlannerHeader.tsx` |
| `user_id` | List owner | Supabase auth | `localStorage.ts` | Never | None |
| `name` | List display name | User input | `CreateListModal.tsx` | `listStore.updateList()` | `Sidebar.tsx`, `PlannerHeader.tsx` |
| `color` | List theme color | User selection | `CreateListModal.tsx` | `listStore.updateList()` | `Sidebar.tsx` (visual) |
| `icon` | List emoji/icon | User selection | `CreateListModal.tsx` | `listStore.updateList()` | `Sidebar.tsx` |
| `sort_order` | Display order | Drag-and-drop | `listStore.ts` | `listStore.reorderLists()` | `Sidebar.tsx` |
| `is_system` | System list flag | Hardcoded for defaults | `db.ts` | Never | None (prevents deletion) |
| `created_at` | Creation time | Auto-generated | `localStorage.ts` | Never | None |
| `updated_at` | Last update time | Auto-updated | `localStorage.ts` | Every update | None |
| `archived_at` | Archive timestamp | Archive action | `listStore.ts` | `listStore.archiveList()` | None (filtered) |
| `deleted_at` | Soft delete timestamp | Delete action | `listStore.ts` | `listStore.deleteList()` | None (filtered) |
| `synced` | Sync status | Sync service | `dataSyncService.ts` | Sync operations | None |

### ✅ Subtask Fields

| Field Name | Meaning | Source | Read In | Updated In | UI Components |
|------------|---------|--------|---------|------------|---------------|
| `id` | Unique subtask ID | Generated | `taskStore.ts` | Never | `TaskDetailsPanel.tsx` |
| `task_id` | Parent task reference | Task context | `taskStore.ts` | Never after creation | None (FK) |
| `user_id` | Subtask owner | Auth session | `localStorage.ts` | Never | None |
| `title` | Subtask description | User input | `TaskDetailsPanel.tsx` | `taskStore.createSubtask()` | `TaskDetailsPanel.tsx`, `FocusTimerPanel.tsx` |
| `done` (SQLite) / `completed` (App) | Completion status | User checkbox | `taskStore.ts` | `taskStore.toggleSubtask()` | `TaskDetailsPanel.tsx`, `FocusTimerPanel.tsx` |
| `sort_order` | Display order | Creation order | `taskStore.ts` | `taskStore.createSubtask()` | `TaskDetailsPanel.tsx` |
| `created_at` | Creation time | Auto-generated | `localStorage.ts` | Never | None |
| `updated_at` | Last update | Auto-updated | `localStorage.ts` | Every update | None |
| `deleted_at` | Soft delete time | Delete action | `taskStore.ts` | `taskStore.deleteSubtask()` | None |
| `synced` | Sync status | Sync service | `dataSyncService.ts` | Sync operations | None |

### 🎯 Focus Session Fields

| Field Name | Meaning | Source | Read In | Updated In | UI Components |
|------------|---------|--------|---------|------------|---------------|
| `id` | Unique session ID | Generated | `focusStore.ts` | Never | None |
| `user_id` | Session owner | Auth session | `localStorage.ts` | Never | None |
| `task_id` | Associated task | Focus start action | `focusStore.ts` | Never after creation | `Reports.tsx` |
| `type` / `session_type` | Session category | Focus mode selection | `focusStore.ts` | `focusStore.startSession()` | `FocusTimerPanel.tsx` |
| `seconds` / `actual_seconds` | Duration in seconds | Timer tracking | `focusStore.ts` | `focusStore.endSession()` | `Reports.tsx`, `SessionLog.tsx` |
| `start_time` / `started_at` | Session start timestamp | Timer start | `focusStore.ts` | `focusStore.startSession()` | `Reports.tsx` |
| `end_time` / `ended_at` | Session end timestamp | Timer end | `focusStore.ts` | `focusStore.endSession()` | `Reports.tsx` |
| `metadata` | JSON-encoded extra data | Reflection modal | `focusStore.ts` | `focusStore.endSession()` | None (parsed) |
| `notes` | Session notes | Reflection input | `ReflectionModal.tsx` | `focusStore.endSession()` | `SessionLog.tsx` |
| `focus_score` | Self-rated focus quality | Reflection input | `ReflectionModal.tsx` | `focusStore.endSession()` | `Reports.tsx` |
| `energy_level` | Self-rated energy | Reflection input | `ReflectionModal.tsx` | `focusStore.endSession()` | `Reports.tsx` |
| `created_at` | Record creation time | Auto-generated | `localStorage.ts` | Never | None |
| `synced` | Sync status | Sync service | `dataSyncService.ts` | Sync operations | None |

### ⚙️ Computed/Derived Fields

| Field Name | Meaning | Source | Calculation Logic | Used In |
|------------|---------|--------|-------------------|---------|
| `elapsed` | Live timer seconds | `focusStore.ts` | `elapsed + (now - startTime) / 1000` | `FocusTimerPanel.tsx` |
| `pomodoroRemaining` | Pomodoro countdown | `focusStore.ts` | `pomodoroRemainingAtStart - delta` | `FocusTimerPanel.tsx` |
| `breakRemaining` | Break countdown | `focusStore.ts` | `breakRemainingAtStart - delta` | `FocusTimerPanel.tsx` |
| `progress` | Task completion % | `Planner.tsx` | `doneCount / (targetCount + doneCount)` | `Planner.tsx` (progress bar) |
| `todayPlannedMinutes` | Total planned time | `taskStore.ts` | `sum(estimated_minutes)` for today column | `Dashboard.tsx` |
| `sync_status` | Human-readable sync | `localStorage.ts` | `synced ? 'synced' : 'pending'` | `TaskCard.tsx` (indicator) |

---

## 2️⃣ Feature-by-Feature Breakdown

### 🗓️ **Planner / Kanban Board**

**Problem it solves:** Visual task organization across workflow stages (Backlog → This Week → Today → Done)

**Data used:**
- `tasks` (filtered by `list_id` and `status`)
- `lists` (for filtering)
- Column mappings from `columnMap.ts`

**React components:**
- `Planner.tsx` - Main board container
- `BoardColumn` - Individual column renderer
- `TaskCard.tsx` - Task display card
- `TodayColumn.tsx` - Special "Today" column with time tracking
- `PlannerHeader.tsx` - List selector and filters

**Hooks/Services:**
- `useTaskStore()` - Task CRUD operations
- `useListStore()` - List selection
- `usePlannerStore()` - Selected date state
- `@dnd-kit` - Drag-and-drop functionality

**IPC/Database calls:**
- `db:getTasks` - Load tasks for list
- `db:saveTask` - Update task on drag
- `db:reorderTasks` - Update sort_order

**File paths:**
- `src/components/planner/Planner.tsx`
- `src/components/planner/TaskCard.tsx`
- `src/components/planner/TodayColumn.tsx`
- `src/store/taskStore.ts`
- `src/utils/columnMap.ts`

---

### ⏱️ **Focus Timer / Pomodoro**

**Problem it solves:** Time tracking with focus sessions, breaks, and task switching

**Data used:**
- `focusStore` state (timer, session, break tracking)
- Active task from `taskStore`
- Settings from `settingsStore` (pomodoro enabled, break length)

**React components:**
- `FocusTimerPanel.tsx` - Main timer UI (sidebar)
- `FocusMode.tsx` - Legacy fullscreen mode
- `SuperFocusPill.tsx` - Draggable timer widget
- `ReflectionModal.tsx` - End-session feedback

**Hooks/Services:**
- `useFocusStore()` - Timer state management
- `useTaskStore()` - Task updates
- `useTimerDisplay()` - Time formatting
- `audioService` - Sound notifications
- `backupService` - Crash recovery for time

**IPC/Database calls:**
- `db:startTask` - Mark task active
- `db:pauseTask` - Pause and save time
- `db:saveSession` - Log focus session
- `db:updateFocusSession` - Add reflection data

**File paths:**
- `src/components/focus/FocusTimerPanel.tsx`
- `src/store/focusStore.ts`
- `src/utils/sessionUtils.ts`
- `src/services/backupService.ts`

---

### 📊 **Reports / Analytics**

**Problem it solves:** Visualize productivity trends, session history, and goal tracking

**Data used:**
- `focus_sessions` table (all sessions in date range)
- `tasks` (for completion stats)
- `settingsStore.dailyGoalMinutes`

**React components:**
- `Reports.tsx` - Main container
- `StatsOverview.tsx` - Summary cards
- `ActivityChart.tsx` - Time series chart
- `SessionLog.tsx` - Session history table
- `DailyGoalRing.tsx` - Progress ring
- `ModuleDistribution.tsx` - List breakdown
- `DateRangePicker.tsx` - Filter controls

**Hooks/Services:**
- `useReportsController.ts` - Data aggregation logic
- `useFocusStore()` - Session data
- `useTaskStore()` - Task completion data

**IPC/Database calls:**
- `db:getSessions` - Fetch focus sessions
- `db:getTasks` - Fetch tasks for stats

**File paths:**
- `src/components/reports/Reports.tsx`
- `src/components/reports/hooks/useReportsController.ts`
- `src/components/reports/components/*`

---

### 📝 **Task Details Panel**

**Problem it solves:** Edit task metadata, manage subtasks, view history

**Data used:**
- Selected task from `taskStore`
- Subtasks from `taskStore.subtasks`

**React components:**
- `TaskDetailsPanel.tsx` - Slide-out panel

**Hooks/Services:**
- `useTaskStore()` - Task and subtask operations

**IPC/Database calls:**
- `db:updateTask` - Save changes
- `db:getSubtasks` - Load subtasks
- `db:saveSubtask` - Create subtask
- `db:deleteSubtask` - Remove subtask

**File paths:**
- `src/components/planner/TaskDetailsPanel.tsx`

---

### 🎨 **Dashboard**

**Problem it solves:** Overview of today's tasks and quick actions

**Data used:**
- Today's tasks (status: active, paused)
- Daily goal from settings
- Total planned minutes

**React components:**
- `Dashboard.tsx` - Main view

**Hooks/Services:**
- `useTaskStore()` - Task data
- `useSettingsStore()` - Goal settings

**File paths:**
- `src/components/dashboard/Dashboard.tsx`

---

## 3️⃣ Calendar/Planner System

### **Architecture**

The app uses a **Kanban-style planner** (not a traditional calendar) with 4 columns representing workflow stages.

### **Column Definitions**

Defined in `src/utils/columnMap.ts`:

```typescript
COLUMN_STATUS = {
  backlog: ['todo'],
  this_week: ['planned'],
  today: ['active', 'paused'],
  done: ['done']
}
```

### **Files Defining Planner Components**

| File | Purpose |
|------|---------|
| `src/components/planner/Planner.tsx` | Main board, drag-and-drop logic |
| `src/components/planner/BoardColumn` | Column renderer (inside Planner.tsx) |
| `src/components/planner/TaskCard.tsx` | Individual task display |
| `src/components/planner/TodayColumn.tsx` | Special "Today" column with time summary |
| `src/utils/columnMap.ts` | Status-to-column mapping |

### **Date/Time Calculations**

**Estimated Time:**
- Source: `task.estimate_m` (SQLite) / `task.estimated_minutes` (App)
- Parsed from title: `timeParser.ts` extracts patterns like "30m", "2h"
- Display: `BoardColumn.formatTime()` converts minutes to "Xh Ym" format

**Actual Time:**
- Source: `task.spent_s` (SQLite) / `task.actual_seconds` (App)
- Updated: `focusStore.syncTimer()` every second during active session
- Calculation: `sessionUtils.getTaskTotalActual()` combines DB + live delta + backup

**Duration (Focus Timer):**
- Source: `focusStore.duration` (goal seconds)
- Default: `task.estimated_minutes * 60` OR 25 minutes (Pomodoro)
- Remaining: `duration - elapsed`

### **Data Flow for Time Tracking**

```
User starts task
  ↓
focusStore.startSession()
  ↓
db.startTask() → Sets started_at timestamp
  ↓
Timer ticks (syncTimer every 1s)
  ↓
elapsed = previous + (now - startTime) / 1000
  ↓
backupService.save(taskId, elapsed) ← Crash recovery
  ↓
User pauses/ends
  ↓
db.pauseTask() → Calculates spent_s = spent_s + delta
  ↓
focusStore.endSession() → Creates focus_session record
```

### **Drag-and-Drop Propagation**

```
User drags TaskCard
  ↓
Planner.handleDragEnd()
  ↓
Determine target column from droppableId
  ↓
taskStore.moveTaskToColumn(taskId, column)
  ↓
Maps column → status via COLUMN_DEFAULT
  ↓
taskStore.updateTask(id, { status, sort_order })
  ↓
localStorage.tasks.update() → IPC → db.saveTask()
  ↓
dataSyncService.trigger() → Syncs to Supabase
  ↓
UI re-renders (Zustand state update)
```

### **File-to-Feature Mapping**

```
Planner Board
├── Drag-and-drop: Planner.tsx (DndContext, handleDragEnd)
├── Column rendering: BoardColumn component
├── Task display: TaskCard.tsx
├── Status mapping: columnMap.ts
└── Data operations: taskStore.ts

Time Tracking
├── Timer logic: focusStore.ts (syncTimer, startSession, pauseSession)
├── Time calculations: sessionUtils.ts
├── Crash recovery: backupService.ts
└── Database updates: db.ts (startTask, pauseTask)
```

---

## 4️⃣ Data Flow Mapping

### **`estimated_minutes` Field Chain Reaction**

**1. Creation:**
```
User types "Fix bug 30m" in CreateTaskModal
  ↓
timeParser.parseTitleForTime("Fix bug 30m")
  ↓
Returns: { cleanTitle: "Fix bug", minutes: 30 }
  ↓
taskStore.createTask({ title: "Fix bug", estimated_minutes: 30 })
  ↓
localStorage.tasks.create() → Maps to estimate_m for SQLite
  ↓
db.saveTask({ estimate_m: 30 })
```

**2. Modification:**
```
User edits estimated_minutes in TaskDetailsPanel
  ↓
taskStore.updateTask(id, { estimated_minutes: 45 })
  ↓
localStorage.tasks.update() → Maps to estimate_m
  ↓
db.exec("UPDATE tasks SET estimate_m=45, synced=0 WHERE id=?")
  ↓
dataSyncService.trigger()
  ↓
Supabase sync: { estimated_minutes: 45 }
```

**3. What Recalculates:**
- `focusStore.duration` (if task is active)
- `TaskCard` display (shows "45m" badge)
- `TodayColumn` total planned time
- `Dashboard` daily goal progress

**4. What Re-renders:**
- `TaskCard.tsx` (estimated time badge)
- `TodayColumn.tsx` (total time summary)
- `FocusTimerPanel.tsx` (goal duration)
- `Dashboard.tsx` (planned vs goal)

---

### **`actual_seconds` / `spent_s` Field Chain Reaction**

**1. Value Creation:**
```
focusStore.startSession(taskId)
  ↓
Sets: startTime = Date.now(), elapsed = hydrateElapsed(task)
  ↓
Timer ticks every 1s: syncTimer()
  ↓
delta = (now - startTime) / 1000
total = elapsed + delta
  ↓
backupService.save(taskId, total) ← In-memory backup
```

**2. Value Persistence:**
```
User pauses/ends session
  ↓
focusStore.pauseSession()
  ↓
total = elapsed + delta
  ↓
taskStore.updateTask(taskId, { actual_seconds: total })
  ↓
localStorage.tasks.update() → Maps to spent_s
  ↓
db.exec("UPDATE tasks SET spent_s=?, synced=0 WHERE id=?", [total])
```

**3. What Recalculates:**
- `sessionUtils.getTaskTotalActual()` (used everywhere)
- `TaskCard` progress bar
- `FocusTimerPanel` elapsed display
- `Reports` total time stats

**4. What Re-renders:**
- `TaskCard.tsx` (time spent badge, progress bar)
- `FocusTimerPanel.tsx` (elapsed timer)
- `Reports.tsx` (all charts and stats)
- `SessionLog.tsx` (session duration)

---

### **`status` Field Chain Reaction**

**1. Value Changes:**
```
User drags task to "Today" column
  ↓
Planner.handleDragEnd()
  ↓
taskStore.moveTaskToColumn(taskId, 'today')
  ↓
Maps: 'today' → 'active' (via COLUMN_DEFAULT)
  ↓
taskStore.updateTask(taskId, { status: 'active' })
```

**2. Side Effects:**
- If moving to 'done': Sets `completed_at`, plays success sound
- If moving from 'done': Clears `completed_at`
- Updates `sort_order` to bottom of target column

**3. What Recalculates:**
- Column task filters (COLUMN_STATUS mapping)
- Today's planned minutes (only 'active'/'paused' count)
- Progress bars (done vs total)

**4. What Re-renders:**
- `Planner.tsx` (all columns re-filter)
- `TaskCard.tsx` (visual state changes)
- `Dashboard.tsx` (today's task count)

---

## 5️⃣ SQLite Schema → UI Mapping

### **`tasks` Table**

**Purpose:** Core task data storage

**Used by features:**
- Planner (all columns)
- Focus Timer (active task)
- Reports (completion stats)
- Dashboard (today's tasks)

**Read in:**
- `src/services/localStorage.ts` (via IPC)
- `src/store/taskStore.ts` (Zustand store)

**Displayed in:**
- `TaskCard.tsx` - All task fields
- `FocusTimerPanel.tsx` - Active task details
- `TaskDetailsPanel.tsx` - Full task editor
- `Reports.tsx` - Aggregated stats

**Mapping:**
```
tasks table
├── Used by: Planner, Focus Timer, Reports, Dashboard
├── Read in: localStorage.ts → taskStore.ts
├── Displayed in:
│   ├── TaskCard.tsx (title, status, estimate_m, spent_s)
│   ├── FocusTimerPanel.tsx (title, estimate_m, spent_s)
│   ├── TaskDetailsPanel.tsx (all fields)
│   └── Reports.tsx (aggregated stats)
└── Updated via:
    ├── taskStore.createTask() → localStorage.tasks.create()
    ├── taskStore.updateTask() → localStorage.tasks.update()
    └── focusStore.syncTimer() → backupService → db.saveTask()
```

---

### **`lists` Table**

**Purpose:** Project/category organization

**Used by features:**
- Sidebar navigation
- Planner filtering
- Task creation (list assignment)

**Read in:**
- `src/services/localStorage.ts`
- `src/store/listStore.ts`

**Displayed in:**
- `Sidebar.tsx` - List navigation
- `PlannerHeader.tsx` - List selector dropdown
- `CreateTaskModal.tsx` - List picker

**Mapping:**
```
lists table
├── Used by: Sidebar, Planner Header, Task Creation
├── Read in: localStorage.ts → listStore.ts
├── Displayed in:
│   ├── Sidebar.tsx (name, icon, color)
│   ├── PlannerHeader.tsx (dropdown)
│   └── CreateTaskModal.tsx (list picker)
└── Updated via:
    ├── listStore.createList() → localStorage.lists.create()
    └── listStore.updateList() → localStorage.lists.update()
```

---

### **`subtasks` Table**

**Purpose:** Task breakdown into smaller steps

**Used by features:**
- Task Details Panel (subtask list)
- Focus Timer (subtask checklist)

**Read in:**
- `src/services/localStorage.ts`
- `src/store/taskStore.ts` (subtasks map)

**Displayed in:**
- `TaskDetailsPanel.tsx` - Subtask editor
- `FocusTimerPanel.tsx` - Subtask checklist

**Mapping:**
```
subtasks table
├── Used by: Task Details, Focus Timer
├── Read in: localStorage.ts → taskStore.subtasks
├── Displayed in:
│   ├── TaskDetailsPanel.tsx (editable list)
│   └── FocusTimerPanel.tsx (checklist)
└── Updated via:
    ├── taskStore.createSubtask() → localStorage.subtasks.create()
    └── taskStore.toggleSubtask() → localStorage.subtasks.update()
```

---

### **`focus_sessions` Table**

**Purpose:** Historical record of all focus/break sessions

**Used by features:**
- Reports (analytics)
- Session Log (history)

**Read in:**
- `src/services/localStorage.ts`
- `src/store/focusStore.ts`

**Displayed in:**
- `Reports.tsx` - Charts and stats
- `SessionLog.tsx` - Session history table
- `ActivityChart.tsx` - Time series visualization

**Mapping:**
```
focus_sessions table
├── Used by: Reports, Session Log
├── Read in: localStorage.ts → focusStore.sessions
├── Displayed in:
│   ├── Reports.tsx (aggregated metrics)
│   ├── SessionLog.tsx (session list)
│   └── ActivityChart.tsx (time series)
└── Created via:
    ├── focusStore.startSession() → localStorage.focus.create()
    └── focusStore.endSession() → localStorage.focus.update()
```

---

## 6️⃣ Supabase Sync Impact

### **Synced Fields**

**Tasks:**
- ✅ All fields EXCEPT `synced` (internal flag)
- Field transformations:
  - `estimate_m` → `estimated_minutes`
  - `spent_s` → `actual_minutes` (converted to minutes)
  - `due_at` → `due_date` + `due_time` (split)
  - `parent_id` → `parent_task_id`

**Lists:**
- ✅ All fields EXCEPT `synced`
- No transformations needed

**Subtasks:**
- ✅ All fields EXCEPT `synced`
- Field transformations:
  - `done` → `is_completed` (boolean)

**Focus Sessions:**
- ✅ All fields EXCEPT `synced`
- Field transformations:
  - `seconds` → `duration_minutes` (converted)
  - `start_time` → `started_at`
  - `end_time` → `ended_at`
  - `metadata` (JSON) → `notes`, `interruptions`, etc.

---

### **Local-Only Fields**

| Field | Reason |
|-------|--------|
| `synced` | Internal sync tracking flag |
| `prev_status` | UI state for undo (not persisted) |
| `sync_status` | Computed from `synced` flag |

---

### **Conflict Resolution**

**Strategy:** Last-write-wins (Supabase timestamp)

**Process:**
1. Local changes set `synced=0`
2. `dataSyncService` pushes to Supabase (upsert)
3. Supabase RLS ensures user can only modify own data
4. On success: `markSynced(table, id)` sets `synced=1`
5. On conflict (FK violation, constraint): Mark as synced to prevent retry loop

**File:** `src/services/dataSyncService.ts`

---

### **UI Changes Dependent on Sync**

**Sync Status Indicator:**
- `TaskCard.tsx` shows "pending" badge if `sync_status === 'pending'`

**Sync Trigger Points:**
- Every create/update/delete operation calls `dataSyncService.trigger()`
- Background sync every 10 seconds (SYNC_INTERVAL)

**Offline Behavior:**
- All operations work offline (SQLite is source of truth)
- Sync queues changes (synced=0 rows)
- Auto-syncs when online

---

## 7️⃣ React Component Map

### **Smart Components (Data Owners)**

| Component | Data Owned | Hooks Used | Children |
|-----------|-----------|------------|----------|
| `Planner.tsx` | Drag state, active task | `useTaskStore`, `useListStore`, `usePlannerStore` | `BoardColumn`, `TaskCard`, `TodayColumn` |
| `FocusTimerPanel.tsx` | Subtask input, drag state | `useFocusStore`, `useTaskStore`, `useListStore` | None (self-contained) |
| `Reports.tsx` | Date range, filters | `useReportsController` | `StatsOverview`, `ActivityChart`, `SessionLog` |
| `Dashboard.tsx` | None (pure display) | `useTaskStore`, `useSettingsStore` | None |
| `TaskDetailsPanel.tsx` | Edit state, subtask input | `useTaskStore` | None |

---

### **Dumb Components (Presentation Only)**

| Component | Props Received | Purpose |
|-----------|---------------|---------|
| `TaskCard.tsx` | `task`, `onBlitz`, `onComplete` | Display task with actions |
| `StatsOverview.tsx` | `stats` object | Display metric cards |
| `ActivityChart.tsx` | `sessions`, `dateRange` | Render time series chart |
| `SessionLog.tsx` | `sessions` | Display session table |
| `DailyGoalRing.tsx` | `actual`, `goal` | Progress ring visualization |

---

### **Component Dependency Graph**

```
App.tsx
├── Layout.tsx
│   ├── Sidebar.tsx (useListStore)
│   ├── TitleBar.tsx (window controls)
│   └── BottomNav.tsx (navigation)
│
├── Planner.tsx (useTaskStore, useListStore)
│   ├── PlannerHeader.tsx (useListStore)
│   ├── BoardColumn (inline)
│   │   └── TaskCard.tsx (task prop)
│   └── TodayColumn.tsx (tasks prop)
│
├── FocusTimerPanel.tsx (useFocusStore, useTaskStore)
│   └── SuperFocusPill.tsx (draggable widget)
│
├── Reports.tsx (useReportsController)
│   ├── ReportsHeader.tsx
│   ├── DateRangePicker.tsx
│   ├── StatsOverview.tsx
│   ├── ActivityChart.tsx
│   ├── SessionLog.tsx
│   └── DailyGoalRing.tsx
│
└── Dashboard.tsx (useTaskStore)
```

---

### **Props Flow Example: Task Display**

```
Planner.tsx
  ↓ (tasks array)
BoardColumn
  ↓ (individual task)
TaskCard.tsx
  ↓ Displays:
    - task.title
    - task.estimated_minutes (badge)
    - task.actual_seconds (progress bar)
    - task.status (visual state)
  ↓ Emits:
    - onBlitz(task) → Planner.handleBlitz()
    - onComplete(id) → Planner.handleTaskComplete()
```

---

### **Context Usage**

**None!** This app uses Zustand for state management, not React Context.

**Zustand Stores:**
- `taskStore` - Task and subtask state
- `listStore` - List state
- `focusStore` - Timer and session state
- `settingsStore` - User preferences
- `authStore` - Authentication state
- `plannerStore` - UI state (selected date)
- `uiStore` - UI state (modals, panels)

---

## 8️⃣ IPC & Side Effects

### **IPC Channel Map**

| User Action | File | IPC Channel | DB Operation | Return | Component |
|-------------|------|-------------|--------------|--------|-----------|
| Create task | `taskStore.ts` | `db:saveTask` | `INSERT INTO tasks` | Task object | `CreateTaskModal.tsx` |
| Update task | `taskStore.ts` | `db:exec` (UPDATE) | `UPDATE tasks SET ...` | Updated task | `TaskCard.tsx`, `TaskDetailsPanel.tsx` |
| Delete task | `taskStore.ts` | `db:exec` (UPDATE) | `UPDATE tasks SET deleted_at` | None | `TaskCard.tsx` |
| Start focus | `focusStore.ts` | `db:startTask` | `UPDATE tasks SET started_at, status='active'` | Task object | `FocusTimerPanel.tsx` |
| Pause focus | `focusStore.ts` | `db:pauseTask` | `UPDATE tasks SET spent_s, started_at=NULL` | Task object | `FocusTimerPanel.tsx` |
| Drag task | `taskStore.ts` | `db:exec` (UPDATE) | `UPDATE tasks SET status, sort_order` | None | `Planner.tsx` |
| Reorder tasks | `taskStore.ts` | `db:reorderTasks` | Multiple `UPDATE tasks SET sort_order` | None | `Planner.tsx` |
| Create list | `listStore.ts` | `db:saveList` | `INSERT INTO lists` | List object | `CreateListModal.tsx` |
| Delete list | `listStore.ts` | `db:deleteList` | `UPDATE lists SET deleted_at` | None | `Sidebar.tsx` |
| Create subtask | `taskStore.ts` | `db:saveSubtask` | `INSERT INTO subtasks` | Subtask object | `TaskDetailsPanel.tsx` |
| Toggle subtask | `taskStore.ts` | `db:exec` (UPDATE) | `UPDATE subtasks SET done` | None | `TaskDetailsPanel.tsx` |
| Log session | `focusStore.ts` | `db:saveSession` | `INSERT INTO focus_sessions` | Session object | `focusStore.endSession()` |

---

### **Side Effect Chains**

**Example: Starting a Focus Session**

```
1. User clicks "Start" on TaskCard
   ↓
2. TaskCard.onBlitz(task) → Planner.handleBlitz(task)
   ↓
3. focusStore.startSession(task.id)
   ↓
4. IPC: db:startTask(task.id)
   ↓
5. DB: UPDATE tasks SET started_at=NOW(), status='active'
   ↓
6. IPC: db:saveSession({ task_id, start_time, ... })
   ↓
7. DB: INSERT INTO focus_sessions
   ↓
8. focusStore state updates:
   - isActive = true
   - taskId = task.id
   - startTime = Date.now()
   - elapsed = hydrateElapsed(task)
   ↓
9. UI re-renders:
   - FocusTimerPanel.tsx shows timer
   - TaskCard.tsx shows "active" state
   - Planner.tsx updates task status
   ↓
10. Timer starts ticking (syncTimer every 1s)
    ↓
11. backupService.save(taskId, elapsed) every tick
```

---

### **IPC Error Handling**

**Pattern:**
```typescript
try {
  const { data, error } = await localService.tasks.update(id, updates)
  if (error) throw error
  // Update Zustand state
} catch (e) {
  console.error('[Task] Update failed', e)
  set({ error: 'Update failed' })
  // Rollback optimistic update
}
```

**Files with error handling:**
- `src/store/taskStore.ts`
- `src/store/listStore.ts`
- `src/store/focusStore.ts`
- `src/services/localStorage.ts`

---

## 9️⃣ Impact Analysis: "If I Change This, What Breaks?"

### **Changing `estimate_m` / `estimated_minutes`**

**Direct dependencies:**
- `focusStore.duration` (timer goal)
- `TaskCard` display badge
- `TodayColumn` total planned time
- `Dashboard` daily goal calculation

**What could break:**
- Timer might show wrong goal duration
- Planned time summary incorrect
- Progress bars miscalculated

**What needs updating together:**
- SQLite schema (if renaming)
- Supabase schema (if renaming)
- `dataSyncService.ts` field mapping
- `localStorage.ts` field mapping
- All UI components displaying time estimates

---

### **Changing `spent_s` / `actual_seconds`**

**Direct dependencies:**
- `sessionUtils.getTaskTotalActual()`
- `focusStore.elapsed`
- `backupService` (crash recovery)
- All time displays in UI

**What could break:**
- Timer tracking stops working
- Progress bars show wrong values
- Reports show incorrect data
- Crash recovery fails

**What needs updating together:**
- `db.ts` (startTask, pauseTask logic)
- `focusStore.ts` (timer calculations)
- `sessionUtils.ts` (all functions)
- `dataSyncService.ts` (sync mapping)
- `Reports.tsx` (aggregation queries)

---

### **Changing `status` Field Values**

**Direct dependencies:**
- `columnMap.ts` (COLUMN_STATUS, COLUMN_DEFAULT)
- All task filtering logic
- Planner column rendering

**What could break:**
- Tasks disappear from columns
- Drag-and-drop stops working
- Status transitions fail
- Sync breaks (Supabase schema mismatch)

**What needs updating together:**
- `columnMap.ts` (add new status)
- `dataSyncService.ts` (mapTaskStatus function)
- Supabase schema (CHECK constraint)
- All components filtering by status
- `db.ts` (startTask, pauseTask status updates)

---

### **Changing `taskStore.ts` Function Signatures**

**Direct dependencies:**
- Every component calling taskStore methods
- `focusStore.ts` (calls taskStore.updateTask, startTask)
- `Planner.tsx`, `TaskCard.tsx`, `TaskDetailsPanel.tsx`

**What could break:**
- TypeScript compilation errors
- Runtime errors in components
- Focus timer integration

**What needs updating together:**
- All components calling the changed function
- `focusStore.ts` (if it calls the function)
- Type definitions in `database.ts`

---

### **Changing Database Schema**

**Direct dependencies:**
- `db.ts` (migration logic)
- `localStorage.ts` (field mappings)
- `dataSyncService.ts` (sync mappings)
- Supabase schema

**What could break:**
- Database migrations fail
- Sync breaks completely
- Data loss on app update
- Type mismatches

**What needs updating together:**
- `db.ts` (autoMigrate function)
- `localStorage.ts` (mapTask, field mappings)
- `dataSyncService.ts` (buildPayload)
- Supabase SQL migration
- `database.ts` type definitions
- All components using the field

---

## 🔟 Navigation Guide (Cheat Sheet)

### **"I want to change..."**

| Goal | Go Here |
|------|---------|
| **Calendar/Planner behavior** | `src/components/planner/Planner.tsx` |
| **Column definitions** | `src/utils/columnMap.ts` |
| **Task card appearance** | `src/components/planner/TaskCard.tsx` |
| **Drag-and-drop logic** | `src/components/planner/Planner.tsx` (handleDragEnd) |
| **Estimated time logic** | `src/utils/timeParser.ts`, `src/store/taskStore.ts` (createTask) |
| **Actual time tracking** | `src/store/focusStore.ts` (syncTimer), `src/utils/sessionUtils.ts` |
| **Timer display** | `src/components/focus/FocusTimerPanel.tsx` |
| **Focus session logic** | `src/store/focusStore.ts` |
| **Pomodoro settings** | `src/store/settingsStore.ts`, `src/components/focus/Settings.tsx` |
| **Break timer** | `src/store/focusStore.ts` (startBreak, stopBreak) |
| **Data sync** | `src/services/dataSyncService.ts` |
| **Database schema** | `electron/main/db.ts` (autoMigrate) |
| **Supabase schema** | `supabase/supabase_setup.sql` |
| **IPC channels** | `electron/preload/index.ts`, `electron/main/index.ts` |
| **Task CRUD operations** | `src/store/taskStore.ts` |
| **List management** | `src/store/listStore.ts` |
| **Subtask logic** | `src/store/taskStore.ts` (subtask methods) |
| **Reports/Analytics** | `src/components/reports/hooks/useReportsController.ts` |
| **Chart rendering** | `src/components/reports/components/ActivityChart.tsx` |
| **Session history** | `src/components/reports/components/SessionLog.tsx` |
| **Sound notifications** | `src/services/audioService.ts` |
| **Crash recovery** | `src/services/backupService.ts` |
| **Field mappings (SQLite ↔ App)** | `src/services/localStorage.ts` |
| **Field mappings (SQLite ↔ Supabase)** | `src/services/dataSyncService.ts` |
| **Type definitions** | `src/types/database.ts` |

---

### **"I'm debugging..."**

| Issue | Check These Files |
|-------|-------------------|
| **Timer not tracking time** | `focusStore.ts` (syncTimer), `sessionUtils.ts`, `backupService.ts` |
| **Tasks not saving** | `taskStore.ts`, `localStorage.ts`, `db.ts` |
| **Sync failing** | `dataSyncService.ts`, check browser console for errors |
| **Drag-and-drop broken** | `Planner.tsx` (handleDragEnd), `@dnd-kit` library |
| **Wrong time displayed** | `sessionUtils.ts` (getTaskTotalActual), `useTimerDisplay.ts` |
| **Tasks in wrong column** | `columnMap.ts`, `taskStore.ts` (moveTaskToColumn) |
| **Subtasks not showing** | `taskStore.ts` (fetchSubtasks), `localStorage.ts` |
| **Reports showing wrong data** | `useReportsController.ts`, `focusStore.ts` (fetchSessions) |
| **Pomodoro not working** | `focusStore.ts` (syncTimer), `settingsStore.ts` |
| **Sounds not playing** | `audioService.ts`, `settingsStore.ts` (sound settings) |

---

### **"I'm adding a new feature..."**

| Feature Type | Start Here |
|--------------|-----------|
| **New task field** | 1. `db.ts` (add column), 2. `database.ts` (types), 3. `localStorage.ts` (mapping), 4. `dataSyncService.ts` (sync), 5. Supabase schema |
| **New UI component** | 1. Create in `src/components/`, 2. Add to routing in `App.tsx`, 3. Connect to Zustand store |
| **New Zustand store** | 1. Create in `src/store/`, 2. Import in components, 3. Persist if needed (see `focusStore.ts` example) |
| **New IPC channel** | 1. `electron/preload/index.ts` (expose), 2. `electron/main/index.ts` (handle), 3. `types/electron.d.ts` (types) |
| **New database table** | 1. `db.ts` (schema), 2. `database.ts` (types), 3. `localStorage.ts` (service), 4. `dataSyncService.ts` (sync), 5. Supabase schema |
| **New report/chart** | 1. `useReportsController.ts` (data logic), 2. Create component in `components/reports/components/`, 3. Add to `Reports.tsx` |

---

## 📚 Appendix: Key Concepts

### **Status vs Column**

- **Status:** Database field (`todo`, `planned`, `active`, `paused`, `done`)
- **Column:** UI concept (`backlog`, `this_week`, `today`, `done`)
- **Mapping:** `columnMap.ts` defines which statuses appear in which columns

### **Estimated vs Actual Time**

- **Estimated:** User's prediction (`estimated_minutes`)
- **Actual:** Timer-tracked reality (`actual_seconds`)
- **Conversion:** SQLite stores `estimate_m` (minutes) and `spent_s` (seconds)

### **Soft Delete vs Hard Delete**

- **Soft Delete:** Sets `deleted_at` timestamp (default for user actions)
- **Hard Delete:** Removes row from database (used for sync cleanup)
- **Why:** Soft delete allows sync to propagate deletions to Supabase

### **Sync Flag**

- `synced=0`: Local changes pending sync
- `synced=1`: In sync with Supabase
- Auto-resets to 0 on any update

### **Backup Service**

- In-memory cache of `actual_seconds` per task
- Prevents data loss if app crashes during focus session
- Checked on timer resume: `Math.max(dbValue, backupValue)`

---

**End of Data Dictionary**

*For questions or updates, see: `docs/` folder*
