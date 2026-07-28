# Quoril Mobile — Master Screen Catalog (inch-by-inch)

> The complete screen inventory for the full app. Every screen below is specified with: purpose, layout wireframe, exact components, spacing, SF Symbols, states (loading/empty/error), gestures, and haptics.
> Companion docs: `DESIGN_SPEC.md` (tokens/system), `FLOWS.md` (flows + intervention loop).
> Grid: 16pt side margins (20pt on hero screens), 4pt base spacing unit, 44pt min tap target.

---

## Screen Index (everything in the app)

| # | Screen | Tab / Entry | Type |
|---|---|---|---|
| **A. Entry** | | | |
| A1 | Splash | launch | full |
| A2 | Onboarding (5 steps) | first run | paged |
| A3 | Permissions (Screen Time + Notifications) | onboarding | sheet/full |
| A4 | Sign In / Sign Up | onboarding | full |
| A5 | Forgot Password | auth | sheet |
| **B. Focus** | | | |
| B1 | Focus — Idle | Focus tab | full |
| B2 | Session Type Picker | Focus | sheet (medium) |
| B3 | Focus — Running | Focus | full |
| B4 | Pomodoro Break | Focus | full overlay |
| B5 | Session Complete / Celebration | Focus | full overlay |
| B6 | Live Activity / Dynamic Island | system | widget |
| **C. Tasks** | | | |
| C1 | Tasks — List (Today/Week/Backlog/Done) | Tasks tab | full |
| C2 | Task Detail | Tasks | sheet (large) |
| C3 | Quick Add | Tasks | sheet (medium) |
| C4 | Workspace Switcher | Tasks | sheet (medium) |
| C5 | Workspace / List Editor | Tasks | sheet |
| C6 | Subtask editing | within C2 | inline |
| **D. Insights** | | | |
| D1 | Insights — Reports | Insights tab | full |
| D2 | Insights — Screen Time | Insights | full |
| D3 | Intervention History | Insights | push |
| D4 | Single App Detail | Insights | push |
| **E. You / Settings** | | | |
| E1 | You (profile hub) | You tab | full |
| E2 | Distraction Rules ⭐ | You | push |
| E3 | Add / Edit Watched App | E2 | sheet |
| E4 | Focus & Pomodoro settings | You | push |
| E5 | Notifications settings | You | push |
| E6 | Appearance | You | push |
| E7 | Account & Subscription | You | push |
| E8 | Paywall / Upgrade | E7 | sheet (large) |
| E9 | Feedback | You | sheet |
| E10 | About / Legal | You | push |
| **F. Global** | | | |
| F1 | Nudge alert (in-app + push) | overlay | banner/full |
| F2 | Friction screen | overlay | full |
| F3 | Empty/Loading/Error states | all | inline |

---

# A. ENTRY

## A1 · Splash
```
┌───────────────────────────────┐
│                               │
│                               │
│            ◆ Quoril           │  ← wordmark, SF Pro Display 34 Bold, centered
│                               │
│                               │
│         ○ (subtle spinner)    │  ← only if session-restore >400ms
└───────────────────────────────┘
```
- **Purpose:** restore Supabase session + hydrate Drift cache.
- **Bg:** `systemBackground`. No skeleton — under 400ms show nothing but wordmark.
- **Transition out:** cross-dissolve to Focus (returning) or Onboarding (new).

## A2 · Onboarding (paged, 5 dots)
Steps (swipeable `PageView`, dots bottom, "Skip" top-right on 1–4):
1. **Welcome** — hero line "Your focus companion", one illustration, `Continue`.
2. **What steals your time?** — multi-select app chips (see FLOWS §2).
3. **Daily focus goal** — 3 big segmented cards (2h/4h/6h) with ring preview.
4. **Nudge intensity** — Gentle / Firm / Tough-love radio cards w/ one-line explainer each.
5. **Ready** — recap ("We'll protect your focus 9–6, nudge you off Instagram") → `Get Started`.

