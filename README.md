# Quoril

A desktop productivity operating system for deep work. Quoril combines task management, focus tracking, app usage analytics, and digital wellbeing into a single offline-first Electron application with real-time cloud sync.

Built by **Mohan Kilari**.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Features](#features)
  - [Task Management](#task-management)
  - [Focus Engine](#focus-engine)
  - [App Tracking](#app-tracking)
  - [Screen Time & Digital Wellbeing](#screen-time--digital-wellbeing)
  - [Reports & Analytics](#reports--analytics)
  - [Workspaces & Lists](#workspaces--lists)
  - [Themes & Customization](#themes--customization)
  - [Authentication & Security](#authentication--security)
  - [Sync System](#sync-system)
- [Electron Integration](#electron-integration)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [File Reference](#file-reference)
- [Settings Reference](#settings-reference)
- [Build & Distribution](#build--distribution)
- [Troubleshooting](#troubleshooting)

---

## Overview

Quoril is a desktop-native productivity app that operates as a personal command center for focused work. Unlike browser-based task managers, Quoril runs as a native process that can track active windows, detect idle time, measure screen usage by category, and provide a floating always-on-top focus widget.

**Core philosophy:** All data is local-first (SQLite), synced to the cloud (Supabase) in the background. The app works fully offline and syncs when connectivity is available.

**Platforms:** Windows, macOS, Linux.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Desktop | Electron 28 | Native OS integration, system tray, window management |
| Frontend | React 18 + TypeScript | UI framework |
| Build | Vite 5 | Fast dev server, HMR, production bundling |
| Styling | TailwindCSS 3 | Utility-first CSS with custom CSS variable theming |
| State | Zustand 4 | Lightweight stores with localStorage persistence |
| Server State | React Query 5 | Async data fetching and caching |
| Local DB | better-sqlite3 | Synchronous SQLite for Electron main process |
| Cloud DB | Supabase (PostgreSQL) | Auth, real-time subscriptions, cloud storage |
| Animations | Framer Motion | Page transitions, micro-interactions, layout animations |
| Charts | Recharts | Bar charts in Activity Dashboard |
| Drag & Drop | @dnd-kit | Task reordering and column movement |
| Icons | Lucide React | Consistent icon system |
| Routing | React Router v6 | Hash-based routing for Electron |
| Sound | Howler.js | Alert sounds, celebration audio |
| App Tracking | active-win | Native window title and app name detection |
| Forms | React Hook Form + Zod | Validation and form state |
| Notifications | React Hot Toast | In-app toast notifications |
| Confetti | canvas-confetti | Task completion celebrations |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase project (for cloud sync and auth)

### Installation

```bash
git clone <repo-url>
cd quoril
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

Launches the Vite dev server and Electron app with hot module replacement.

### Production Build

```bash
npm run dist:win    # Windows (.exe installer)
npm run dist:mac    # macOS (.dmg)
npm run dist:linux  # Linux (.AppImage)
```

---

## Architecture

### Data Flow

```
User Action
    |
    v
React Component --> Zustand Store --> localStorage Service
                                           |
                              +------------+------------+
                              |                         |
                         SQLite (local)           Supabase (cloud)
                         via IPC bridge           via background sync
```

### Process Model

```
+---------------------------+
|    Electron Main Process   |
|   - Window management      |
|   - System tray            |
|   - SQLite database        |
|   - App tracking engine    |
|   - IPC handlers           |
+---------------------------+
          |  IPC (contextBridge)
          v
+---------------------------+
|   Electron Renderer        |
|   - React application      |
|   - Zustand stores         |
|   - Supabase client        |
|   - Background sync        |
+---------------------------+
```

### Offline-First Sync

1. All writes go to local SQLite first
2. Each row has a `synced` flag (0 = pending, 1 = synced)
3. Background sync runs every 10 seconds
4. Syncs tables in foreign-key-safe order: workspaces -> lists -> tasks -> subtasks -> focus_sessions
5. Uses upsert for conflict-free merging
6. Works fully offline; syncs when connectivity returns

---

## Features

### Task Management

**Kanban Board** with four columns:
- **Backlog** - Idea storage for future tasks
- **This Week** - Short-term planned work
- **Today** - Tasks scheduled for the current day
- **Done** - Completed tasks with history

**Task Properties:**
- Title (with auto-parsed time estimates, e.g. `[25m] Write report`)
- Status: `todo`, `planned`, `active`, `paused`, `done`
- Priority: `low`, `medium`, `high`, `critical` (color-coded dots)
- Estimated time (minutes)
- Actual time spent (seconds, auto-tracked)
- Due date with time
- Recurring flag (auto-resets daily)
- Subtasks (unlimited, with completion tracking)
- Soft delete support (`deleted_at` timestamp)
- Sort order for drag-and-drop reordering

**Drag & Drop:**
- Reorder tasks within a column
- Move tasks between columns (changes status automatically)
- Visual drag overlay during movement

**Task Details Panel:**
- Side panel for editing task properties
- Inline subtask management
- Priority selector
- Time estimate editing
- Delete with in-app confirmation dialog

---

### Focus Engine

The focus system has three interfaces, each for a different context:

#### Full Focus Mode (`/focus`)
A dedicated full-screen page for deep work sessions:
- Large timer display with elapsed/remaining time
- Active task info with description
- Task queue (upcoming tasks)
- 3-button control grid: Pause/Resume, Break, Complete
- Pomodoro timer overlay (when enabled)
- Break tracking with separate timer
- Session completion celebration (confetti + sound)

#### Super Focus Pill (Floating Widget)
An always-on-top frameless window that floats over other applications:
- Compact pill showing task name + running timer
- Hover to reveal controls: Pause, Break, Skip, Complete, Expand
- Expandable subtask panel with inline add/toggle
- Drag handle for repositioning
- Pomodoro badge on top
- Dynamic window resizing based on content
- Transparent background with glassmorphism

#### Focus Popup (Separate Window)
A small popup window for quick session management:
- Timer display
- Play/Pause toggle
- Skip to next task
- Complete and close

**Session Types:**
- `regular` - Standard focus session
- `deep_work` - Extended deep work
- `quick_sprint` - Short burst
- `pomodoro` - Pomodoro-timed session
- `break` - Scheduled break
- `long_break` - Extended break

**Pomodoro System:**
- Configurable work duration (default: 25 minutes)
- Configurable break duration (default: 10 minutes)
- Visual countdown timer
- Automatic break prompts
- Session count tracking

**Alerts:**
- Timed interval alerts (configurable, e.g. every 10 minutes)
- Sound notifications (multiple sound options)
- Visual flash on screen
- Native OS notifications

---

### App Tracking

Quoril runs a background tracking engine in the Electron main process that monitors which application the user is actively using.

**How it works:**
1. Every 5 seconds, the `SessionManager` calls `active-win` to get the foreground window
2. The app name and window title are classified into categories
3. Sessions are recorded to `app_sessions` with start/end times, duration, and idle detection
4. For browsers, the window title is parsed to extract the website domain
5. Domain sessions are tracked separately in `domain_sessions`

**Category Classification** (20+ rules):
| Category | Apps |
|---|---|
| Development | VS Code, Cursor, IntelliJ, PyCharm, WebStorm, Terminal, Postman |
| Work | Outlook, Excel, Word, PowerPoint, Figma, Canva, Notion |
| Communication | Slack, Discord, Teams, WhatsApp, Telegram, Zoom |
| Web | Chrome, Firefox, Safari, Edge, Brave, Opera |
| Entertainment | Spotify, Netflix, YouTube, Reddit |

**Website Detection** (within browsers):
YouTube, Netflix, GitHub, Stack Overflow, ChatGPT, Claude, LinkedIn, Figma, Linear, Gmail, and more are detected from browser window titles and categorized independently.

**Idle Detection:**
- System idle time > 3 minutes triggers "Idle" state
- Idle sessions are recorded separately
- Active vs idle ratio is calculated for productivity scoring

**Context Linking:**
- When a focus session is active on a specific task, all app tracking data is linked to that task via the `context_id`
- This allows per-task app usage reports

**macOS Accessibility Permission:**
- On macOS, `active-win` requires Accessibility permission
- Quoril checks permission on launch and defers tracking if not granted
- Settings page shows an in-app permission card to guide users through granting access
- Tracking starts automatically after permission is granted

---

### Screen Time & Digital Wellbeing

A dedicated page (`/screen-time`) providing detailed screen usage analysis. Accessible via the "Screen Time" item in the sidebar.

**KPI Cards:**
- Total screen time (with % comparison to 7-day average)
- Number of apps used (with session count)
- Peak usage hour
- Longest continuous session

**Hourly Usage Heatmap:**
- 24-bar chart showing usage intensity per hour of the day
- Interactive tooltips with exact time and app count per hour
- Peak hour highlighted with accent color and glow

**Productivity Split:**
- Stacked bar: productive (Development/Work) vs neutral vs distracting (Entertainment/Gaming)
- Exact durations and percentages for each bucket
- Color-coded legend

**Category Donut Chart:**
- SVG arc chart with proportional segments per category
- Color-coded legend with app counts and percentages
- Total time displayed in the center

**7-Day Trend:**
- Daily total screen time for the past week
- Current day highlighted
- 7-day average and active day count

**App Usage List:**
- Top 12 apps ranked by usage time
- Category-colored progress bars
- Session duration for each app

**Website/Domain List:**
- Top 10 websites by time spent
- Usage progress bars

**Activity Timeline:**
- Chronological log of app switches throughout the day
- Grouped consecutive sessions by app
- Time-stamped with category-colored dots
- Most recent 30 entries displayed

**Day Navigation:**
- Navigate between days (back/forward arrows)
- Click to jump back to today
- Live indicator when viewing today (auto-refreshes every 30 seconds)

---

### Reports & Analytics

The Reports page (`/reports`) provides a comprehensive analytics dashboard with a configurable date range.

**Daily Snapshot (6 KPI cards):**
- Focus Time (hours + session count)
- Tasks Done (completed/total + completion rate)
- Productivity Score (0-100%, based on focus + productive app usage)
- Average Session Length
- App Switches (with Deep Work/Balanced/Scattered classification)
- Top Distraction (most-used entertainment/social app)

**Performance Trends:**
- Focus minutes per day (bar chart)
- Focus quality per day (with interruption penalty scoring)
- Productivity gauge (SVG circular score 0-100)
- Focus time vs productive app time breakdown

**Work Execution:**
- Task completion breakdown (completed, in progress, todo)
- Estimation accuracy gauge (how close estimates are to actuals)
- Most underestimated/overestimated tasks
- Workspace productivity comparison

**Attention & Behavior:**
- Active vs idle ratio
- Top apps by active time (top 8)
- Category breakdown (Development, Work, Communication, etc.)
- Context switches per day with Deep Work/Balanced/Scattered labels

**Habit Consistency:**
- Recurring task tracking
- Daily completion status
- Streak tracking

**Date Range Picker:**
- Last 7 days (default)
- Custom date range selection

---

### Workspaces & Lists

**Workspaces** are top-level containers for organizing related lists:
- Custom name and color (10-color palette)
- Drag to reorder
- Delete workspace (lists are preserved)
- Sidebar navigation with color indicators

**Lists** organize tasks within workspaces:
- Custom name and color
- Archive/restore functionality
- Soft delete support
- "Unassigned" system list for orphaned tasks
- Move lists between workspaces

**System Folders:**
- **Unassigned** - Lists not in any workspace
- **Archived** - Archived lists (hidden from main view)

---

### Themes & Customization

**Theme Options:**
| Theme | Description |
|---|---|
| Onyx Dark | Default dark theme, near-black backgrounds |
| Arcade Blue | Deep blue tones |
| Sunset Red | Warm red accents |
| Cosmic Nebula | Purple/violet space theme |

All themes use CSS custom properties (`--bg-primary`, `--text-primary`, `--accent-primary`, etc.) for consistent theming across the entire application.

---

### Authentication & Security

**Sign-up/Login:**
- Email + password authentication
- Google OAuth (via Supabase, with deep link callback)
- Email verification

**Password Requirements:**
- 12+ characters
- Uppercase + lowercase letters
- At least one number
- At least one special character

**Session Security:**
- Automatic token refresh (5 minutes before expiry)
- 30-minute inactivity timeout
- 12-hour maximum session duration
- Browser fingerprinting for session validation
- Rate limiting: 5 login attempts per minute, 15-minute lockout

**Deep Link Protocol:**
- Custom URL scheme: `quoril://`
- Handles auth callbacks, email verification, password reset
- Single-instance lock prevents duplicate windows

---

### Sync System

**Offline-First Architecture:**
- All data stored locally in SQLite (`quoril_v2.sqlite` in user data directory)
- Background sync every 10 seconds to Supabase
- Respects foreign key order: workspaces -> lists -> tasks -> subtasks -> focus_sessions
- Each row has a `synced` flag; only pending rows are uploaded
- Real-time subscriptions for workspace and list changes from other devices
- Conflict resolution via upsert (last write wins)

**Data Safety:**
- Backup service persists focus timer state to localStorage every second
- Crash recovery: unsaved time is restored on next launch
- Soft delete: records are marked with `deleted_at` rather than removed

---

## Electron Integration

### Window Management
- Custom frameless window with transparent background
- Custom title bar with minimize/maximize/close controls
- Minimum size: 1000x600, default: 1400x900
- Hide to system tray on close (keeps running in background)
- Always-on-top support for Super Focus Pill

### System Tray
- Show/hide application
- Quit option
- Tooltip displays "Quoril"

### IPC Bridge
All communication between main and renderer processes uses Electron's `contextBridge` with `contextIsolation: true`. The renderer never has direct access to Node.js APIs.

**Exposed APIs:**
- `window` - minimize, maximize, close
- `app` - getVersion, getPlatform
- `notification` - show native OS notifications
- `focus` - session lifecycle events
- `file` - openExternal (safe URL opening)
- `store` - persistent key-value store (JSON file)
- `db` - all database operations (40+ methods)
- `tracker` - app tracking context management
- `auth` - user session management, deep link handling
- `permissions` - macOS accessibility permission checks
- `screenTime` - screen time data aggregation
- `reports` - analytics dashboard data

### Auto-Launch
- Production builds register as a login item (launches on system startup)
- Dev builds skip auto-launch

### Crash Logging
- Unhandled errors are written to `quoril-crash.log` on the desktop
- Both `uncaughtException` and `unhandledRejection` are captured

---

## Database Schema

### Core Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `tasks` | Individual tasks | id, user_id, list_id, title, status, priority, estimate_m, spent_s, is_recurring, deleted_at |
| `lists` | Task containers | id, user_id, name, color, workspace_id, archived_at, deleted_at |
| `subtasks` | Task sub-items | id, task_id, title, completed, sort_order, deleted_at |
| `focus_sessions` | Timer sessions | id, user_id, task_id, type, seconds, start_time, end_time, metadata, deleted_at |
| `workspaces` | List groups | id, user_id, name, color, sort_order, deleted_at |

### App Tracking Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `apps` | Known applications | id, name, category, productive_score |
| `app_sessions` | Per-app usage records | id, user_id, app_id, context_id, start_time, end_time, duration_seconds, idle_seconds, window_title, activity_level |
| `domain_sessions` | Website usage records | id, user_id, domain, start_time, end_time, duration_seconds |
| `contexts` | Links sessions to tasks | id, type (global/task), ref_id |
| `domain_categories` | Website classifications | id, domain, category, productivity_score |

### System Tables

| Table | Purpose |
|---|---|
| `db_meta` | Migration version tracking |

All tables include `created_at`, `updated_at`, and `synced` columns. Soft-delete is implemented via `deleted_at` timestamps.

**Migration History:** 9 versions, from basic task/list schema through app tracking, workspace support, and soft-delete columns.

---

## Project Structure

```
quoril/
├── electron/
│   ├── main/
│   │   ├── index.ts              # Main process: window, tray, IPC handlers
│   │   ├── db.ts                 # SQLite database, migrations, all queries
│   │   └── core/
│   │       ├── core.ts           # Tracking engine orchestrator
│   │       ├── collector.ts      # Active window detection & classification
│   │       ├── session.ts        # Session lifecycle management
│   │       ├── context.ts        # Task/global context tracking
│   │       ├── state.ts          # Tracker state machine
│   │       └── sync.ts           # Background sync to Supabase
│   ├── preload/
│   │   └── index.ts              # Secure IPC bridge (contextBridge)
│   └── preload.cjs               # Legacy preload for window management
│
├── src/
│   ├── App.tsx                    # Root component, routing, providers
│   ├── main.tsx                   # React entry point
│   ├── index.css                  # Global styles, CSS variables, themes
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx           # Main task dashboard with bento layout
│   │   │   ├── HomeOverview.tsx         # Home page with stats and suggestions
│   │   │   ├── ActivityDashboard.tsx    # Real-time app tracking view
│   │   │   ├── ActivityHeatmap.tsx      # 6-month GitHub-style activity grid
│   │   │   └── CreateListModal.tsx      # New list creation form
│   │   ├── focus/
│   │   │   ├── FocusMode.tsx           # Full-screen focus interface
│   │   │   ├── FocusTimerPanel.tsx      # Timer + task queue panel
│   │   │   ├── SuperFocusPill.tsx       # Floating always-on-top widget
│   │   │   ├── FocusPopup.tsx           # Separate popup window
│   │   │   ├── Settings.tsx             # All app settings
│   │   │   └── ReflectionModal.tsx      # Post-session reflection
│   │   ├── planner/
│   │   │   ├── Planner.tsx             # Kanban board with 4 columns
│   │   │   ├── TaskCard.tsx            # Individual task with controls
│   │   │   ├── TaskDetailsPanel.tsx     # Side panel for task editing
│   │   │   ├── TodayColumn.tsx         # Specialized Today column
│   │   │   ├── CreateTaskModal.tsx      # New task form
│   │   │   ├── PlannerHeader.tsx       # List selector and filters
│   │   │   └── DateNavigator.tsx       # Day navigation controls
│   │   ├── reports/
│   │   │   ├── Reports.tsx             # Main analytics dashboard
│   │   │   ├── hooks/
│   │   │   │   ├── useReportsData.ts   # Root data fetching hook
│   │   │   │   ├── useFocusReport.ts   # Focus metrics computation
│   │   │   │   ├── useAppReport.ts     # App usage metrics
│   │   │   │   └── useTaskReport.ts    # Task completion metrics
│   │   │   └── components/
│   │   │       ├── ReportsDatePicker.tsx
│   │   │       └── ReportsHeader.tsx
│   │   ├── screentime/
│   │   │   ├── ScreenTime.tsx          # Screen time page
│   │   │   └── useScreenTimeData.ts    # Screen time data hook
│   │   ├── layout/
│   │   │   ├── Layout.tsx              # Main wrapper with sidebar
│   │   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   │   └── TitleBar.tsx            # Custom window title bar
│   │   ├── workspaces/
│   │   │   └── WorkspacesOverview.tsx  # Workspace management
│   │   ├── sidebar/
│   │   │   └── ManageWorkspacesModal.tsx
│   │   └── ui/
│   │       ├── ConfirmDialog.tsx       # Global in-app confirmation modal
│   │       ├── Checkbox.tsx            # Custom checkbox
│   │       ├── HoldButton.tsx          # Press-and-hold button
│   │       └── CompletionCelebration.tsx
│   │
│   ├── store/
│   │   ├── authStore.ts          # Authentication state + session management
│   │   ├── taskStore.ts          # Task CRUD + optimistic updates
│   │   ├── listStore.ts          # List management
│   │   ├── focusStore.ts         # Focus session state machine
│   │   ├── workspaceStore.ts     # Workspace management
│   │   ├── settingsStore.ts      # User preferences (persisted)
│   │   ├── plannerStore.ts       # Planner UI state
│   │   └── uiStore.ts            # General UI state
│   │
│   ├── services/
│   │   ├── localStorage.ts       # Data access layer (SQLite via IPC or Supabase)
│   │   ├── dataSyncService.ts    # Background sync orchestrator
│   │   ├── supabase.ts           # Supabase client initialization
│   │   ├── backupService.ts      # Timer state backup (crash recovery)
│   │   └── soundService.ts       # Audio playback (alerts, celebrations)
│   │
│   ├── hooks/
│   │   ├── useTimerDisplay.ts    # Timer formatting and state
│   │   └── useCreateTask.ts      # Task creation with time parsing
│   │
│   ├── types/
│   │   ├── database.ts           # All database type definitions
│   │   ├── electron.d.ts         # ElectronAPI TypeScript interface
│   │   └── list.ts               # List/column type definitions
│   │
│   └── utils/
│       ├── helpers.ts            # cn() class merge utility
│       ├── timeParser.ts         # Natural language time parsing
│       └── sessionUtils.ts       # Session time calculations
│
├── public/
│   ├── icon.png                  # App icon (macOS/Linux)
│   ├── icon.ico                  # App icon (Windows)
│   └── sounds/                   # Alert and celebration audio files
│
├── docs/
│   ├── UI_AUDIT.md               # UI/UX audit findings
│   └── ENGINEERING_AUDIT.md      # Architecture audit findings
│
├── package.json                  # Dependencies, scripts, electron-builder config
├── vite.config.ts                # Vite + Electron plugin configuration
├── tailwind.config.js            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── .env                          # Supabase credentials (not committed)
```

---

## File Reference

### Core & App

| File | Purpose |
|---|---|
| `src/App.tsx` | Root component. Hash router, route definitions, auth guard, theme application, global providers |
| `src/main.tsx` | React DOM entry point |
| `src/index.css` | CSS variable definitions for all themes, global styles, custom scrollbar, utility classes |

### Dashboard

| File | Purpose |
|---|---|
| `Dashboard.tsx` | Main landing page. Bento grid layout with task lists as resizable cards. Search, drag-and-drop |
| `HomeOverview.tsx` | Home page with weekly focus time, daily stats, task counts, streak, activity heatmap, suggested tasks |
| `ActivityDashboard.tsx` | Real-time app tracking. Polls every 5s. Top apps/domains bar charts. Real productivity score from app categories |
| `ActivityHeatmap.tsx` | 6-month GitHub-style contribution grid showing daily focus session intensity |
| `CreateListModal.tsx` | Modal for creating new task lists with name and color |

### Focus Mode

| File | Purpose |
|---|---|
| `FocusMode.tsx` | Full-screen focus interface. Timer, task info, pause/break/complete controls, pomodoro overlay |
| `FocusTimerPanel.tsx` | Slide-in timer panel with task queue, skip functionality, drag-to-reorder upcoming tasks |
| `SuperFocusPill.tsx` | Always-on-top floating widget. 48px pill with hover controls, expandable subtask panel |
| `FocusPopup.tsx` | Separate Electron window for minimal session control |
| `Settings.tsx` | All app settings: themes, pomodoro config, alerts, sounds, completion celebrations, macOS permissions |
| `ReflectionModal.tsx` | Post-session reflection prompt |

### Planner & Tasks

| File | Purpose |
|---|---|
| `Planner.tsx` | Kanban board. 4 columns (Backlog, This Week, Today, Done). Drag-and-drop between columns. Responsive sizing |
| `TaskCard.tsx` | Individual task card. Inline title editing, start/pause/stop controls, time display, expand menu with archive/delete |
| `TaskDetailsPanel.tsx` | Side panel for task editing. Subtask management, priority, recurring toggle, delete |
| `TodayColumn.tsx` | Specialized Today column with task count badge, estimated time stats, add task button |
| `CreateTaskModal.tsx` | Task creation form with auto time parsing from title |
| `PlannerHeader.tsx` | List dropdown selector, delete list, search |
| `DateNavigator.tsx` | Day picker for navigating planner dates |

### Reports & Analytics

| File | Purpose |
|---|---|
| `Reports.tsx` | Full analytics dashboard. 5 collapsible sections: Daily Snapshot, Performance Trends, Work Execution, Attention & Behavior, Habit Consistency |
| `useReportsData.ts` | Root hook. Fetches aggregated data from main process via single IPC call |
| `useFocusReport.ts` | Computes focus trends, quality scores, moving averages, best/worst days |
| `useAppReport.ts` | Computes top apps, category breakdown, productivity score, context switching analysis |
| `useTaskReport.ts` | Computes completion rates, estimation accuracy, recurring task status |
| `ScreenTime.tsx` | Dedicated screen time page. Hourly heatmap, category donut, weekly trend, app/domain lists, activity timeline |
| `useScreenTimeData.ts` | Screen time data hook with live polling |

### Navigation & Layout

| File | Purpose |
|---|---|
| `Layout.tsx` | Main layout wrapper. Sidebar + content area + focus timer panel overlay |
| `Sidebar.tsx` | Navigation sidebar. Home, Planner, Workspaces, Reports, Screen Time. Workspace list with create/edit/delete. Settings link |
| `TitleBar.tsx` | Custom window title bar. App name, sync status, minimize/maximize/close buttons |

### UI Components

| File | Purpose |
|---|---|
| `ConfirmDialog.tsx` | Global in-app confirmation modal. Replaces all `window.confirm()` calls. Three variants: danger (red), warning (amber), default (blue). Promise-based API |
| `Checkbox.tsx` | Custom styled checkbox component |
| `HoldButton.tsx` | Press-and-hold to confirm button |
| `CompletionCelebration.tsx` | Full-screen confetti celebration on task completion |
| `ManageWorkspacesModal.tsx` | Workspace management modal with edit/delete/recover |
| `WorkspacesOverview.tsx` | Grid view of all workspaces with task/list counts |
| `LoginScreen.tsx` | Authentication form. Email/password signup, Google OAuth, password strength indicator |

---

## Settings Reference

### Display

| Setting | Type | Default | Description |
|---|---|---|---|
| `theme` | string | `'dark'` | Color theme: dark, blue, red, nebula |
| `hideEstDoneTimes` | boolean | `false` | Hide estimated/completed times on task cards |

### Focus & Pomodoro

| Setting | Type | Default | Description |
|---|---|---|---|
| `pomodorosEnabled` | boolean | `false` | Enable Pomodoro timer overlay |
| `pomodoroLength` | number | `25` | Work session duration (minutes) |
| `defaultBreakLength` | number | `10` | Break duration (minutes) |
| `dailyFocusGoalMinutes` | number | `240` | Daily focus goal (minutes) |
| `superFocusMode` | boolean | `false` | Enable floating pill widget |
| `scrollingTitle` | boolean | `false` | Animate window title during focus |

### Alerts

| Setting | Type | Default | Description |
|---|---|---|---|
| `timedAlertsEnabled` | boolean | `false` | Show interval alerts during focus |
| `alertInterval` | number | `10` | Minutes between alerts |
| `alertSound` | string | `'ping'` | Alert sound file |
| `animatedFlash` | boolean | `false` | Visual screen flash on alert |

### Notifications

| Setting | Type | Default | Description |
|---|---|---|---|
| `notificationAlertsEnabled` | boolean | `false` | Show native OS notifications |
| `notificationSound` | string | `'Futuristic'` | Notification sound file |

### Completion

| Setting | Type | Default | Description |
|---|---|---|---|
| `showSuccessScreen` | boolean | `true` | Show celebration on task completion |
| `funGifEnabled` | boolean | `false` | Display GIF on completion |
| `successSoundEnabled` | boolean | `true` | Play celebration sound |
| `successSound` | string | `'Victory Bell'` | Celebration sound file |

---

## Build & Distribution

### Scripts

```bash
npm run dev          # Development with HMR
npm run build        # TypeScript check + Vite build + electron-builder
npm run dist:win     # Build Windows installer (.exe)
npm run dist:mac     # Build macOS disk image (.dmg)
npm run dist:linux   # Build Linux AppImage
npm run lint         # ESLint check
```

### Electron Builder Configuration

| Platform | Output | Installer |
|---|---|---|
| Windows | `release/Quoril-Setup-1.0.0.exe` | NSIS (custom install directory, desktop + start menu shortcuts) |
| macOS | `release/Quoril-1.0.0.dmg` | DMG (category: Productivity) |
| Linux | `release/Quoril-1.0.0.AppImage` | AppImage (category: Office) |

**Native Modules:**
`better-sqlite3` and `active-win` are unpacked from ASAR for native binary compatibility.

**Custom URL Protocol:**
`quoril://` scheme is registered for deep link handling (OAuth callbacks, email verification).

---

## Troubleshooting

### Dev server won't start
```bash
rm -rf node_modules package-lock.json
npm install
```

### Electron window doesn't open
- Verify `dist-electron/index.js` exists after build
- Check the terminal for main process errors
- Try `npm run dev` and check for TypeScript errors

### Database errors on launch
- Delete the local database file to force re-creation: `quoril_v2.sqlite` in the Electron user data directory
- On Windows: `%APPDATA%/quoril/quoril_v2.sqlite`
- On macOS: `~/Library/Application Support/quoril/quoril_v2.sqlite`

### `active-win` permission error (macOS)
- Go to System Settings > Privacy & Security > Accessibility
- Enable Quoril.app
- Or use the in-app permission card in Settings

### Build fails with EBUSY
- Close the running Quoril application before building
- Check Task Manager / Activity Monitor for lingering Quoril processes

### Supabase connection issues
- Verify `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check that the Supabase project is active
- The app works fully offline; cloud sync resumes when connectivity returns

---

**Version:** 1.0.0
**Author:** Mohan Kilari
**License:** MIT
