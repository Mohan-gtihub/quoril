# Quick Test Guide - Task Deletion & Sync Fixes

## Pre-Test Setup
1. Ensure the app is running (`npm run dev:electron`)
2. Open the browser console (F12) to monitor logs
3. Have at least 2-3 tasks created in different states (todo, in_progress, done)

## Test 1: Basic Task Deletion
**Goal:** Verify tasks are deleted immediately from UI

1. Create a new task in the "Today" column
2. Click the delete button (trash icon)
3. Confirm deletion in the dialog

**Expected Result:**
- ✅ Task disappears immediately from UI
- ✅ Console shows: `[TaskStore] Ending active session for task...` (if task was in focus)
- ✅ No errors in console
- ✅ Task stays deleted after page refresh

## Test 2: Delete Task During Active Focus Session
**Goal:** Verify active sessions end gracefully when task is deleted

1. Start a focus session on a task (click "Start Now" or focus button)
2. Wait 10-15 seconds for some time to accumulate
3. While the timer is running, delete the task
4. Confirm deletion

**Expected Result:**
- ✅ Focus panel closes automatically
- ✅ Timer stops
- ✅ Console shows: `[TaskStore] Ending active session for task...`
- ✅ Console shows: `[FocusStore] Saving Task...` (saving final time)
- ✅ No errors about missing task
- ✅ Task is removed from UI

## Test 3: Sync Integrity Check
**Goal:** Verify no floating-point errors in database sync

1. Create a task with estimated time (e.g., "Test task 25m")
2. Start a focus session on it
3. Let it run for 30-60 seconds
4. Pause or end the session
5. Check browser console for sync messages

**Expected Result:**
- ✅ Console shows: `[DataSyncService] Syncing X items for table: tasks`
- ✅ No errors about "invalid input syntax for type integer"
- ✅ No errors about floating-point values
- ✅ Console shows: `[Sync] Synced X tasks from Supabase`

## Test 4: Delete Task with Pending Sync
**Goal:** Verify deleted tasks don't block sync queue

1. Go offline (disable network in DevTools Network tab)
2. Create a new task
3. Add some time to it (start/stop focus session)
4. Delete the task while still offline
5. Go back online
6. Wait 10-15 seconds for sync to run

**Expected Result:**
- ✅ Task is deleted locally immediately
- ✅ When sync runs, console shows: `[DataSyncService] Skipping deleted item...`
- ✅ No sync errors
- ✅ Other tasks sync successfully

## Test 5: Rapid Task Switching and Deletion
**Goal:** Verify no race conditions during rapid operations

1. Create 3 tasks (Task A, Task B, Task C)
2. Start focus on Task A
3. After 5 seconds, switch to Task B (use "Skip to Next" or start new session)
4. After 5 seconds, delete Task A
5. After 5 seconds, delete Task B
6. End session on Task C

**Expected Result:**
- ✅ All tasks are deleted without errors
- ✅ Time is properly saved for each task before deletion
- ✅ No console errors about missing tasks
- ✅ Task C session ends normally

## Test 6: Database Type Safety
**Goal:** Verify integer fields in Supabase

1. Complete all above tests
2. Open Supabase dashboard
3. Navigate to Table Editor → tasks table
4. Check the `actual_seconds` and `elapsed_seconds` columns

**Expected Result:**
- ✅ All values are integers (no decimal points)
- ✅ No NULL values where there should be 0
- ✅ Values match what was shown in the UI

## Common Issues to Watch For

### ❌ Task doesn't disappear from UI
- Check console for errors
- Verify `deleteTask` was called
- Check if optimistic update is working

### ❌ "Task not found" errors in console
- This is now handled gracefully
- Should see: `[FocusStore] Task X no longer exists, skipping update`
- Session should reset cleanly

### ❌ Sync errors about integer types
- Check console for: `[DataSyncService] Failed to sync item...`
- Should NOT see errors about "invalid input syntax for type integer"
- If you do, check the sanitization is working

### ❌ Focus panel doesn't close after deletion
- Check if `endSession` was called
- Verify `reset()` is called in focusStore
- Check `showFocusPanel` state

## Success Criteria

All tests pass if:
1. ✅ Tasks delete immediately from UI
2. ✅ Active sessions end gracefully when task is deleted
3. ✅ No sync errors related to numeric types
4. ✅ Deleted tasks don't block sync queue
5. ✅ No console errors about missing/deleted tasks
6. ✅ All numeric fields in Supabase are integers

## Debugging Tips

If issues occur:

1. **Check Console Logs:**
   - Look for `[TaskStore]`, `[FocusStore]`, `[DataSyncService]` prefixes
   - Note any error stack traces

2. **Check Network Tab:**
   - Look for Supabase API calls
   - Check request/response payloads for type issues

3. **Check Application State:**
   - Use React DevTools to inspect store state
   - Verify `tasks` array doesn't contain deleted tasks
   - Check `focusStore.taskId` is null after deletion

4. **Check Database:**
   - Verify SQLite local DB (in app data folder)
   - Check Supabase remote DB
   - Ensure `deleted_at` is set for deleted tasks