```
┌───────────────────────────────┐
│  Skip                         │  ← top-right, tint, only steps 1–4
│                               │
│        [ illustration ]       │  ← SF Symbol hero or Lottie, ~140pt
│                               │
│   Your focus companion        │  ← Title 1, 28 Bold
│   Quoril notices when you     │  ← Body, secondaryLabel, max 2 lines
│   drift — and helps you back. │
│                               │
│                               │
│         ● ○ ○ ○ ○             │  ← page dots
│   ╭───────────────────────╮   │
│   │       Continue        │   │  ← capsule primary, full-width minus 16
│   ╰───────────────────────╯   │
└───────────────────────────────┘
```
- **Haptic:** `.selection` on page change + chip/radio taps.

## A3 · Permissions
Two consecutive **explained** requests (never raw system prompt first):
```
┌───────────────────────────────┐
│        🛡  (SF Symbol)         │  ← systemBlue, hierarchical, 64pt
│                               │
│   See where time goes         │  ← Title 2
│   Quoril needs Screen Time    │  ← Body secondaryLabel
│   access to notice distractions│
│   and nudge you in real time. │
│                               │
│   ✓ Aggregated usage only     │  ← reassurance rows w/ checkmark.seal
│   ✓ Never leaves your device  │
│   ✓ You stay in control       │
│                               │
│   ╭───────────────────────╮   │
│   │   Allow Screen Time   │   │  → triggers FamilyControls request
│   ╰───────────────────────╯   │
│         Not now               │  ← plain, tertiary
└───────────────────────────────┘
```
- Then repeat for **Notifications** (icon `bell.badge`, copy about real-time nudges).
- **Degraded path:** if denied → app still works; Insights shows "Enable Screen Time to unlock live protection" banner.

## A4 · Sign In / Sign Up
```
┌───────────────────────────────┐
│  ◆ Quoril                     │
│                               │
│   Welcome back                │  ← Large Title
│                               │
│   ┌───────────────────────────┐│
│   │ Email                     ││  ← inset field, 44pt tall
│   └───────────────────────────┘│
│   ┌───────────────────────────┐│
│   │ Password              👁  ││  ← reveal toggle
│   └───────────────────────────┘│
│              Forgot password? →│  ← trailing plain link → A5
│   ╭───────────────────────╮   │
│   │       Sign In         │   │  ← capsule primary
│   ╰───────────────────────╯   │
│   ───────  or  ───────        │
│   ╭───────────────────────╮   │
│   │   Continue with Google│   │  ← bordered, Google glyph
│   ╰───────────────────────╯   │
│   New here?  Create account → │
└───────────────────────────────┘
```
- **Validation:** password rules from desktop (12+, mixed case, number, special) shown inline on Sign Up; rate-limit + lockout messaging reused.
- **OAuth:** `quoril://` deep-link callback (iOS universal link / URL scheme).
- **States:** button → spinner; error → red inline caption under field, `.notification(error)` haptic.

## A5 · Forgot Password
Medium sheet: email field + `Send reset link`; success = green check state + auto-dismiss.

---

# B. FOCUS (the hero tab)

## B1 · Focus — Idle
```
┌───────────────────────────────┐
│  Focus                    ⋯   │  ← Large Title (collapses on scroll); ⋯ = history
│                               │
│         ╭───────────╮         │
│        ╱             ╲        │  ← empty ring outline, tertiaryLabel
│       │    Ready?     │       │
│        ╲             ╱        │
│         ╰───────────╯         │
│                               │
│   🎯  No task selected  ▸     │  ← tap → task picker (optional)
│                               │
│   ╭───────────────────────╮   │
│   │      Start Focus      │   │  ← BIG capsule, systemBlue, 56pt tall
│   ╰───────────────────────╯   │
│      Type: Deep Work  ▾       │  ← inline type chip → B2
│                               │
│  ── Today ──────────────────  │
│  🔥 6-day streak   ⏱ 2h 10m   │  ← stat strip, footnote
│  🛡 5 distractions blocked     │
└───────────────────────────────┘
```
- **Gesture:** pull-to-refresh re-syncs. Long-press Start → last-used config quick start.

## B2 · Session Type Picker (medium sheet)
List of types with icon + subtitle:
- Regular `timer` · Deep Work `brain.head.profile` · Quick Sprint `bolt` · Pomodoro `stopwatch`.
- Pomodoro selected reveals inline steppers: work min / break min / long-break / cycles.
- Optional task picker row at bottom. `.selection` haptic on choose, spring dismiss.

