# Timer Not Counting in Production Build - Fix Documentation

## 🐛 Problem

The timer in the SuperFocusPill component showed "0:00" and didn't count in the production build, but worked fine in `npm run dev`.

## 🔍 Root Causes

### 1. **Missing Pomodoro Timer Initialization**
**File:** `src/store/focusStore.ts` (line 234-249)

**Issue:** When starting a focus session, `pomodoroRemainingAtStart` was not being initialized.

**Impact:** The `syncTimer()` function calculates remaining time using:
```typescript
const rem = Math.max(0, s.pomodoroRemainingAtStart - delta)
```
Without initialization, `pomodoroRemainingAtStart` defaulted to `0`, making the timer appear frozen.

**Fix:** Added initialization in `startSession()`:
```typescript
pomodoroRemaining: pTime,
pomodoroRemainingAtStart: pTime,
```

---

### 2. **Persisted startTime from Previous Session**
**File:** `src/store/focusStore.ts` (line 452-470)

**Issue:** The `startTime` timestamp was being persisted to localStorage. When the app restarted, it loaded an old timestamp from a previous session.

**Impact:** Timer calculations use `delta = (Date.now() - startTime) / 1000`. With an old `startTime`, the delta was massive, causing incorrect timer values.

**Fix:** Removed `startTime` from persisted state:
```typescript
partialize: (s) => ({
    // ... other fields
    // DO NOT persist startTime - it should be set fresh on resume
    elapsed: s.elapsed,
    // ...
})
```

---

### 3. **Missing Hydration Logic on App Load**
**File:** `src/App.tsx` (line 44-56)

**Issue:** When the production app loaded with a persisted active session, `startTime` was `null` (not persisted), but `isActive` was `true`. This caused the timer to fail.

**Impact:** The timer tick logic in `App.tsx` checks:
```typescript
if (!isActive || (isPaused && !isBreak)) return
```
And `useTimerDisplay` checks:
```typescript
if (!isActive || isPaused || startTime == null) return
```
With `startTime === null`, the timer never ticked.

**Fix:** Added hydration logic to initialize state on app load:
```typescript
useEffect(() => {
    const focus = useFocusStore.getState()
    if (focus.isActive && !focus.startTime) {
        useFocusStore.setState({ 
            startTime: Date.now(),
            isPaused: true 
        })
    }
}, [])
```

---

## 📋 Files Changed

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `src/store/focusStore.ts` | 244-245 | Initialize pomodoro timer state |
| `src/store/focusStore.ts` | 458 | Remove startTime from persistence |
| `src/App.tsx` | 44-56 | Add hydration logic for persisted sessions |

---

## ✅ How to Test

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Run the built version** from `release/` folder

3. **Start a focus session:**
   - Click on a task
   - Click "Start" or drag to focus panel
   - Timer should start counting immediately

4. **Test persistence:**
   - Start a session
   - Close the app
   - Reopen the app
   - Click "Resume" button
   - Timer should continue counting from where it left off

5. **Test SuperFocusPill:**
   - Enable Super Focus Mode in settings
   - Start a session
   - Timer in the pill should count properly

---

## 🎯 Why This Only Affected Production

**Development Mode (`npm run dev`):**
- React StrictMode runs effects twice
- Hot module reloading resets state frequently
- State is often fresh, not loaded from localStorage
- Timer initialization happens more reliably

**Production Build:**
- StrictMode is disabled
- State is loaded from localStorage on app start
- No hot reloading to reset state
- Persistence issues become visible

---

## 🔧 Additional Notes

### Timer Tick Logic Flow

```
App.tsx (useEffect)
  ↓ Every 1 second
focusStore.syncTimer()
  ↓ Calculates delta
delta = (Date.now() - startTime) / 1000
  ↓ Updates state
elapsed = previous + delta
  ↓ Triggers re-render
useTimerDisplay hook
  ↓ Calculates display values
remainingTime = duration - elapsed
  ↓ Renders in UI
SuperFocusPill / FocusTimerPanel
```

### State Persistence Strategy

**Persisted:**
- `isActive`, `isPaused` - Session state
- `elapsed`, `duration` - Time tracking
- `taskId` - Current task reference
- `pomodoroRemaining`, `breakRemaining` - Timer values

**NOT Persisted:**
- `startTime` - Always set fresh on resume
- `sessions` - Loaded from database
- `loading` - UI state

---

## 🚀 Future Improvements

1. **Add state validation on hydration** - Ensure persisted state is valid
2. **Add migration logic** - Handle schema changes in persisted state
3. **Add debug mode** - Log timer state in development
4. **Add state reset button** - Allow users to clear corrupted state

---

**Fixed by:** Antigravity AI  
**Date:** February 7, 2026  
**Build Version:** After these fixes
