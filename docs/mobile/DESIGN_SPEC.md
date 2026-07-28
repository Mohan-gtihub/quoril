# Quoril Mobile — Design Specification

> **Version:** 0.1 (draft for review)
> **Target:** iOS-native-feeling Flutter app, standalone, "Pure Apple System" visual language (iOS 26 "Liquid Glass").
> **Backend:** Reuses the existing Quoril Supabase project unchanged (auth, schema, RLS, roles/tiers).
> **Author intent:** Look and feel indistinguishable from a first-party Apple app (the Clock/Reminders/Screen-Time family), while delivering Quoril's full feature set.

---

## 0. Design North Star

**"A first-party Apple app that happens to be Quoril."**

Three rules govern every decision:

1. **Native before custom.** If Apple's HIG has an answer (a component, a color, a gesture), we use it. We draw custom UI only where Quoril's function has no Apple equivalent (the focus timer, the insights charts).
2. **Hierarchy through space and weight, not decoration.** Minimal means *considered emptiness* — generous margins, few weights, one accent. Never flat-and-bare.
3. **Every commit action has motion + haptics.** Spring physics, not linear tweens. A task completes, a session starts — the phone responds physically.

---

## 1. Scope & Feature Mapping (Standalone)

The mobile app ships the full Quoril feature set. Because iOS sandboxing differs from desktop, some features are *re-expressed* rather than copied.

| Desktop feature | Mobile expression | Notes |
|---|---|---|
| Tasks (Kanban 4-col) | Grouped lists w/ segmented time-buckets + swipe actions | Kanban → Reminders-style lists; drag-reorder within a list |
| Focus Engine (full mode) | Full-screen circular timer (the "Clock app" hero) | Primary tab |
| Super Focus Pill (always-on-top) | **Live Activity + Dynamic Island** | iOS-native equivalent of always-on-top |
| Pomodoro | Same, driven from the Focus screen | Auto-transition + haptics on phase change |
| App tracking (`active-win`, per-second) | **Screen Time API** (FamilyControls / DeviceActivity) | ⚠️ See §9 — aggregated only, needs Apple entitlement |
| Screen Time page | Insights › Screen Time (Apple Screen-Time-style UI) | Reuse metrics, restyle |
| Reports/Analytics | Insights › Reports (Apple Charts) | Reuse aggregation logic |
| Workspaces & Lists | Native inset-grouped list + sheet editor | 1:1 |
| Canvas (Excalidraw) | **Deferred to v1.1, tablet-first** | Poor phone UX; ship later |
| Settings | Native grouped inset list | Near 1:1 |
| Themes (4) | **Not exposed** — system light/dark only (Pure Apple) | Brand themes dropped per direction |
| Auth (email + Google OAuth, `quoril://`) | `supabase_flutter` + deep links | Reuse flow |

---

## 2. Information Architecture

**Bottom tab bar (Liquid Glass, `.ultraThinMaterial`), 4 tabs:**

```
┌─────────────────────────────────────────────┐
│                                             │
│                 [ screen ]                  │
│                                             │
├─────────────────────────────────────────────┤
│   ◉ Focus    ☑ Tasks    ▤ Insights    ⚙ You │   ← blurred glass tab bar
└─────────────────────────────────────────────┘
```

1. **Focus** (`timer` SF Symbol) — the hero. Start/run/pause sessions.
2. **Tasks** (`checklist`) — capture + manage tasks, workspaces, lists.
3. **Insights** (`chart.bar.xaxis`) — Reports + Screen Time (segmented).
4. **You** (`person.crop.circle`) — profile, subscription/roles, settings.

Modals present as **sheets** (detents: medium / large), swipe-down to dismiss. Push navigation uses large titles that collapse to inline on scroll, with edge swipe-back.

---

## 3. Design Tokens (Pure Apple System)

### 3.1 Color — semantic, system-driven

We do **not** hardcode a palette. We bind to iOS system semantic colors so light/dark, increased-contrast, and future OS shifts are automatic.