## B3 · Focus — Running
(See FLOWS §5 wireframe.) Inch details:
- **Ring:** 260pt diameter, 8pt stroke, `systemBlue` progress on `systemFill` track, animates each second.
- **Numerals:** SF Pro Display ~88pt, `monospacedDigit`, `label`.
- **Task chip:** capsule, `secondarySystemFill`, tap → C2.
- **Protection row:** `shield.fill` + "Protected · N saves" — live counter, increments with a green pulse + `.impact(light)` on each save.
- **Controls:** two glass capsules (Pause / Done). Done → confirm only if <1min elapsed.
- **Background behavior:** monitor armed; Live Activity B6 spawned.

## B4 · Pomodoro Break (full overlay)
```
┌───────────────────────────────┐
│                               │
│         ☕ Break time          │  ← systemOrange accent
│           04:59               │  ← countdown
│   Stand up, look away, breathe│  ← rotating micro-tips
│   ╭─────────╮  ╭───────────╮  │
│   │ Skip →  │  │ +5 min    │  │
│   ╰─────────╯  ╰───────────╯  │
└───────────────────────────────┘
```
- Auto-transition back with `.impact(medium)` + gentle chime (respects sound setting). During break the distraction monitor relaxes (breaks are allowed).

## B5 · Session Complete / Celebration
```
┌───────────────────────────────┐
│            🎉                  │  ← confetti (respects Reduce Motion → static)
│      Session complete          │
│         52m focused            │  ← big numeral
│   ┌─────────┬─────────┬──────┐ │
│   │ 3 saves │ 87% score│ 🔥7  │ │  ← stat trio cards
│   └─────────┴─────────┴──────┘ │
│   "Best focus streak this week"│  ← contextual praise
│   ╭───────────────────────╮   │
│   │        Done           │   │
│   ╰───────────────────────╯   │
│      Start another →          │
└───────────────────────────────┘
```
- `.notification(success)` on appear. Writes session + interventions to Supabase. Celebration toggle from settings can reduce this to a compact toast.

## B6 · Live Activity / Dynamic Island
Full state machine + ASCII in FLOWS §4. Surfaces: compact (timer), minimal (dot), expanded (task + Pause/Done), plus **nudge** and **friction** intrusions driven by the core loop.

---

# C. TASKS

## C1 · Tasks — List
```
┌───────────────────────────────┐
│  Design Sprint          ⋯  +  │  ← workspace name = title (tap → C4); +=C3
│  [ Today | Week | Backlog | ✓ ]│  ← segmented buckets
│  ┌───────────────────────────┐│
│  │ ◯ Ship design spec    25m ●││  ← row: check, title, est, priority dot
│  │ ◯ Review PR          high ●││
│  │ ◯ Wire auth       ▸ 2 subs││  ← subtask count chip
│  └───────────────────────────┘│
│  ...                          │
│                    (FAB not    │
│                     used — +   │
│                     in navbar) │
└───────────────────────────────┘
```
- **Row anatomy (44pt+):** leading `circle` (tap = complete, morphs to `checkmark.circle.fill` green + success haptic), title (Headline), trailing est badge + priority dot (green/orange/red/red-bold).
- **Swipe trailing:** Complete (green, `checkmark`). **Swipe leading:** Defer menu (Today→Week→Backlog) `arrow.right`. **Full swipe:** delete → confirm.
- **Reorder:** long-press drag within bucket (`.impact` on lift).
- **Section headers:** inset-grouped, uppercase Footnote secondaryLabel.
- **Empty state:** `tray` symbol + "Nothing here yet" + "Add a task" button.
- **Time-parse:** typing `Draft email [15m]` auto-extracts estimate (desktop parser reused).

## C2 · Task Detail (large sheet)
```
┌───────────────────────────────┐
│  ▬ (grabber)              Done │
│  ┌───────────────────────────┐│
│  │ Ship design spec          ││  ← editable title, Title 2
│  └───────────────────────────┘│
│  Priority  [ Low  Med  High  ! ]│ ← segmented
│  Estimate  ‹ 25m ›   Due  Jul 30│ ← steppers / date picker rows
│  ── Subtasks ───────────────── │
│  ☑ Draft outline              │
│  ◯ Add wireframes             │
│  ＋ Add subtask               │
│  ── ────────────────────────  │
│  ⏱ Actual: 18m tracked        │  ← auto from focus sessions
│  ╭───────────────────────╮   │
│  │   🎯 Focus on this     │   │  → jumps to Focus tab, task loaded
│  ╰───────────────────────╯   │
│  🗑 Delete task               │  ← destructive, red
└───────────────────────────────┘
```
- Subtask rows: checkbox + inline text edit + drag reorder + swipe delete.
- Detents: medium (peek) → large (full edit). Spring, grabber, swipe-down dismiss.

