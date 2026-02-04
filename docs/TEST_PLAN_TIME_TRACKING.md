# Test Plan: Time Tracking & Persistence

This document outlines the test scenarios and safeguards implemented to ensure that task time tracking is accurate, persistent, and reliable, even across application reloads or task completion.

## 1. Scenario: Start, Pause, Resume, End
**User Story:** I start a task, pause it for a break, resume, and then finish the session.
**Expected Behavior:** The total duration (excluding pause time) is added to the task's "Actual Time".
**Implementation Guarantee:**
- `focusStore` tracks `elapsed` seconds, pausing the ticker when `isPaused` is true.
- On `endSession`, the `elapsed` time is converted to minutes and added to the **Task's** `actual_minutes` field in the database.

## 2. Scenario: App Reload / Crash Recovery
**User Story:** I am 15 minutes into a session. I accidentally close the tab or reload the app.
**Expected Behavior:** The session resumes automatically. The timer corrects itself to show the true elapsed time since start.
**Implementation Guarantee:**
- **State Persistence:** `focusStore` uses `localStorage` to save `startTime`, `taskId`, and `isActive`.
- **SyncTimer:** On app load, `syncTimer` calculates `Date.now() - startTime` to correct the `elapsed` counter, ensuring no time is lost.
- **List Persistence:** `listStore` saves `selectedListId`, ensuring the task list loads correctly so the active task is found.

## 3. Scenario: Task Completion & Re-opening
**User Story:** I work on a task for 1 hour, mark it as Done. Later, I realize I need to do more work. I move it back to "Today" and start the timer again.
**Expected Behavior:** The original 1 hour is PRESERVED. The new session adds to it (e.g., 1h -> 1h 30m).
**Implementation Guarantee:**
- **Cumulative Updates:** `endSession` reads the *current* `actual_minutes` from the database and *adds* the new session duration. It does NOT overwrite with just the session time.
- **Status Independence:** Moving a task or marking it done (via `toggleComplete`) only updates the `status` field. `actual_minutes` remains untouched in the database.

## 4. Scenario: Background Sync
**User Story:** I use the app on my phone and desktop (if supported).
**Expected Behavior:** Time tracked on one device syncs to the DB.
**Implementation Guarantee:**
- All updates to `tasks` and `focus_sessions` are pushed to Supabase via `syncToSupabase`.

## 5. Scenario: Reporting
**User Story:** I check the Daily Report.
**Expected Behavior:** "Total Time" sums up the `actual_minutes` of all tasks worked on today.
**Implementation Guarantee:**
- `Reports.tsx` aggregates `task.actual_minutes`. Since `endSession` updates this field reliably, reports are always accurate.

## Code Safeguards
- **`endSession`**: Explicitly fetches the latest task state before adding time to prevent race conditions.
- **`FocusMode`**: Falls back to global store lookup to find the active task if it's not in the immediate view (e.g. Backlog), ensuring the timer is always linked to the correct task.