| Token | iOS semantic | Use |
|---|---|---|
| `bg` | `systemBackground` | Root background |
| `bgGrouped` | `systemGroupedBackground` | Grouped-list screens |
| `surface` | `secondarySystemGroupedBackground` | Cards, list rows |
| `surface2` | `tertiarySystemBackground` | Nested/elevated |
| `label` | `label` | Primary text |
| `labelSecondary` | `secondaryLabel` | Subtitles, metadata |
| `labelTertiary` | `tertiaryLabel` | Disabled/hints |
| `separator` | `separator` | Hairlines |
| `tint` | **`systemBlue`** (default accent) | Interactive tint |
| `fill` | `systemFill` family | Segmented controls, chips |

**Functional (semantic, not brand) accents** — used sparingly in charts/state only:

| Meaning | iOS system color |
|---|---|
| Focus / active | `systemBlue` |
| Break | `systemOrange` |
| Wellbeing / done | `systemGreen` |
| Priority: low / med / high / critical | `systemGreen` / `systemOrange` / `systemRed` / `systemRed` (bold) |

> **Brand note:** Per "Pure Apple System" direction, Quoril lime (`#c4f82a`) is *retired* from the mobile UI. If brand recognition later matters, the safest reintroduction is the app icon + a single optional accent tint in Settings — not the base UI.

### 3.2 Typography — SF Pro

Bundle **SF Pro Display** (≥20pt) and **SF Pro Text** (<20pt), or use the platform font. Dynamic Type supported throughout.

| Style | Font / size / weight | Use |
|---|---|---|
| Large Title | SF Pro Display 34 / Bold | Screen headers (collapsing) |
| Title 1 | 28 / Bold | Section heroes |
| Title 2 | 22 / Bold | Card headers |
| Headline | 17 / Semibold | List row titles, buttons |
| Body | 17 / Regular | Content |
| Callout | 16 / Regular | Secondary content |
| Subhead | 15 / Regular | Metadata |
| Footnote | 13 / Regular | Captions |
| Caption | 12 / Regular | Chart labels |
| **Timer numerals** | SF Pro Display, `monospacedDigit`, ~72–96pt | Focus timer (no layout jitter) |

### 3.3 Spacing, radius, materials

- **Spacing scale:** 4 · 8 · 12 · 16 · 20 · 24 · 32 (base unit 4). Screen side margins **16pt** (20pt on the Focus hero).
- **Corner radius:** rows/cards **12pt**, sheets **system**, large glass cards **20pt**, pills/buttons **capsule**. (Note: this is *tighter* than desktop's 28px bento — Apple's mobile radii are smaller.)
- **Materials (Liquid Glass):** tab bar, nav bar, floating focus controls, and sheets use `.ultraThinMaterial` / `.regularMaterial` with vibrancy — never opaque flat fills. Elevation is conveyed by material + hairline, not heavy shadows.
- **Icons:** SF Symbols exclusively, `hierarchical` rendering, weight matched to adjacent text.

### 3.4 Motion & haptics

- **Curves:** spring (damping ~0.8) for sheets, list inserts, timer state. No linear/ease for interactive transitions.
- **Large-title collapse:** standard iOS scroll behavior.
- **Haptics:** `.selection` on segmented/tab change; `.impact(light)` on swipe-action commit; `.notification(success)` on session complete / task done; `.impact(medium)` on Pomodoro phase change.

---

## 4. Component Kit (build these first)

The foundation everything inherits. Ship this before any screen.

