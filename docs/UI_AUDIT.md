# Quoril — UI Audit
**Reviewer:** Senior Engineer
**Date:** 2026-03-27
**Scope:** All React components, CSS, design system

---

## Summary

The UI has a strong design language: consistent dark-glass aesthetic, good use of CSS custom properties for theming, and Framer Motion animations. The gaps are in **correctness** (bugs that break visual states), **consistency** (mixed hardcoded values and CSS vars), and **UX clarity** (labels that say the wrong thing, duplicate controls).

---

## 1. Critical Bugs (Render-Breaking / Wrong Behavior)

### 1.1 TaskCard — Duplicate `...attributes` Spread
**File:** [src/components/planner/TaskCard.tsx:183-188](../src/components/planner/TaskCard.tsx#L183)

```tsx
<div
    ref={setNodeRef}
    {...attributes}   // ← applied twice
    {...listeners}
    draggable
    {...attributes}   // ← duplicate, last wins but generates React warning
```

The `{...attributes}` object is spread twice onto the same element. This generates React key-conflict warnings and means `draggable` HTML attribute is explicitly set as `true` *and* overridden by dnd-kit's `attributes` which may set it differently. The `draggable` prop should be removed (dnd-kit manages this internally via its own attributes).

**Fix:** Remove the second `{...attributes}` and the bare `draggable` prop.

---

### 1.2 TaskCard — `focus.startFocus` Does Not Exist
**File:** [src/components/planner/TaskCard.tsx:279](../src/components/planner/TaskCard.tsx#L279) and [L507](../src/components/planner/TaskCard.tsx#L507)

```tsx
onClick={(e) => { e.stopPropagation(); focus.startFocus(task.id); }}
```

`useFocusStore` exports `startSession`, not `startFocus`. This is a silent runtime crash — clicking the Zap "Instant Launch" button and the "Launch Task Now" button in the expansion menu will throw `TypeError: focus.startFocus is not a function`.

**Fix:** Replace `focus.startFocus(task.id)` with `focus.startSession(task.id)`.

---

### 1.3 FocusMode — Inverted Pause Button Label
**File:** [src/components/focus/FocusMode.tsx:351](../src/components/focus/FocusMode.tsx#L351)

```tsx
<span className="text-[10px] font-black uppercase tracking-[0.2em]">{isPaused ? 'Resuming' : 'Holding'}</span>
```

When the session **is paused**, the button shows "Resuming" (correct intent, wrong form — should be "Resume"). When the session **is active**, the button shows "Holding" (should be "Hold" or "Pause"). These are present-continuous forms being used as imperative commands, which is grammatically inconsistent with the rest of the UI (which uses imperatives: "Fulfill", "Bypass", "Exit").

**Fix:** `{isPaused ? 'Resume' : 'Hold'}`

---

### 1.4 FocusMode — Duplicate Bottom Action Bar
**File:** [src/components/focus/FocusMode.tsx:456-489](../src/components/focus/FocusMode.tsx#L456)

There is a fixed-position bottom action bar that appears **only when `activeTask` is set**, containing Break, Pause, Stop, and Complete buttons. All four of these actions are already present in the main 3-button grid above the task list (lines 340–371) and the header (lines 215–235). This creates three simultaneous locations for the same actions, making it unclear which is canonical. The floating bar at the bottom overlaps the "Mission Buffer" task list, partially obscuring content.

**Fix:** Remove the duplicate floating bottom bar (lines 456–489). The main grid buttons are the canonical controls.

---

### 1.5 Planner BoardColumn — `useSettingsStore.getState()` in Render
**File:** [src/components/planner/Planner.tsx:84](../src/components/planner/Planner.tsx#L84) and [L90](../src/components/planner/Planner.tsx#L90)

```tsx
!useSettingsStore.getState().hideEstDoneTimes && (...)
```

`useSettingsStore.getState()` is a one-time snapshot read, not a reactive subscription. When `hideEstDoneTimes` changes in the settings store, this component will **not re-render**. The time estimates will remain visible or hidden based on the value at the time the component mounted, ignoring subsequent changes.

The same pattern appears in [TaskCard.tsx:312](../src/components/planner/TaskCard.tsx#L312).

**Fix:** Use `const settings = useSettingsStore()` (the hook) at the top of `BoardColumn` and `TaskCard`, then reference `settings.hideEstDoneTimes`.

---

## 2. UX / Copy Issues

### 2.1 HomeOverview — Hardcoded "Good morning"
**File:** [src/components/dashboard/HomeOverview.tsx:91](../src/components/dashboard/HomeOverview.tsx#L91)

```tsx
<h1>Good morning, {user?.email?.split('@')[0] || 'User'}.</h1>
```

The greeting is always "Good morning" regardless of the time of day. At 9pm it reads "Good morning" — this breaks user immersion and feels like an unfinished feature.

**Fix:** Derive greeting from `new Date().getHours()`:
- 0–11: "Good morning"
- 12–16: "Good afternoon"
- 17–23: "Good evening"

---

### 2.2 FocusMode — "Sector_01_Sync" Is Meaningless to Users
**File:** [src/components/focus/FocusMode.tsx:397](../src/components/focus/FocusMode.tsx#L397)

```tsx
<span className="text-[9px] font-mono text-white/10 uppercase tabular-nums tracking-widest">Sector_01_Sync</span>
```

This is decorative copy styled to look like a system identifier. While the aesthetic is intentional (terminal/sci-fi theme), it communicates nothing actionable. If it's purely decorative, fine — but "Sector_01_Sync" reads as a sync status, which could confuse users checking whether their data is syncing.

**Recommendation:** Either replace with an actual sync indicator (pending count from syncStore) or replace with something clearly decorative like `SYS_v1.0`.

---

### 2.3 FocusMode — "ID_{last8}" Exposes Internal IDs
**File:** [src/components/focus/FocusMode.tsx:300](../src/components/focus/FocusMode.tsx#L300)

```tsx
<span>ID_{activeTaskId?.slice(-8) || 'none'}</span>
```

Showing the internal UUID of the active task (even a fragment) adds no user value. It's visual noise that makes the interface feel unpolished. The terminal aesthetic doesn't require exposing internal database keys.

**Recommendation:** Remove entirely or replace with task number/index.

---

### 2.4 LoginScreen — Hardcoded Background Color
**File:** [src/components/auth/LoginScreen.tsx:111](../src/components/auth/LoginScreen.tsx#L111) and [L133](../src/components/auth/LoginScreen.tsx#L133)

```tsx
<div className="h-full flex items-center justify-center bg-[#09090b] select-none">
```

The login screen uses a hardcoded hex `#09090b` instead of `var(--bg-primary)`. This means the login screen will never reflect any theme change and is permanently locked to near-black. If a "Lunar" light theme user is signed out and sees the login screen, they get a pitch-black screen inconsistent with their preference.

**Fix:** Replace `bg-[#09090b]` with `bg-[var(--bg-primary)]` (or use Tailwind's `bg-background` if configured).

---

### 2.5 Sidebar — Missing Bottom Anchoring for Settings / Logout
**File:** [src/components/layout/Sidebar.tsx:219](../src/components/layout/Sidebar.tsx#L219)

The Sidebar has `Settings` and `Logout` accessible only via a dropdown from the user avatar. There is no persistent bottom-anchored navigation item for Settings, making discoverability poor. Users expect Settings to be reachable from the sidebar's bottom section, not buried in a profile menu.

The sidebar also has no visual separator between the nav items and the workspace list — they visually blur together on first glance.

**Recommendation:** Add a persistent Settings link at the bottom of the sidebar (below the main workspace list). The profile dropdown can remain for logout.

---

## 3. Visual Consistency Issues

### 3.1 Mixed Hardcoded Colors and CSS Variables

Several places use hardcoded Tailwind classes where CSS variables should be used:

| Location | Issue |
|---|---|
| [FocusMode.tsx:190](../src/components/focus/FocusMode.tsx#L190) | `bg-[#050b1a]`, `bg-[#1a0505]` instead of `var(--bg-primary)` |
| [FocusMode.tsx:195](../src/components/focus/FocusMode.tsx#L195) | `bg-[#0a1630]`, `bg-[#300a0a]` instead of `var(--bg-secondary)` |
| [FocusMode.tsx:311](../src/components/focus/FocusMode.tsx#L311) | `bg-[#12141c]` hardcoded |
| [FocusMode.tsx:509](../src/components/focus/FocusMode.tsx#L509) | `bg-[#0a0c10]/95` hardcoded |
| [LoginScreen.tsx:133](../src/components/auth/LoginScreen.tsx#L133) | `bg-[#09090b]` hardcoded |
| [TaskCard.tsx:357](../src/components/planner/TaskCard.tsx#L357) | `bg-blue-500` hardcoded instead of `var(--accent-primary)` |

This is acceptable for the dark/blue/red themes (which are anchored to specific hues), but breaks predictability. The FocusMode is the worst offender because it uses theme class checks (`settings.theme === 'blue'`) to set hardcoded values rather than just reading `var(--bg-primary)`.

---

### 3.2 Inconsistent Border Radius

| Component | Radius Used |
|---|---|
| TaskCard | `rounded-xl` (12px) |
| FocusMode active area | `rounded-2xl` (16px) |
| FocusMode control buttons | `rounded-2xl` (16px) |
| HomeOverview KPI cards | `rounded-3xl` (24px) |
| Sidebar workspace form | `rounded-lg` (8px) |
| LoginScreen inputs | `rounded-xl` (12px) |
| LoginScreen feature pills | `rounded-xl` (12px) |

Cards at 3 different radii in the same app makes the UI feel ad hoc. Recommendation: settle on `rounded-2xl` (16px) for cards/panels and `rounded-xl` (12px) for inputs/buttons.

---

### 3.3 Font Size Inconsistency in Labels

Three different sizes are used for uppercase section labels:
- `text-[10px]` — FocusMode tab labels, TaskCard section headers
- `text-[11px]` — TaskCard metadata row
- `text-xs` (12px) — Reports section headers, Sidebar section headers

Pick one size for uppercase label copy. `text-[11px]` is the most common.

---

### 3.4 Missing CSS Variable: `--accent-gray-700`, `--accent-gray-800`

**File:** [src/components/planner/Planner.tsx:91](../src/components/planner/Planner.tsx#L91)

```tsx
style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--accent-gray-800)' }}
```

`--accent-gray-800` and `--accent-gray-700` are referenced in components but never defined in [src/index.css](../src/index.css). These resolve to empty string, producing transparent/invisible backgrounds for the time badges in column headers. The correct variable would be `var(--bg-hover)` or a new token.

**Fix:** Add `--accent-gray-700` and `--accent-gray-800` to `:root` in `index.css`, or replace usages with `var(--bg-hover)`.

---

### 3.5 `--accent-green-100`, `--accent-green-400` Not Defined

**File:** [src/components/planner/Planner.tsx:85-86](../src/components/planner/Planner.tsx#L85)

```tsx
style={{ color: 'var(--accent-green-400)', backgroundColor: 'var(--accent-green-100)' }}
```

These are referenced but not defined in `index.css`. The "Completed" badge in the Done column header renders with no color.

**Fix:** Add to `:root`:
```css
--accent-green-400: #4ade80;
--accent-green-100: rgba(74, 222, 128, 0.1);
```

---

## 4. Accessibility Issues

### 4.1 Icon-Only Buttons Without `aria-label`

Multiple icon-only buttons throughout the app have no `aria-label`:
- The `+` add task button in column headers (Planner.tsx)
- The `MoreHorizontal` expand button in TaskCard
- The `Zap` instant launch button in TaskCard
- The `Repeat` recurring toggle in TaskCard
- The eye/hide password toggle in LoginScreen

Screen readers will announce these as "button" with no context.

**Fix:** Add `aria-label` to all icon-only buttons.

---

### 4.2 Checkbox Has No `id`/`for` Association

**File:** [src/components/ui/Checkbox.tsx](../src/components/ui/Checkbox.tsx)

The custom Checkbox component renders a visual element with `onChange` but without a proper `<label for>` relationship. Clicking the label text to toggle a checkbox will not work.

---

### 4.3 Color-Only State Indication

Priority levels (critical/high/medium/low) are distinguished only by color (red/orange/yellow/gray). Users with color vision deficiency cannot distinguish priority levels. Add a text label or icon alongside the color dot.

---

## 5. Performance (UI Layer)

### 5.1 `ActivityHeatmap` in HomeOverview Has No Loading State

The heatmap renders immediately with whatever session data is in the store. If sessions haven't loaded yet, it shows an empty grid with no skeleton or loading indicator. Users see a blank grid and may think something is broken.

### 5.2 Workspace Card `whileHover={{ scale: 1.02, y: -2 }}`

Framer Motion's `y` transform on hover requires reflow unless `layout` is used. With a grid of workspace cards, each hover triggers layout recalculation. Use `translateY` via CSS custom property or Framer's `layoutId` instead.

---

## 6. Issues Fixed in This PR

The following bugs were fixed as part of this audit:

| # | Issue | File | Fix Applied |
|---|---|---|---|
| 1 | Duplicate `...attributes` spread in TaskCard | TaskCard.tsx | Removed second spread + bare `draggable` prop |
| 2 | `focus.startFocus` → `focus.startSession` (runtime crash) | TaskCard.tsx | Renamed both call sites |
| 3 | Pause button label: "Resuming"/"Holding" → "Resume"/"Hold" | FocusMode.tsx | Corrected labels |
| 4 | Duplicate floating bottom action bar in FocusMode | FocusMode.tsx | Removed duplicate bar |
| 5 | `useSettingsStore.getState()` not reactive in BoardColumn | Planner.tsx | Used `useSettingsStore()` hook |
| 6 | `useSettingsStore.getState()` not reactive in TaskCard | TaskCard.tsx | Used `useSettingsStore()` hook |
| 7 | "Good morning" hardcoded | HomeOverview.tsx | Time-of-day greeting |
| 8 | `--accent-gray-700/800` undefined CSS vars | index.css | Added token definitions |
| 9 | `--accent-green-100/400` undefined CSS vars | index.css | Added token definitions |
| 10 | Sidebar Settings not directly accessible | Sidebar.tsx | Added bottom-anchored Settings link |

---

## 7. Remaining Recommendations (Not Implemented — Require Product Decisions)

| # | Issue | Effort |
|---|---|---|
| R1 | Consolidate border-radius to 2 levels (card: 2xl, input: xl) | Medium |
| R2 | Replace FocusMode hardcoded hex colors with CSS vars | Medium |
| R3 | Add `aria-label` to all icon-only buttons | Low |
| R4 | Add text/icon to priority level indicators (accessibility) | Low |
| R5 | Add skeleton loading state to ActivityHeatmap | Low |
| R6 | Remove/replace decorative "Sector_01_Sync" copy | Low |
| R7 | Remove internal task ID display from FocusMode | Low |
| R8 | Add actual sync status indicator to FocusMode | Medium |
