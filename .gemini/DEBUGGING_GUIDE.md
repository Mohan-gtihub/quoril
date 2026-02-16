# Production-Level Debugging Guide

**Last Updated:** 2026-02-16

This application now has production-level debugging enabled in development mode!

---

## 🛠️ Debugging Tools Available

When you run `npm run dev`, you'll have access to these powerful debugging tools:

### 1. **Chrome DevTools** (Auto-Opens)
The Electron window automatically opens with DevTools on startup in development mode.

**Location:** Right panel of the Electron window

**Features:**
- ✅ Console for viewing all logs
- ✅ Network tab for API requests
- ✅ Elements inspector for DOM
- ✅ Sources tab with source maps for debugging
- ✅ React DevTools integration
- ✅ Performance profiler

**How to use:**
- Already open when you start the app
- Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac) to toggle
- Look for `[TrackingEngine]`, `[StateMachine]`, `[React Query]` prefixed logs

---

### 2. **React Query DevTools**
Beautiful UI for debugging React Query cache and network requests.

**Location:** Bottom-right floating panel labeled "React Query DevTools"

**Features:**
- ✅ View all queries and their states
- ✅ Inspect cached data
- ✅ Track mutations in real-time
- ✅ Force refetch queries
- ✅ See query dependencies

**How to Access:**
1. Open the app in dev mode
2. Look for the floating React Query logo in bottom-right
3. Click to expand the DevTools panel

---

### 3. **Custom Debug Panel** (New!)
A custom-built debug console that captures all console logs in a beautiful UI.

**Location:** Bottom-right debug button (shows error count)

**Features:**
- ✅ Captures all console.log, console.warn, console.error, console.info
- ✅ Filter by log level (All, Error, Warn, Log)
- ✅ Shows timestamps for each log
- ✅ Color-coded by severity
- ✅ Keeps last 100 logs
- ✅ Clear logs button

**How to Use:**
1. Run `npm run dev`
2. Click the "DEBUG" button in bottom-right corner
3. Open the panel to see all logs with filtering

---

## 📝 Enhanced Console Logging

All stores and services now use prefixed logging for easy filtering:

### Log Prefixes:
```
[TrackingEngine]     - Activity tracking system
[StateMachine]       - State transitions (IDLE/ACTIVE)
[SyncManager]        - Database sync operations
[React Query]        - API cache and mutations
[Focus]              - Focus session operations
[Task]               - Task operations
[List]               - List operations
[ErrorBoundary]      - Component error catching
[IPC Error]          - Electron IPC errors
[SoundService]       - Audio playback
```

### Filter Logs in DevTools Console:
```javascript
// Show only tracking engine logs
console.filter = '[TrackingEngine]'

// Show only errors
console.filter = 'ERROR'

// Show React Query logs
console.filter = '[React Query]'
```

---

## 🚀 Source Maps Enabled

Source maps are now enabled for both JavaScript and CSS!

**What this means:**
- ✅ See original TypeScript code in DevTools, not compiled JavaScript
- ✅ Set breakpoints in your TypeScript files
- ✅ Step through code with proper variable names
- ✅ CSS shows original source files

**How to use:**
1. Open Sources tab in DevTools
2. Your `.ts` and `.tsx` files are available in `webpack://` folder
3. Set breakpoints by clicking line numbers
4. Debugger will stop at your breakpoints

---

## 🎯 Error Boundary

Production-level error boundary catches all React errors!

**Features:**
- ✅ Catches component errors before they crash the app
- ✅ Shows detailed error messages in development
- ✅ Stack traces in development mode
- ✅ "Try Again" and "Reload App" recovery options
- ✅ Logs errors to console for debugging

**When an error occurs:**
1. App shows a beautiful error screen instead of crashing
2. Error details are displayed in development mode
3. Stack trace is collapsible
4. You can try to recover or reload the app

---

## 🧪 Testing & Debugging Workflow

### 1. **Start Development Mode**
```bash
npm run dev
```

This will:
- ✅ Start Vite dev server at http://localhost:5173
- ✅ Open Electron window with DevTools
- ✅ Enable all debugging tools
- ✅ Enable hot module replacement (HMR)

### 2. **Monitor Logs**
- Use the Debug Panel (bottom-right button)
- Or use Chrome DevTools Console
- Filter by `[prefix]` to find specific logs

