# Quoril Web v1 — Design Spec

**Date:** 2026-06-25
**Status:** Approved (design), pending implementation plan
**Owner:** Engineering

---

## 1. Goal

Ship a browser-deployable version of Quoril (web v1) from the existing Electron + React + Vite codebase, in the **same repository** via a dual-target build. Web v1 includes Planner/Tasks, Workspaces, Reports, Canvas/Notes, and a Focus timer with a **Picture-in-Picture floating widget**. The web target gets a deliberate UI/UX redesign. Native-only capabilities (system-wide app tracking, OS always-on-top overlay) remain desktop-only and degrade gracefully on web.

### Success criteria
- `npm run build:web` produces a static, deployable web bundle with **no Electron code** in it.
- A user can sign in (Supabase, in-browser), create/edit tasks, and have them persist across reloads.
- Focus timer runs in the browser and can pop out into a Document Picture-in-Picture window that floats over other apps; graceful in-page fallback where the API is unavailable.
- Reports render focus-session analytics on web; app/category tracking shows an "install desktop" empty state when no synced data exists.
- The existing Electron build (`npm run build`) continues to work with **no behavioral regression**.

### Non-goals
- System-wide app/window tracking inside the browser (impossible; remains desktop-only).
- OS-level always-on-top overlay in the browser (PiP is the web substitute).
- A new backend API layer (Supabase is accessed directly).
- Porting SQLite/offline-first to web (web relies on Supabase + its client cache).

---

## 2. Architecture

### 2.1 Platform abstraction layer (keystone)

New directory `src/services/platform/`:

- `types.ts` — the `Platform` interface and a `Capabilities` type.
- `electron.ts` — `electronPlatform`, wrapping existing `window.electronAPI` / `window.electron` IPC. Behavior unchanged.
- `web.ts` — `webPlatform`, backed by Supabase for data; native-only methods return a typed unavailable result.
- `index.ts` — selects the implementation at boot based on `VITE_TARGET` (and/or presence of `window.electronAPI`).

**Interface surface (initial):**
```ts
interface Capabilities {
  appTracking: boolean;     // false on web
  nativeOverlay: boolean;   // false on web (use PiP)
  pictureInPicture: boolean;// true if Document PiP API present
  localDb: boolean;         // false on web
}

interface Platform {
  capabilities: Capabilities;
  data: DataPort;           // tasks, lists, workspaces, canvas docs, sessions
  screenTime: ScreenTimePort; // getData(); track() => { available:false } on web
  focusWindow: FocusWindowPort; // setAlwaysOnTop()/resize() => no-op on web
  store: KeyValuePort;      // settings persistence (electron-store vs localStorage)
  auth: AuthPort;
}
```

**Migration rule:** every component currently calling `window.electron*` / `window.electronAPI*` is refactored to call `platform.*`. Direct `window.electron` access is removed from `src/` (kept only inside `electron.ts`). Components branch on `platform.capabilities.*` to hide or relabel desktop-only UI rather than calling `isElectron()` ad hoc.

Known call sites to migrate (non-exhaustive, from current grep): `App.tsx`, `utils/securityUtils.ts`, `components/planner/TaskDetailsPanel.tsx`, `components/layout/Layout.tsx`, `components/layout/TitleBar.tsx`, `components/screentime/useScreenTimeData.ts`, `components/focus/Settings.tsx`, `components/focus/FocusMode.tsx`, `components/focus/SuperFocusPill.tsx`.

### 2.2 Dual-target Vite build

- Env flag `VITE_TARGET` = `web` | `electron` (default `electron` to preserve current behavior).
- New npm scripts: `dev:web` (`VITE_TARGET=web vite`), `build:web` (`VITE_TARGET=web tsc && vite build` — **no electron-builder**).
- `vite.config.ts` uses `VITE_TARGET` to (a) `define` a compile-time constant, (b) conditionally exclude Electron-only entry/preload concerns, and (c) ensure no `electron`/`better-sqlite3`/`active-win` imports reach the web bundle (enforced by the platform layer keeping those imports inside `electron.ts`, which is not imported by `web.ts`).
- Web output is static and host-agnostic (deployable to Vercel/Netlify/static). Routing already hash-based (works on static hosts).

### 2.3 Data — Supabase direct (web)

