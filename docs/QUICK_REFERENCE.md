# Quick Reference - Task Deletion & Sync Fixes

## 🎯 What Was Fixed

| Issue | Solution | File |
|-------|----------|------|
| Floating-point in integer fields | `Math.floor()` all calculations | `sessionUtils.ts` |
| Tasks not deleting from UI | Optimistic updates + cleanup | `taskStore.ts` |
| Deleted tasks blocking sync | Skip deleted items in sync | `dataSyncService.ts` |
| Active sessions on deleted tasks | Check task exists before update | `focusStore.ts` |
| DB type safety | Sanitize at write time | `db.ts` |

## 🔧 Key Functions Modified

### sessionUtils.ts
```typescript
// All return integers now
getTaskTotalActual()    // Math.floor() on base + delta
hydrateElapsed()        // Math.floor() on total
calculateRemainingSeconds() // Math.floor() on result
```

### taskStore.ts
```typescript
deleteTask(id) {
  // 1. End focus session if active
  // 2. Clear backup data
  // 3. Remove from UI (optimistic)
  // 4. Delete from DB (soft delete)
  // 5. Clear from sync queue
  // 6. Background sync
}
```

### dataSyncService.ts
```typescript
sanitizeNumericFields(table, item) {
  // Floor all numeric fields
  // actual_seconds, elapsed_seconds, etc.
}

syncTable(table) {
  // Skip items with deleted_at
  // Sanitize before sync
  // Continue on errors
}
```

### focusStore.ts
```typescript
syncTimer() {
  // Check if task exists
  // Reset state if deleted
}

endSession() {
  // Verify task exists before update
  // Skip update if deleted
}
```

## 📋 Deletion Flow Checklist

When a task is deleted:
- [ ] Check if task is in focus → end session
- [ ] Clear backup service data
- [ ] Remove from UI immediately
- [ ] Soft delete in DB (set deleted_at)
- [ ] Remove from sync queue
- [ ] Background sync to Supabase

## 🛡️ Defense Layers

```
User Action
    ↓
Layer 1: sessionUtils.ts (Math.floor all calcs)
    ↓
Layer 2: dataSyncService.ts (sanitizeNumericFields)
    ↓
Layer 3: db.ts (sanitizeValue before write)
    ↓
Supabase (clean integers)
```

## 🧪 Quick Test

```typescript
// 1. Create & focus a task
const task = await createTask({ title: "Test 25m" })
await startSession(task.id, 1500)

// 2. Wait 30 seconds
await sleep(30000)

// 3. Delete while active
await deleteTask(task.id)

// Expected:
// ✅ Task disappears
// ✅ Session ends
// ✅ No errors
// ✅ Clean sync
```

## 🚨 Common Errors (Now Fixed)

### Before
```
❌ invalid input syntax for type integer: "120.45"
❌ Task not found in store
❌ Cannot read property 'id' of undefined
❌ Sync failed: constraint violation
```

### After
```
✅ [DataSyncService] Skipping deleted item...
✅ [FocusStore] Task no longer exists, skipping update
✅ [TaskStore] Ending active session before deletion
✅ All numeric fields are integers
```

## 📊 Metrics to Monitor

- **Deletion Success Rate**: Should be 100%
- **Sync Error Rate**: Should be ~0%
- **Type Errors**: Should be 0
- **Orphaned Sessions**: Should be 0

## 🔍 Debug Commands

```typescript
// Check task state
console.log(useTaskStore.getState().tasks)

// Check focus state
console.log(useFocusStore.getState())

// Check sync queue
await window.electronAPI.db.getPendingSync('tasks')

// Check for deleted tasks
await window.electronAPI.db.exec(
  'SELECT * FROM tasks WHERE deleted_at IS NOT NULL'
)
```

## 💡 Best Practices

1. **Always use Math.floor()** for time calculations
2. **Check task exists** before updating in focus operations
3. **Use optimistic updates** for immediate UI feedback
4. **Handle errors gracefully** - don't block other operations
5. **Clear related data** when deleting (backup, sync queue, etc.)

## 🎓 Learning Points

- **Optimistic UI**: Update UI before DB for better UX
- **Multi-layer validation**: Defense in depth prevents bugs
- **Graceful degradation**: System works even when parts fail
- **Type safety**: Prevent errors at multiple levels
- **Clean separation**: Each layer has clear responsibility

## 📞 Support

If you encounter issues:
1. Check console for `[TaskStore]`, `[FocusStore]`, `[DataSyncService]` logs
2. Verify task state in React DevTools
3. Check Supabase logs for sync errors
4. Review `TESTING_GUIDE.md` for comprehensive tests

---

**Last Updated**: 2026-02-04
**Version**: 1.0.0
**Status**: ✅ Production Ready
