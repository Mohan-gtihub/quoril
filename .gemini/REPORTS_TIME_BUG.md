# Critical Fix Needed: Reports Time Calculation

## Problem
The reports are showing incorrect time because the code is using **task creation/completion timestamps** instead of **session start/end timestamps**.

## Root Cause

### Current Broken Logic:
```typescript
// Line 146-147 - WRONG!
const taskStart = t.created_at ? parseISO(t.created_at) : new Date()
const taskEnd = t.completed_at ? parseISO(t.completed_at) : new Date()
```

This checks WHEN the task was created/completed, NOT when work was actually done!

###  What This Means:
- Task created 5 days ago but worked on today = Won't count for today
- Task completed yesterday but created last week = Counts for wrong week
- All time attribution is completely wrong

## Correct Approach

Use `filteredSessions` array which has actual work timestamps:
```typescript
const todayStart = startOfDay(new Date())
const todayEnd = endOfDay(new Date())

const todaySessions = filteredSessions.filter(s => {
    const start = parseISO(s.start_time)   // When work ACTUALLY started
    const end = s.end_time ? parseISO(s.end_time) : new Date()  // When work ACTUALLY ended
    return start <= todayEnd && end >= todayStart && s.type !== 'break'
})

const totalMinutesToday = Math.round(todaySessions.reduce((acc, s) => {
    const sStart = parseISO(s.start_time)
    const sEnd = s.end_time ? parseISO(s.end_time) : new Date()
    const overlapStart = sStart > todayStart ? sStart : todayStart
    const overlapEnd = sEnd < todayEnd ? sEnd : todayEnd
    const overlapSeconds = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 1000))
    return acc + overlapSeconds
}, 0) / 60)
```

## Sections That Need Fixing

1. **Lines 138-160:** Daily chart data calculation
2. **Lines 363-401:** TODAY focus time calculation
3. **Lines 330-362:** THIS WEEK calculation

All three are using task timestamps instead of session timestamps.

## Impact

**Before Fix:**
- A task created last week but worked on today shows time for last week
- Completely inaccurate daily/weekly reports
- User can't trust the data

**After Fix:**
- Time is attributed to the actual day/week work was done
- Accurate daily and weekly totals
- Midnight-crossing sessions handled correctly

## Next Steps

Replace all instances of:
- `t.created_at` and `t.completed_at` checks
With:
- `s.start_time` and `s.end_time` from sessions

This is the FUNDAMENTAL issue with reports time accuracy.