- `webPlatform.data` uses the existing `@supabase/supabase-js` client (`src/services/supabase.ts`) against the **existing schema and RLS** — no schema migration required for v1.
- Entities: tasks, lists, workspaces, canvas documents, focus sessions.
- Web auth: Supabase email/password + OAuth in-browser. No deep-link/IPC auth path (that stays in `electronPlatform`).
- Offline behavior on web: limited to Supabase client caching; no SQLite. The `dataSyncService` remains the desktop bridge and is untouched for web.

### 2.4 Modules

| Module | Web v1 behavior |
|---|---|
| Planner / Tasks / Workspaces | Full port via platform layer + Supabase. |
| Canvas / Notes | Full port; data persisted to Supabase canvas docs. Largest/most complex port. |
| Reports / Analytics | Renders **focus-session** analytics (web-generated) + any desktop-synced tracking. App/category breakdown shows "install desktop to track" empty state when no data. |
| Focus timer + PiP | See §2.5. |
| Screen-time live tracking | Desktop only. Web shows capability-gated UI. |

### 2.5 PiP floating focus widget (web)

- Component `src/components/focus/FocusPiP.tsx`.
- Uses **Document Picture-in-Picture API**: `window.documentPictureInPicture.requestWindow({ width, height })`, then render the timer + current task into `pipWindow.document`. Copy required styles into the PiP document.
- Floats over other apps/tabs and survives tab switching — the browser substitute for the Super Focus pill.
- **Fallback:** if `documentPictureInPicture` is undefined (Safari/Firefox), render an in-page pinned panel instead. Selected via `platform.capabilities.pictureInPicture`.
- On Electron, `platform.capabilities.nativeOverlay === true` → existing always-on-top pill (`SuperFocusPill`) is used; PiP path not taken.

### 2.6 UI/UX redesign (web target)

- Apply the **frontend-design** skill to set an intentional visual direction: type scale, spacing system, refined color usage over the existing CSS-variable theming, and motion language.
- Reskin the web app shell + key surfaces (auth, planner, focus, reports). This is a coherent design pass on the web target, not a from-scratch rewrite, and must not regress the Electron UI.

---

## 3. Data flow

1. Boot: `main.tsx` → `platform/index.ts` selects impl from `VITE_TARGET` / `window.electronAPI`.
2. Components call `platform.data.*` (React Query for caching) → Supabase (web) or IPC→SQLite (electron).
3. Focus timer state lives in the existing Zustand store; PiP renders the same store via a portal into the PiP document.
4. Capability checks (`platform.capabilities`) drive conditional UI for tracking/overlay.

---

## 4. Error handling

- Native-only methods on web return typed `{ available: false }` — callers must handle, never throw.
- Supabase errors surface via existing React Hot Toast pattern; auth failures route to sign-in.
- PiP request can reject (user gesture required / unsupported) → fall back to pinned panel, no crash.
- Build guard: web bundle must fail the build if an Electron-only module is imported into the web graph (verified via bundle inspection in the plan).

---

## 5. Testing & verification

- **Build:** `build:web` succeeds; inspect bundle to confirm no `electron`/`better-sqlite3`/`active-win`.
- **Regression:** `build` (Electron) still succeeds; manual smoke of desktop tracking + pill.
- **E2E web:** sign in → create task → reload → persists; open/close PiP; reports render with focus data and show empty-state for tracking.
- **Cross-browser:** PiP path on Chromium; fallback path on Safari/Firefox.

---

## 6. Phasing (for the implementation plan)

1. Platform abstraction layer + capabilities (no behavior change to Electron).
2. Dual-target Vite build (`dev:web` / `build:web`) producing an empty-but-running web shell.
3. Web auth (Supabase in-browser).
4. Planner/Tasks/Workspaces on web via Supabase.
5. Reports (focus-session analytics + tracking empty state).
6. Canvas/Notes on web.
7. Focus timer + PiP widget (+ fallback).
8. UI/UX redesign pass (frontend-design).
9. Verification + deploy config.

Each phase is independently buildable and verifiable.

---

## 7. Risks

- **Canvas port complexity** — heaviest module; may need its own sub-plan.
- **PiP browser support** — Chromium-only; fallback mandatory.
- **Hidden Electron coupling** — `window.electron*` call sites must all be migrated or the web bundle breaks; the platform layer enforces this.
- **RLS gaps for browser access** — verify existing policies permit direct browser client access for all v1 entities.