1. **GlassTabBar** — blurred bottom bar, 4 items, selected tint, haptic on change.
2. **LargeTitleScaffold** — collapsing large title + inline transition + optional trailing bar button.
3. **InsetListSection / InsetListRow** — grouped-inset list (Settings look): leading SF Symbol, title, trailing value/chevron/switch, swipe actions.
4. **GlassCard** — rounded material card for Insights metrics.
5. **PrimaryButton (capsule)** — filled tint, `.impact` on tap; plus tinted & plain variants.
6. **BottomSheet** — detented (medium/large), grabber, spring present/dismiss.
7. **SegmentedControl** — native-style, for Insights (Reports/Screen Time) and Tasks buckets.
8. **CircularTimer** — the hero: progress ring + monospaced numerals + glass control cluster.
9. **SwipeableRow** — leading/trailing swipe actions (complete / defer / delete).
10. **Charts** — thin bar, ring/donut, week-trend line (via `fl_chart` styled to Apple's restraint).

---

## 5. Screen Specs

### 5.1 Focus (hero — build first, nail it)

```
┌───────────────────────────────┐
│  Focus                    ⋯   │  ← large title, trailing menu (session type)
│                               │
│         ╭───────────╮         │
│        ╱             ╲        │  ← progress ring (systemBlue), thin
│       │    24:59      │       │  ← monospaced numerals, ~88pt
│       │  Deep Work    │       │  ← session type, secondaryLabel
│        ╲             ╱        │
│         ╰───────────╯         │
│                               │
│     ▸ Designing the app       │  ← current task chip (tap → task sheet)
│                               │
│   ╭─────────╮   ╭─────────╮   │
│   │  Pause  │   │  Done   │   │  ← glass control cluster
│   ╰─────────╯   ╰─────────╯   │
│                               │
│   Today: 3 sessions · 2h 10m  │  ← footnote stat strip
└───────────────────────────────┘
```

- **Idle state:** big "Start Focus" capsule + session-type selector (Regular / Deep Work / Quick Sprint / Pomodoro), optional task picker.
- **Running:** ring animates; on start, spawn **Live Activity** (lock screen) + **Dynamic Island** (compact: timer; expanded: task + pause/done).
- **Pomodoro:** phase pill (Work/Break), auto-transition with `.impact(medium)` + optional sound.
- **Complete:** success haptic + optional celebration sheet (respects the desktop "celebration" setting).
- **Sync:** session writes local (Drift) → Supabase, matching desktop's offline-first order.

### 5.2 Tasks

```
┌───────────────────────────────┐
│  Tasks                     +  │  ← large title, add button
│  [ Today | This Week | Backlog ] ← segmented buckets
│                               │
│  TODAY                        │  ← inset group header
│  ┌───────────────────────────┐│
│  │ ◯  Ship design spec   ‹25m›││  ← SwipeableRow (→ complete, ← defer)
│  │ ◯  Review PR          high ││
│  └───────────────────────────┘│
│  THIS WEEK                    │
│  ┌───────────────────────────┐│
│  │ ◯  Wire Supabase auth     ││
│  └───────────────────────────┘│
└───────────────────────────────┘
```

- **Kanban → buckets:** the 4 desktop columns map to Today / This Week / Backlog segments (Done reachable via a filter). Reorder within a bucket by long-press drag.
- **Swipe:** trailing = Complete (green, success haptic); leading = Defer/Schedule; full-swipe delete with confirm.
- **Task detail = bottom sheet (large detent):** title (with `[25m]` time-parse preserved), priority segmented, estimate, subtasks (checkable rows), due date, "Focus on this" → jumps to Focus tab with task loaded.
- **Add:** `+` opens a compact medium-detent sheet; quick title entry with natural-language time parsing.
- **Workspaces/Lists:** switchable via a title-tap menu or a leading list button → inset list of workspaces (color dot + name).

### 5.3 Insights (Reports + Screen Time)

```
┌───────────────────────────────┐
│  Insights                     │
│  [ Reports | Screen Time ]    │  ← segmented
│  ┌─────────┐ ┌─────────┐      │
│  │ Focus   │ │ Tasks   │      │  ← GlassCards, big numeral + delta
│  │ 4h 12m  │ │ 8 / 11  │      │
│  └─────────┘ └─────────┘      │
│  Productivity Score           │
│  ◍ 78%   ▁▂▄▆█▆▄  (week ring/line)│
│  Top Apps                     │
│  ▤▤▤ list …                   │
└───────────────────────────────┘
```

- **Reports tab:** reuse the 6 desktop KPIs (Focus Time, Tasks Done, Productivity Score, Avg Session, App Switches, Top Distraction) as GlassCards; below, week-trend line + category breakdown, styled to Apple Charts restraint.
- **Screen Time tab:** mirror Apple's own Screen Time layout — total time, hourly heatmap (thin bars), category donut, per-app list. Data source = §9.
- **Date range:** segmented "Day / Week" + a menu for custom, top-right.

### 5.4 You / Settings

- Native **inset-grouped list**, Settings-app clone:
  - Profile header (avatar, name, email, plan badge from roles/tier).
  - **Focus & Pomodoro** — timer lengths, daily goal, alerts, sounds.
  - **Notifications** — native permission, sound toggle.
  - **Appearance** — system light/dark (no brand themes).
  - **Account** — subscription tier, sign out.
  - **About** — version, feedback (reuse alpha-feedback widget concept), legal.

---

## 6. Technical Architecture (backend reuse = ~zero change)

| Concern | Desktop | Mobile (Flutter) |
|---|---|---|
| Auth | Supabase Auth + Google OAuth + `quoril://` | `supabase_flutter`, same OAuth + deep links (iOS universal links / URL scheme) |
| Roles/tiers | JWT hook → entitlements | Same JWT decode, gate features identically |
| Local DB | better-sqlite3 | **Drift (SQLite)** — mirror the schema |
| Sync | 10s loop, FK-safe order, upsert, soft-delete | Same loop + order; reuse row shapes |
| Realtime | Supabase subscriptions | `supabase_flutter` realtime |
| State | Zustand + React Query | **Riverpod** (+ its async/cache layer) |
| Crash recovery | localStorage timer backup | Persist timer state to Drift/secure storage each tick |

**No Supabase schema changes are required for v1.** The only new backend consideration is where imported iOS Screen-Time aggregates land (see §9) — likely the existing `app_sessions` / `domain_sessions` tables with a `source` marker, or a new `device_usage_daily` table if we keep native aggregates separate.

---

## 7. Accessibility

- Full **Dynamic Type** (test to XXL); layouts reflow, no clipping.
- **VoiceOver** labels on every control; timer announces state changes.
- Respect **Reduce Motion** (swap springs for fades) and **Increase Contrast** (system colors handle most of it).
- Minimum 44×44pt tap targets. Color never the sole signal (priority uses icon + label too).

---

## 8. Build Sequence (recommended)

1. **Foundation** — theme (system colors + SF Pro), the §4 component kit, GlassTabBar shell.
2. **Auth + sync spine** — Supabase login, Drift schema, sync loop (proves the backend end-to-end).
3. **Focus vertical slice** — the hero screen + Live Activity/Dynamic Island. This is the "wow" and the riskiest native integration; do it early.
4. **Tasks** — lists, swipe actions, detail sheet, add flow.
5. **Insights** — Reports first (pure Supabase data), Screen Time second (needs §9 entitlement).
6. **You/Settings.**
7. **Polish** — haptics, motion, empty states, Dynamic Type + VoiceOver pass.
8. **v1.1** — Canvas (tablet-first).

---

## 9. ⚠️ Reality Check: App Tracking on iOS

The desktop's per-second window/app tracking (`active-win`) **cannot** be replicated on iOS. What's available:

- **Screen Time API** (`FamilyControls` + `DeviceActivity` + `ManagedSettings`) requires a **special Apple entitlement** (approval application to Apple), and returns **aggregated, privacy-preserving** usage — categories and per-app totals over reporting windows, *not* live window titles or real-time polling. Data is also somewhat sandboxed to a system extension.
- **Practical implication:** the mobile "Screen Time" tab shows *iOS device usage* (this phone), while the *desktop* continues to feed the rich per-app/context data into the same Supabase tables. The app presents both, clearly labeled by source.
- **Fallback if the entitlement is denied/slow:** manual/automatic focus-session time still fully powers Reports; the Screen Time tab degrades gracefully to "desktop data only."

This is the one place "full standalone" is bounded by the platform — the spec designs around it rather than promising desktop-parity tracking.

---

## 10. Open Decisions (need your input before/while building)

1. **Screen Time entitlement** — do we apply for Apple's FamilyControls entitlement now (long lead time), or ship v1 with desktop-sourced tracking only?
2. **Timer numerals font** — SF Pro monospaced digits (pure Apple) vs. a distinctive display face for brand. Recommendation: SF Pro.
3. **Accent** — stay `systemBlue` (purest Apple) or allow a single lime accent option in Settings for brand recall? Recommendation: systemBlue for v1.
4. **Canvas** — confirm deferral to v1.1 tablet-first.
5. **Android** — spec is iOS-first ("Pure Apple System"). Do we later Material-ize for Android, or keep the iOS look cross-platform? (Flutter allows either.)
```