### 3. **Debug React Components**
- Use React DevTools to inspect component tree
- View props and state of any component
- Track re-renders and performance

### 4. **Debug API Calls**
- Open React Query DevTools (bottom-right)
- See all queries, their status, and cached data
- Force refetch if needed

### 5. **Debug TypeScript Code**
- Open Sources tab in DevTools
- Find your `.ts` file
- Set breakpoints
- Refresh to trigger breakpoint

---

## 🔍 Common Debugging Scenarios

### Scenario 1: "Focus timer not working"
**Steps:**
1. Open Debug Panel
2. Filter by `[Focus]`
3. Look for session start/end logs
4. Check `focusStore` state in React DevTools

### Scenario 2: "Tasks not syncing to Supabase"
**Steps:**
1. Open Debug Panel
2. Filter by `[SyncManager]` or `ERROR`
3. Check network tab for failed requests
4. Look at React Query DevTools for mutation errors

### Scenario 3: "UI not updating"
**Steps:**
1. Open React DevTools
2. Check component state and props
3. Look for console warnings about re-renders
4. Check if store is updating (view with DevTools)

### Scenario 4: "Sound not playing"
**Steps:**
1. Filter logs by `[SoundService]`
2. Look for audio playback errors
3. Check Settings to verify sound is enabled
4. Test with "Test Alert Signal" button

---

## 📊 Performance Monitoring

### Built-in Performance Tools:
- **React DevTools Profiler** - Measure render performance
- **Chrome Performance Tab** - CPU and memory usage
- **Network Tab** - API call performance
- **Console timings** - Custom performance markers

### How to Profile:
1. Open DevTools > Performance tab
2. Click record (circle button)
3. Perform actions in the app
4. Stop recording
5. Analyze the flame graph

---

## 🚨 Production vs Development

### Development Mode (npm run dev):
- ✅ DevTools auto-open
- ✅ Debug Panel visible
- ✅ React Query DevTools visible
- ✅ Source maps enabled
- ✅ Detailed error messages
- ✅ Hot module replacement

### Production Mode (npm run build):
- ❌ DevTools hidden
- ❌ Debug Panel not rendered
- ❌ React Query DevTools not rendered
- ✅ Source maps still available (for debugging production builds)
- ✅ Error boundary still catches errors (but shows minimal UI)
- ✅ Optimized bundle

---

## 💡 Tips & Tricks

1. **Quick DevTools Toggle**: Press `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac)

2. **Filter Console**: Use the filter box in DevTools console
   ```
   [TrackingEngine]
   [React Query]
   ERROR
   ```

3. **Preserve Logs**: Enable "Preserve log" in DevTools console to keep logs after page refresh

4. **React DevTools**: Look for:
   - `useFocusStore` hook state
   - `useTaskStore` hook state
   - `useSettingsStore` hook state

5. **Network Debugging**: 
   - Check "Disable cache" in Network tab when debugging stale data
   - Filter by "XHR" to see only API calls

6. **Breakpoint Debugging**:
   ```typescript
   debugger; // Add this line to pause execution
   ```

7. **Store Debugging**: Access stores from console:
   ```javascript
   // In DevTools console:
   window.useFocusStore.getState()
   window.useTaskStore.getState()
   ```

---

## 🎓 Learning Resources

- **React DevTools**: https://react.dev/learn/react-developer-tools
- **Chrome DevTools**: https://developer.chrome.com/docs/devtools/
- **React Query DevTools**: https://tanstack.com/query/latest/docs/react/devtools
- **Electron Debugging**: https://www.electronjs.org/docs/latest/tutorial/debugging-main-process

---

## ✅ Checklist: Is Debugging Working?

When you run `npm run dev`, verify:

- [x] Electron window opens
- [x] DevTools panel is visible on the right
- [x] Console shows `[TrackingEngine] Initializing System Agent...`
- [x] Debug button appears in bottom-right corner (shows error count)
- [x] React Query DevTools button appears in bottom-right
- [x] You can click Debug button to see captured logs
- [x] Source maps work (can see .tsx files in Sources tab)
- [x] Error boundary catches errors gracefully

---

**You now have production-level debugging! 🎉**

If any debugging tool isn't working, check the console for errors and ensure you're running `npm run dev` (not `npm run build`).
