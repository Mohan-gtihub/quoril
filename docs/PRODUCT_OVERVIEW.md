# Quoril — Product Overview

*Prepared for the marketing team. Plain-language summary of what Quoril is, who it's for, and what it does.*

---

## What is Quoril?

**Quoril is a productivity operating system for deep work.** It brings together your tasks, your focus sessions, and an honest picture of where your screen time actually goes — in one app that works offline and syncs to the cloud automatically.

Unlike a browser-based to-do list, Quoril runs as a **native desktop app** (Windows, macOS, Linux). Because it runs natively, it can do things a website can't: see which app or website is in front of you, notice when you've gone idle, and float a small always-on-top focus widget over everything else while you work.

**One-line pitch:** *Your personal command center for focused work — tasks, focus timer, and screen-time analytics, all in one offline-first app.*

**Tagline options for marketing:**
- "Deep work, fully tracked."
- "Know where your time goes. Then take it back."
- "Tasks, focus, and screen time — one command center."

---

## Who is it for?

- **Knowledge workers & developers** who live in many apps and want to reclaim focus.
- **Students** building study discipline.
- **Freelancers / consultants** who need to see time spent per task/project.
- **Anyone doing a digital-wellbeing reset** who wants accurate, private screen-time data.

**Key differentiator:** data is **local-first and private** (stored on your machine in SQLite), then synced to the cloud. The app keeps working with no internet.

---

## Core Features

### 1. Task Management
A full planner for organizing work — tasks, lists, and workspaces with drag-and-drop reordering. Tasks can be linked to focus sessions and to app-usage data, so you can see how long you actually spent on a given task.

### 2. Focus Engine
A focus timer designed to keep you on task:
- **Focus Mode** — a streamlined working view that minimizes distraction.
- **Super Focus Mode** — collapses Quoril into a small floating pill that stays on top of every other window, keeping your timer and current task always visible.
- Celebration moments (sound + confetti) when you complete tasks.

### 3. App & Window Tracking
Quoril automatically detects which application and window is active and categorizes it (Work, Web, Development, Communication, Entertainment, etc.). No manual timers required — it just runs in the background.

### 4. Screen Time & Digital Wellbeing
A breakdown of where your day went, by category and by app, with idle-time detection so passive minutes aren't counted as work. Helps users spot distraction patterns and build healthier habits.

### 5. Reports & Analytics
Visual dashboards (charts and trends) summarizing focus sessions and app usage over time, so progress is measurable.

### 6. Canvas / Notes
A rich visual canvas and document editor (powered by a full rich-text engine and a node-based canvas) for planning, note-taking, and mapping out work visually.

### 7. Workspaces & Lists
Separate areas for different projects or life areas, each with its own lists and tasks.

### 8. Themes & Customization
Custom theming via CSS variables, with light/dark and accent customization.

### 9. Authentication & Cloud Sync
- Secure sign-in backed by Supabase.
- Real-time background sync across devices.
- Row-level security so each user's data is isolated.

---

## How it works (for non-technical readers)

- **Desktop-native:** Quoril is an Electron app, so it installs like Spotify or Slack — a real program on your computer, not a browser tab.
- **Offline-first:** Everything is saved locally first. You can close the internet and keep working; it catches up when you reconnect.
- **Private by design:** Tracking data lives on your machine. Cloud sync is for backup and multi-device, not for selling your data.

---

## Platforms

| Platform | Status |
|---|---|
| Windows | Supported |
| macOS | Supported |
| Linux | Supported |
| Web app | *Planned — see roadmap notes* |

---

## Positioning vs. competitors

| Competitor type | How Quoril differs |
|---|---|
| To-do apps (Todoist, TickTick) | Quoril adds automatic screen-time tracking + focus widget, not just lists. |
| Time trackers (RescueTime, Rize) | Quoril adds full task management and a focus timer, and is local-first/private. |
| Focus apps (Forest, Freedom) | Quoril gives real analytics and task integration, not just a blocker. |

## Also Include about Blitzit

**The wedge:** Quoril is the only one that unifies *what you plan to do*, *staying focused while you do it*, and *an honest record of where the time went* — in a single private, offline-first app.

---

## A note on the "web app" direction

A browser-based version is on the roadmap and is great for fast onboarding and trials. Marketing should be aware of one honest constraint: **the automatic screen-time tracking and the always-on-top floating focus widget are desktop-only capabilities.** Browsers cannot see other apps or float over your screen. So the web app would be positioned as the **planner + reports + sync** experience, with **automatic tracking and the focus widget as the reason to install the desktop app.** (Engineering detail in the gaps document.)

---

*Built by Erik Vale.*
