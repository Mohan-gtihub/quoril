# Implementation Plan - Advanced Analytics & Habit Tracker

The goal is to transform the "Reports" page into a comprehensive **Analytics & Habit Tracker**, allowing users to track their focus, breaks, consistency, and goal progress over flexible time periods.

## 1. Store Updates

### `settingsStore.ts`
- **Add**: `dailyFocusGoalMinutes` (number).
  - Default: `240` (4 hours).
- **Add**: `weeklyWorkDays` (number[]).
  - Default: `[1, 2, 3, 4, 5]` (Mon-Fri) to calculate streaks correctly.

### `focusStore.ts`
- **Verify**: Ensure `focus_score` (1-10) is being requested/saved at the end of sessions.
- **Action**: Currently `endSession` accepts `focusScore`, but the UI might not be facilitating it. We will ensure the UI supports this input.

## 2. New Components

### `components/reports/DateRangePicker.tsx`
- **Features**:
  - Dropdown for presets: "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month".
  - Custom range selector (Start Date -> End Date).
  - Returns: `{ start: Date, end: Date }`.

### `components/reports/HabitConsistencyCard.tsx`
- **Features**:
  - Visualizes "Streak" (consecutive days meeting the daily goal).
  - "Heatmap" for the selected month/year (Mini version or reused from Sidebar).
  - "Consistency Score": % of days goal was met in the selected period.

### `components/reports/DailyGoalRing.tsx`
- **Features**:
  - Circular progress bar showing `Total Focus Time` vs `Daily Goal`.
  - Color-coded: Red (<50%), Yellow (50-90%), Green (100%+), Glowing (Super Focus).

### `components/reports/FocusQualityChart.tsx`
- **Features**:
  - Line chart tracing the `focus_score` (1-10) over the selected date range.
  - Correlate with "Time of Day" to show "Peak Focus Hours" visually.

## 3. Page Overhaul: `Reports.tsx`

### Layout Structure
1.  **Header**: Title + **DateRangePicker** (Top Right).
2.  **Hero Grid** (Top Row):
    - **Daily Focus Goal** (Ring Chart): "3h 45m / 4h".
    - **Efficiency Score** (Gauge): `Focus Time / (Focus + Break Time)`. "85% Efficient".
    - **Habit Streak** (Stat): "5 Day Streak" with fire icon/animation.
    - **Total Breaks** (Stat): "45m (3 breaks)".
3.  **Main Chart**:
    - **Activity Trends**: Stacked Bar Chart (X: Date, Y: Hours).
        - Series A: Deep Work (Purple).
        - Series B: Breaks (Green).
4.  **Session & Task Log** (Bottom Section):
    - Detailed table of all sessions in the selected range.
    - Columns: `Date`, `Task Name`, `Duration`, `Type` (Focus/Break), `Focus Score`.
    - Grouped by Day.

## 4. Implementation Steps

1.  **Update Stores**: Add necessary settings fields.
2.  **Create `DateRangePicker`**: Implement the date logic.
3.  **Refactor `Reports.tsx`**:
    - Replace the hardcoded `last14Days` logic with dynamic filtering based on the selected range.
    - Implement the new charts using `recharts`.
    - Connect the "Goal" visual to `settingsStore`.
4.  **Add Input Prompt**: Ensure when a session ends, if `focus_score` isn't captured, we provide a way to add it (or auto-calculate based on distractions/pauses if manual entry is annoying). *For now, we will focus on visualization of time data which determines the habit.*

## 5. Verification
- Select "Last 7 Days" -> Verify charts update.
- Select "Today" -> Verify real-time progress against the Daily Goal.
- Check "Streak" calculation logic (skips weekends if configured).