## C3 · Quick Add (medium sheet)
Single autofocused title field + inline chips (priority, due, est, list) + `Add`. Keyboard-first; return submits and keeps sheet open for rapid entry. `.impact(light)` per add.

## C4 · Workspace Switcher (medium sheet)
List of workspaces (color dot + name + task count), current = checkmark. `+ New workspace` → C5. Reorder by drag. Tap switches C1 context.

## C5 · Workspace / List Editor (sheet)
Name field + 10-swatch color palette (matching desktop) + (for lists) archive toggle + delete. `.selection` on swatch.

---

# D. INSIGHTS

## D1 · Insights — Reports
```
┌───────────────────────────────┐
│  Insights                     │
│  [ Reports | Screen Time ]    │  ← segmented
│  [ Day | Week ]        Jul ▾  │  ← range segmented + month menu
│  ┌─────────┐ ┌─────────┐      │
│  │ Focus   │ │ Tasks   │      │  ← 6 GlassCards, 2-col grid, 12pt gap
│  │ 4h 12m  │ │ 8 / 11  │      │  │ big numeral + Footnote label + delta
│  │ ▲ +32m  │ │  73%    │      │
│  └─────────┘ └─────────┘      │
│  ...(Score, Avg Session,      │
│      App Switches, Top Distr.)│
│  ── Performance ───────────── │
│  ▁▂▄▆█▆▄  (week trend line)    │  ← fl_chart, thin, tinted
│  ── Work Execution ────────── │
│  Estimation accuracy 82%      │
│  ── Attention ─────────────── │
│  Top apps by category (bars)  │
│  ── Habits ────────────────── │
│  Recurring task streaks       │
└───────────────────────────────┘
```
- 6 KPIs mirror desktop (Focus Time, Tasks Done, Productivity Score, Avg Session, App Switches, Top Distraction). Deltas colored green(good)/red(bad).

## D2 · Insights — Screen Time
Full distraction-forward wireframe in FLOWS §6: headline verdict ("lost 1h47m"), per-app red bars, "Quoril saved you 31m · streak", cost-translation card → `Set a limit`. Plus hourly heatmap (24 thin bars) and category donut below.

## D3 · Intervention History (push)
Chronological list of nudges: app icon, time, level (color chip), outcome (returned ✓ / snoozed ↻ / ignored ✕). Header stat: "This week: 24 nudges · 71% returned". Teaches the user their own patterns.

## D4 · Single App Detail (push)
Tap any app row → its own page: total time (day/week/month segmented), trend line, times opened, avg session length, nudges received/heeded, and a `Add to watched apps` / `Set limit` action.

---

# E. YOU / SETTINGS

## E1 · You (hub)
```
┌───────────────────────────────┐
│  You                          │
│  ┌───────────────────────────┐│
│  │ (avatar)  Mohan           ││  ← profile header card
│  │           mohan@…    Free ▸││  ← plan badge → E7
│  └───────────────────────────┘│
│  FOCUS                         │
│  🎯 Focus & Pomodoro        › │  → E4
│  🛡 Distraction Rules       › │  → E2  ⭐
│  PREFERENCES                   │
│  🔔 Notifications           › │  → E5
│  🎨 Appearance              › │  → E6
│  ACCOUNT                       │
│  ⭐ Subscription            › │  → E7
│  💬 Send Feedback           › │  → E9
│  ℹ️ About                    › │  → E10
│  ───────────────────────────  │
│  Sign Out                     │  ← red, centered
└───────────────────────────────┘
```
- Native inset-grouped list; SF Symbol per row, chevrons, section headers uppercase Footnote.

## E2 · Distraction Rules ⭐ (push)
Full wireframe in FLOWS §7: Watched Apps (per-app grace period rows + Add), Nudge Intensity (Gentle/Firm/Tough-love), Schedule (focus hours + days). This is the signature config.

## E3 · Add / Edit Watched App (sheet)
App picker (from installed/ Screen Time categories) → grace-period stepper (30s–10m) → per-app intensity override → daily limit (optional) → Save.

## E4 · Focus & Pomodoro (push)
Grouped rows: default session type, Pomodoro work/break/long-break/cycles steppers, daily focus goal, alert intervals (every N min), alert sound toggle, scrolling-title toggle, Super-Focus behaviors. Maps 1:1 to desktop settings.

## E5 · Notifications (push)
System permission status row (+ deep link to iOS Settings if denied), nudge notifications toggle, session-complete toggle, sound toggle, quiet hours picker.

## E6 · Appearance (push)
Segmented: System / Light / Dark (no brand themes per Pure-Apple direction). Preview card updates live. (Optional future: single accent-tint picker — off by default.)

## E7 · Account & Subscription (push)
Profile fields (name, email, change password), plan card (Free / Monthly / Annual / Lifetime — from JWT roles/tier), role badges (admin/alpha/beta if present), `Upgrade` → E8, `Restore purchases`, `Delete account` (destructive, confirm).

## E8 · Paywall / Upgrade (large sheet)
Value hero → feature comparison (Free vs Pro: e.g. limited vs unlimited watched apps, advanced insights, custom schedules) → plan cards (Monthly / Annual "best value" / Lifetime) → `Continue` (StoreKit) → restore link + terms/privacy footnotes.

## E9 · Feedback (sheet)
Reuses desktop alpha-feedback concept: type selector (Bug / Idea / Praise), text area, optional screenshot attach, `Send` → Supabase. `.notification(success)` + thank-you state.

## E10 · About / Legal (push)
Version/build, What's New link, Privacy Policy, Terms, Acknowledgements, rate-on-App-Store row, support email.

---

# F. GLOBAL OVERLAYS & STATES

## F1 · Nudge (Level 1–2)
- **In-app:** top glass banner slides down (`⚠️ Instagram · 3m — back to Design?` + `Dismiss`), auto-hide 4s, `.impact(light)`.
- **Out-of-app:** local push notification + Dynamic Island nudge state (FLOWS §4).

## F2 · Friction Screen (Level 3, full overlay)
```
┌───────────────────────────────┐
│            🔴                  │
│   You've spent 12m here today  │  ← Title 2
│   Weekly average: 47m          │  ← context, secondaryLabel
│   ▓▓▓▓▓▓▓░░░  (today vs avg)    │  ← comparison bar
│   That's ≈ 2 focus tasks.      │  ← cost translation
│   ╭───────────────────────╮   │
│   │    Take a breath      │   │  ← primary, returns to focus
│   ╰───────────────────────╯   │
│        5 more minutes         │  ← plain, grants + re-arms
└───────────────────────────────┘
```
- Never a hard lock. Choosing "Take a breath" → success haptic, logs `returned`, streak +1.

## F3 · Loading / Empty / Error (all screens)
- **Loading:** skeleton shimmer for lists/cards (no spinners except <button> actions).
- **Empty:** centered SF Symbol (tertiaryLabel) + one-line reason + one primary action. Never a blank screen.
- **Error:** inline card, `exclamationmark.triangle`, plain-language message + `Retry`. Offline → subtle top banner "Offline — changes will sync" (offline-first, so app stays usable).

---

# Cross-cutting Details (apply to every screen)

- **Type:** SF Pro, Dynamic Type supported to XXL, no clipping/reflow bugs.
- **Color:** system semantic only; light/dark automatic.
- **Materials:** tab bar, nav bar, sheets, floating controls = Liquid Glass (`.ultraThinMaterial`).
- **Motion:** spring (damping ~0.8); honor Reduce Motion (springs→fades, confetti→static).
- **Haptics:** selection (nav/segment), impact-light (swipe/add/save), impact-medium (pomodoro phase), success/error notifications.
- **A11y:** VoiceOver labels everywhere; 44pt targets; color never sole signal (icon+label on priority/status).
- **Sync:** every write → Drift (local) → Supabase, FK-safe order, same 10s loop as desktop; realtime for cross-device.
- **Nav:** large collapsing titles, edge swipe-back, detented sheets, glass tab bar with haptic on switch.
```
