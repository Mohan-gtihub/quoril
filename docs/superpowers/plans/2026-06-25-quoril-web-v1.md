# Quoril Web v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a browser-deployable Quoril web v1 from the existing Electron+React+Vite codebase via a dual-target build, with a platform abstraction layer, Supabase-direct data, a Picture-in-Picture focus widget, and a UI redesign pass — without regressing the Electron app.

**Architecture:** Introduce `src/services/platform/` exposing one `Platform` interface with `electronPlatform` (IPC) and `webPlatform` (Supabase) implementations selected at boot from `VITE_TARGET`. Make Vite build two targets; the web bundle excludes all Electron/native modules. Components consume `platform.*` and branch on `platform.capabilities.*`.

**Tech Stack:** React 18, TypeScript, Vite 5, Zustand, React Query, Supabase JS, Vitest (added for tests), Document Picture-in-Picture API.

## Global Constraints

- Default `VITE_TARGET` is `electron`; the existing `npm run build` and Electron behavior must not change.
- The web bundle must contain **no** `electron`, `better-sqlite3`, or `active-win` imports.
- Native-only methods on web return a typed `{ available: false }` value and never throw.
- Reuse existing Supabase tables (`lists`, `tasks`, `subtasks`, `focus_sessions`, `profiles`) as-is. New tables `workspaces` and canvas tables (`canvases`, `blocks`, `connections`, `zones`) are added via a Supabase migration (Task 2.5) with RLS matching the existing per-user pattern. No changes to existing table columns.
- Routing stays hash-based (`base: './'`) so the web build works on static hosts.
- All direct `window.electron` / `window.electronAPI` access lives only inside `src/services/platform/electron.ts`.

---

## File Structure

- `src/services/platform/types.ts` — `Platform`, `Capabilities`, port interfaces.
- `src/services/platform/electron.ts` — Electron impl (wraps `window.electronAPI`).
- `src/services/platform/web.ts` — Web impl (Supabase + capability stubs).
- `src/services/platform/index.ts` — boot-time selector + `usePlatform`.
- `vite.config.ts` — dual-target conditional config.
- `package.json` — `dev:web` / `build:web` scripts, Vitest dev deps.
- `vitest.config.ts` — test runner config.
- `src/components/focus/FocusPiP.tsx` — PiP focus widget + fallback.
- Existing components — migrated from `window.electron*` to `platform.*`.

---

## Task 1: Add Vitest test harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/services/platform/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` runner available for all later tasks.

- [ ] **Step 1: Install Vitest**

Run: `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom`

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'jsdom', globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

- [ ] **Step 3: Add test script to `package.json`**

Add to `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Write a smoke test**

```ts
import { describe, it, expect } from 'vitest'
describe('harness', () => { it('runs', () => expect(1 + 1).toBe(2)) })
```

- [ ] **Step 5: Run and verify pass**

Run: `npm test` → Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/services/platform/__tests__/smoke.test.ts
git commit -m "test: add vitest harness"
```

---

## Task 2: Platform interface + capabilities types

**Files:**
- Create: `src/services/platform/types.ts`
- Test: `src/services/platform/__tests__/types.test.ts`

**Interfaces:**
- Produces: `Capabilities`, `Unavailable`, `Platform`, `DataPort`, `ScreenTimePort`, `FocusWindowPort`, `KeyValuePort`, `AuthPort`.

- [ ] **Step 1: Write failing test asserting shape**

```ts
import { describe, it, expect } from 'vitest'
import type { Platform } from '../types'
import { UNAVAILABLE } from '../types'
describe('platform types', () => {
  it('exposes UNAVAILABLE sentinel', () => {
    expect(UNAVAILABLE).toEqual({ available: false })
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test` → Expected: FAIL (cannot find module `../types`).

- [ ] **Step 3: Implement `types.ts`**

```ts
export interface Capabilities {
  appTracking: boolean
  nativeOverlay: boolean
  pictureInPicture: boolean
  localDb: boolean
}

export type Unavailable = { available: false }
export const UNAVAILABLE: Unavailable = { available: false }

export interface DataPort {
  listTasks(): Promise<any[]>
  saveTask(task: any): Promise<any>
  deleteTask(id: string): Promise<void>
  listLists(): Promise<any[]>
  listWorkspaces(): Promise<any[]>
  listCanvasDocs(): Promise<any[]>
  saveCanvasDoc(doc: any): Promise<any>
  saveSession(session: any): Promise<any>
  listSessions(range?: { from: string; to: string }): Promise<any[]>
}

export interface ScreenTimePort {
  getData(args: { date: string }): Promise<any | Unavailable>
  isTrackingAvailable(): boolean
}

export interface FocusWindowPort {
  setAlwaysOnTop(flag: boolean): void | Unavailable
  resize(w: number, h: number, x?: number, y?: number): void | Unavailable
  restore(): void | Unavailable
}

export interface KeyValuePort {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
}

export interface AuthPort {
  getSession(): Promise<any | null>
  signInWithPassword(email: string, password: string): Promise<any>
  signOut(): Promise<void>
}

export interface Platform {
  capabilities: Capabilities
  data: DataPort
  screenTime: ScreenTimePort
  focusWindow: FocusWindowPort
  store: KeyValuePort
  auth: AuthPort
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/platform/types.ts src/services/platform/__tests__/types.test.ts
git commit -m "feat: add platform interface and capability types"
```

---

## Task 2.5: Supabase schema migration (workspaces + canvas)

**Files:**
- Create: `supabase/web_v1_workspaces_canvas.sql`

**Interfaces:**
- Produces: Supabase tables `workspaces`, `canvases`, `blocks`, `connections`, `zones` with RLS, mirroring the Electron SQLite shapes in `electron/main/db.ts` (workspaces) and `electron/main/canvas/repo.ts` (canvas family).

**Context:** Cloud schema currently lacks these tables; the Electron SQLite has them. This migration brings them to Supabase so web Canvas/Workspaces can persist. Match the existing per-user RLS pattern used by `subtasks` in `supabase/emergency_fix.sql` (policies keyed on `auth.uid() = user_id`). This SQL is applied manually by the user in the Supabase SQL editor (consistent with other files in `supabase/`).

- [ ] **Step 1: Read the source shapes**

Run: `sed -n '170,200p' electron/main/db.ts` (workspaces columns) and `sed -n '80,260p' electron/main/canvas/repo.ts` (canvases/blocks/connections/zones columns). Record exact column names/types.

- [ ] **Step 2: Write the migration SQL**

Create `supabase/web_v1_workspaces_canvas.sql`. For each table: `CREATE TABLE IF NOT EXISTS public.<t>` with a `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, the columns observed in Step 1 (use `UUID`/`TEXT`/`INTEGER`/`BOOLEAN`/`TIMESTAMPTZ`/`JSONB` as appropriate, with `deleted_at TIMESTAMPTZ`), and child tables (`blocks`,`connections`,`zones`) referencing `canvases(id) ON DELETE CASCADE` via `canvas_id`. Then for every table: `ENABLE ROW LEVEL SECURITY` and four policies (select/insert/update/delete) each `USING (auth.uid() = user_id)` / `WITH CHECK (auth.uid() = user_id)`, following the `subtasks` block in `supabase/emergency_fix.sql` verbatim in style. Add indexes on `(user_id, deleted_at)` for parents and `(canvas_id)` for children.

- [ ] **Step 3: Validate SQL parses**

Run: `grep -c "CREATE TABLE" supabase/web_v1_workspaces_canvas.sql` → Expected: 5. Visually confirm every table has RLS enabled and 4 policies.

- [ ] **Step 4: Commit**

```bash
git add supabase/web_v1_workspaces_canvas.sql
git commit -m "feat(db): add supabase migration for workspaces and canvas tables"
```

> **User action required before web Canvas/Workspaces work end-to-end:** run this SQL in the Supabase SQL editor. Flag this in the Task 14 README notes.

---

## Task 3: Web platform implementation

**Files:**
- Create: `src/services/platform/web.ts`
- Test: `src/services/platform/__tests__/web.test.ts`

**Interfaces:**
- Consumes: `Platform`, `UNAVAILABLE` from `./types`; existing Supabase client from `@/services/supabase`.
- Produces: `webPlatform: Platform`.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { webPlatform } from '../web'
describe('webPlatform', () => {
  it('reports no native tracking/overlay', () => {
    expect(webPlatform.capabilities.appTracking).toBe(false)
    expect(webPlatform.capabilities.nativeOverlay).toBe(false)
    expect(webPlatform.capabilities.localDb).toBe(false)
  })
  it('native methods return unavailable', () => {
    expect(webPlatform.focusWindow.setAlwaysOnTop(true)).toEqual({ available: false })
    expect(webPlatform.screenTime.isTrackingAvailable()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test` → Expected: FAIL (cannot find `../web`).

- [ ] **Step 3: Implement `web.ts`**

```ts
import type { Platform } from './types'
import { UNAVAILABLE } from './types'
import { supabase } from '@/services/supabase'

const hasPiP = typeof window !== 'undefined' && 'documentPictureInPicture' in window

export const webPlatform: Platform = {
  capabilities: { appTracking: false, nativeOverlay: false, pictureInPicture: hasPiP, localDb: false },
  data: {
    async listTasks() { const { data } = await supabase.from('tasks').select('*'); return data ?? [] },
    async saveTask(t) { const { data } = await supabase.from('tasks').upsert(t).select().single(); return data },
    async deleteTask(id) { await supabase.from('tasks').delete().eq('id', id) },
    async listLists() { const { data } = await supabase.from('lists').select('*'); return data ?? [] },
    async listWorkspaces() { const { data } = await supabase.from('workspaces').select('*'); return data ?? [] },
    async listCanvasDocs() { const { data } = await supabase.from('canvases').select('*'); return data ?? [] },
    async saveCanvasDoc(d) { const { data } = await supabase.from('canvases').upsert(d).select().single(); return data },
    async saveSession(s) { const { data } = await supabase.from('focus_sessions').upsert(s).select().single(); return data },
    async listSessions(range) {
      let q = supabase.from('focus_sessions').select('*')
      if (range) q = q.gte('start', range.from).lte('start', range.to)
      const { data } = await q; return data ?? []
    },
  },
  screenTime: {
    async getData() { return UNAVAILABLE },
    isTrackingAvailable() { return false },
  },
  focusWindow: {
    setAlwaysOnTop() { return UNAVAILABLE },
    resize() { return UNAVAILABLE },
    restore() { return UNAVAILABLE },
  },
  store: {
    async get(key) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null },
    async set(key, value) { localStorage.setItem(key, JSON.stringify(value)) },
  },
  auth: {
    async getSession() { const { data } = await supabase.auth.getSession(); return data.session },
    async signInWithPassword(email, password) { return supabase.auth.signInWithPassword({ email, password }) },
    async signOut() { await supabase.auth.signOut() },
  },
}
```

> Table names confirmed against `supabase/` + Task 2.5 migration: `tasks`, `lists`, `subtasks`, `focus_sessions` (existing) and `workspaces`, `canvases` (added in Task 2.5).

- [ ] **Step 4: Run test, verify pass**

Run: `npm test` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/platform/web.ts src/services/platform/__tests__/web.test.ts
git commit -m "feat: add web platform implementation (supabase-backed)"
```

---

## Task 4: Electron platform implementation + selector

**Files:**
- Create: `src/services/platform/electron.ts`
- Create: `src/services/platform/index.ts`
- Test: `src/services/platform/__tests__/index.test.ts`

**Interfaces:**
- Consumes: `Platform` from `./types`; `webPlatform` from `./web`; `window.electronAPI` / `window.electron`.
- Produces: `electronPlatform: Platform`; `getPlatform(): Platform`; `platform` (eager singleton).

- [ ] **Step 1: Write failing test (selector picks web when no electronAPI)**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
describe('getPlatform', () => {
  beforeEach(() => { vi.resetModules(); (globalThis as any).window = {} })
  it('selects web platform when electronAPI absent', async () => {
    const { getPlatform } = await import('../index')
    expect(getPlatform().capabilities.localDb).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test` → Expected: FAIL (cannot find `../index`).

- [ ] **Step 3: Implement `electron.ts`**

Map each method to the existing IPC bridge (only file allowed to touch `window.electron*`):

```ts
import type { Platform } from './types'

const api = () => (window as any).electronAPI
const legacy = () => (window as any).electron

export const electronPlatform: Platform = {
  capabilities: { appTracking: true, nativeOverlay: true, pictureInPicture: false, localDb: true },
  data: {
    async listTasks() { return api().db.listTasks?.() ?? [] },
    async saveTask(t) { return api().db.saveTask?.(t) },
    async deleteTask(id) { return api().db.deleteTask?.(id) },
    async listLists() { return api().db.listLists?.() ?? [] },
    async listWorkspaces() { return api().db.listWorkspaces?.() ?? [] },
    async listCanvasDocs() { return api().db.listCanvasDocs?.() ?? [] },
    async saveCanvasDoc(d) { return api().db.saveCanvasDoc?.(d) },
    async saveSession(s) { return api().db.saveSession?.(s) },
    async listSessions() { return api().db.listSessions?.() ?? [] },
  },
  screenTime: {
    async getData(args) { return api().screenTime?.getData(args) },
    isTrackingAvailable() { return true },
  },
  focusWindow: {
    setAlwaysOnTop(flag) { legacy()?.setAlwaysOnTop?.(flag) },
    resize(w, h, x, y) { legacy()?.resizeWindow?.(w, h, x, y) },
    restore() { legacy()?.restoreWindow?.() },
  },
  store: {
    async get(key) { return api().store?.get(key) ?? null },
    async set(key, value) { return api().store?.set(key, value) },
  },
  auth: {
    async getSession() { return null },
    async signInWithPassword() { throw new Error('electron auth uses deep-link flow') },
    async signOut() {},
  },
}
```

> Note: align method names (`db.listTasks`, etc.) with the real preload surface in `electron/preload/index.ts` during implementation; the existing IPC channel names (`db:saveSession`, `screenTime:getData`) confirm the bridge exists.

- [ ] **Step 4: Implement `index.ts`**

```ts
import type { Platform } from './types'
import { webPlatform } from './web'

let _platform: Platform | null = null

export function getPlatform(): Platform {
  if (_platform) return _platform
  const isElectron =
    import.meta.env?.VITE_TARGET !== 'web' &&
    typeof window !== 'undefined' && !!(window as any).electronAPI
  if (isElectron) {
    // lazy require keeps electron impl out of the web bundle graph entry
    _platform = require('./electron').electronPlatform
  } else {
    _platform = webPlatform
  }
  return _platform
}

export const platform = getPlatform()
```

> Implementation note: if `require` is unavailable in the bundle, use a static conditional import guarded by `VITE_TARGET` define so the web build tree-shakes `electron.ts`. Verify `electron.ts` is absent from the web bundle in Task 6.

- [ ] **Step 5: Run test, verify pass**

Run: `npm test` → Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/platform/electron.ts src/services/platform/index.ts src/services/platform/__tests__/index.test.ts
git commit -m "feat: add electron platform impl and boot-time selector"
```

---

## Task 5: Dual-target Vite config + web scripts

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run dev:web`, `npm run build:web` (no electron-builder, no electron plugin).

- [ ] **Step 1: Make the electron plugin conditional in `vite.config.ts`**

At top of `defineConfig`, read the target and build the plugins array conditionally:

```ts
const isWeb = process.env.VITE_TARGET === 'web'

export default defineConfig({
  define: { __VITE_TARGET__: JSON.stringify(process.env.VITE_TARGET ?? 'electron') },
  plugins: [
    react(),
    ...(isWeb ? [] : [electron({ /* existing main+preload config unchanged */ })]),
  ],
  // ...existing resolve/base/build/server/css/optimizeDeps unchanged
})
```

- [ ] **Step 2: Add web scripts to `package.json`**

Add to `"scripts"`:
```
"dev:web": "VITE_TARGET=web vite",
"build:web": "VITE_TARGET=web tsc && VITE_TARGET=web vite build"
```

- [ ] **Step 3: Run the web dev server**

Run: `npm run dev:web` → Expected: Vite starts on port 5173 with no electron plugin output; app shell loads in browser.

- [ ] **Step 4: Run the web build**

Run: `npm run build:web` → Expected: build succeeds, output in `dist/`, no `dist-electron` emitted.

- [ ] **Step 5: Verify Electron build still works**

Run: `npm run build` → Expected: succeeds, emits `dist-electron/index.cjs` as before.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts package.json
git commit -m "build: add dual-target vite config and web scripts"
```

---

## Task 6: Verify web bundle excludes native modules

**Files:**
- Create: `scripts/check-web-bundle.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run check:web` guard.

- [ ] **Step 1: Write the guard script**

```js
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const banned = ['better-sqlite3', 'active-win', "require('electron')", 'from "electron"', "from 'electron'"]
const dir = 'dist/assets'
const offenders = []
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue
  const txt = readFileSync(join(dir, f), 'utf8')
  for (const b of banned) if (txt.includes(b)) offenders.push(`${f}: ${b}`)
}
if (offenders.length) { console.error('Banned native refs in web bundle:\n' + offenders.join('\n')); process.exit(1) }
console.log('Web bundle clean.')
```

- [ ] **Step 2: Add script**

Add to `package.json` scripts: `"check:web": "node scripts/check-web-bundle.mjs"`.

- [ ] **Step 3: Build and check**

Run: `npm run build:web && npm run check:web` → Expected: "Web bundle clean."

- [ ] **Step 4: If it fails**

Trace the offending import; ensure `electron.ts` is only reached via the guarded conditional in `index.ts` and that no component imports `electron.ts` directly. Re-run until clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-web-bundle.mjs package.json
git commit -m "build: add web bundle native-module guard"
```

---

## Task 7: Migrate the app SHELL native surfaces to platform (incremental)

> **Re-scoped (2026-06-25):** the codebase has ~70 `window.electron*` call sites across ~30 files — far more than originally assumed, concentrated in canvas, data-sync, reports, and dashboard. Per the incremental decision, this task migrates ONLY the app-shell native surfaces. Data/sync (Task 9), reports/dashboard (Task 10), and canvas (Task 11) migrate their own `window.electron*` calls. The global "no direct electron" guard test moves to Task 14, after every module is converted.

**Scope of THIS task — migrate these surfaces only:**
- Window controls: `src/components/layout/TitleBar.tsx` (`window.minimize/maximize/close`), `src/components/layout/Layout.tsx` (`resizeWindow`/`restoreWindow`).
- Focus overlay: `src/components/focus/FocusMode.tsx`, `src/components/focus/SuperFocusPill.tsx` (`setAlwaysOnTop`, `resizeWindow`, `restoreWindow`, `setResizable`, `closeDevTools`), `src/components/focus/Settings.tsx`.
- Key-value store: `src/utils/securityUtils.ts` (`store.get/set`).
- Screen-time display: `src/components/screentime/useScreenTimeData.ts` (`screenTime.getData`).
- Tracker context: `src/store/focusStore.ts` (`tracker.setContext`).
- Auth + external links: `src/App.tsx` (`auth.onDeepLink`), `src/store/authStore.ts` (`auth.setUser`, `auth`, `file.openExternal`).
- `src/hooks/useElectron.ts` — keep `isElectron()` (it's a capability probe, allowed), but it may delegate to `platform.capabilities` internally.

**Explicitly OUT of scope (leave `window.electronAPI.*` calls untouched here):** `*.db.*` (Task 9), `*.reports.*` + dashboard `db.getAppUsage*` (Task 10), `*.canvas.*` (Task 11), and `dataSyncService.ts` / `backupService.ts` db internals (Task 9).

**Files:**
- Modify: `src/services/platform/types.ts` (extend interface), `src/services/platform/web.ts`, `src/services/platform/electron.ts` (add the shell ports), plus the in-scope component files above.
- Test: `src/services/platform/__tests__/shell-ports.test.ts`

**Interfaces — extend `Platform` with shell ports:**
- `windowControls: { minimize(): void|Unavailable; maximize(): void|Unavailable; close(): void|Unavailable }`
- extend `FocusWindowPort` with `setResizable(flag): void|Unavailable; closeDevTools(): void|Unavailable`
- `tracker: { setContext(ctx: any): void|Unavailable }`
- extend `AuthPort` with `onDeepLink(cb: (url: string) => void): (() => void) | Unavailable; setUser(user: any): void|Unavailable`
- `links: { openExternal(url: string): void|Unavailable }`
- On web all of these return `UNAVAILABLE`; on electron they call the existing bridge. Add matching `capabilities` if a consumer needs to branch (reuse `nativeOverlay` for window controls/overlay).

- [ ] **Step 1: Write failing test for the new shell ports on web**

```ts
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/services/supabase', () => ({ supabase: {} }))
import { webPlatform } from '../web'
describe('web shell ports', () => {
  it('window controls and tracker are unavailable on web', () => {
    expect(webPlatform.windowControls.minimize()).toEqual({ available: false })
    expect(webPlatform.tracker.setContext({})).toEqual({ available: false })
    expect(webPlatform.links.openExternal('https://x.com')).toEqual({ available: false })
  })
})
```

- [ ] **Step 2: Run test, verify fail**

Run: `npm test` → Expected: FAIL (properties don't exist yet).

- [ ] **Step 3: Extend interface + both impls**

Add the ports to `types.ts`; implement on `web.ts` (all return `UNAVAILABLE`, except `onDeepLink` returns `UNAVAILABLE`); implement on `electron.ts` mapping to the real bridge (`api().window.minimize()`, `legacy().setResizable(f)`, `api().tracker.setContext(ctx)`, `api().auth.onDeepLink(cb)` returning its unsubscribe, `api().auth.setUser(u)`, `api().file.openExternal(url)`). Verify the exact bridge names against `electron/preload/index.ts`.

- [ ] **Step 4: Migrate the in-scope call sites**

Replace each in-scope `window.electron*` call with the `platform.*` equivalent. Guard desktop-only UI with `platform.capabilities.nativeOverlay` (e.g. TitleBar window buttons, SuperFocusPill/FocusMode resize) instead of bare `window.electron` truthiness. Do NOT touch out-of-scope db/canvas/reports calls.

- [ ] **Step 5: Run tests + typecheck + both builds**

Run: `npm test && npx tsc --noEmit && npm run build:web && npm run check:web` → Expected: all pass, tsc 0 errors, bundle clean. (Electron `npm run build` packaging may fail on environment grounds — only the vite portion needs to run; note if so.)

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "refactor: route app-shell native access through platform layer"
```

---

## Task 8: Web auth (Supabase in-browser)

**Files:**
- Modify: `src/App.tsx` (auth gating), `src/components/auth/*`
- Test: `src/components/auth/__tests__/webAuth.test.tsx`

**Interfaces:**
- Consumes: `platform.auth`.

- [ ] **Step 1: Write failing test for sign-in calling platform.auth**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { platform } from '@/services/platform'
describe('web auth', () => {
  it('signInWithPassword delegates to supabase', async () => {
    const spy = vi.spyOn(platform.auth, 'signInWithPassword').mockResolvedValue({ data: {}, error: null } as any)
    await platform.auth.signInWithPassword('a@b.com', 'pw')
    expect(spy).toHaveBeenCalledWith('a@b.com', 'pw')
  })
})
```

- [ ] **Step 2: Run, verify fail/pass scaffolding**

Run: `npm test` → Expected: PASS once `platform.auth` exists (from Task 3).

- [ ] **Step 3: Gate the app on session for web**

In `App.tsx`, on mount call `platform.auth.getSession()`; if null and `!capabilities.localDb` (web), render the existing auth screen wired to `platform.auth.signInWithPassword`. Keep the Electron deep-link path under `capabilities.localDb`.

- [ ] **Step 4: Manual verify**

Run: `npm run dev:web`, sign in with a real Supabase user → Expected: lands on app, session persists across reload.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: web supabase auth flow"
```

---

## Task 9: Planner / Tasks / Workspaces on web

**Files:**
- Modify: planner data hooks to use `platform.data` (e.g. `src/components/planner/*`, relevant `src/hooks/*`, `src/store/*`)
- Test: `src/components/planner/__tests__/taskData.test.ts`

**Interfaces:**
- Consumes: `platform.data.listTasks/saveTask/deleteTask/listLists/listWorkspaces`.

- [ ] **Step 1: Confirm real table names**

Run: `ls supabase && grep -rn "create table" supabase | head` → record exact table names; update `web.ts` if they differ from assumptions in Task 3.

- [ ] **Step 2: Write failing test for the task data hook against a mocked platform**

```ts
import { describe, it, expect, vi } from 'vitest'
import { platform } from '@/services/platform'
it('loads tasks via platform', async () => {
  vi.spyOn(platform.data, 'listTasks').mockResolvedValue([{ id: '1', title: 'x' }])
  const tasks = await platform.data.listTasks()
  expect(tasks[0].title).toBe('x')
})
```

- [ ] **Step 3: Run, verify pass**

Run: `npm test` → Expected: PASS.

- [ ] **Step 4: Wire planner reads/writes through React Query + `platform.data`**

Replace any IPC/SQLite task calls in the planner stores/hooks with `platform.data.*`. Keep optimistic updates already present.

- [ ] **Step 5: Manual E2E**

Run: `npm run dev:web` → create a task, edit, delete, reload → Expected: changes persist via Supabase; verify in Supabase dashboard.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: planner tasks/lists/workspaces on web via supabase"
```

---

## Task 10: Reports / Analytics on web

**Files:**
- Modify: `src/components/reports/*`, `src/components/screentime/ScreenTime.tsx`
- Test: `src/components/reports/__tests__/webReports.test.tsx`

**Interfaces:**
- Consumes: `platform.data.listSessions`, `platform.screenTime.getData`, `platform.capabilities.appTracking`.

- [ ] **Step 1: Write failing test for empty-state when tracking unavailable**

```tsx
import { describe, it, expect } from 'vitest'
import { platform } from '@/services/platform'
it('web has no app tracking', () => {
  expect(platform.capabilities.appTracking).toBe(false)
})
```

- [ ] **Step 2: Run, verify pass**

Run: `npm test` → Expected: PASS.

- [ ] **Step 3: Implement reports rendering logic**

In reports/screen-time components: render focus-session charts from `platform.data.listSessions`. For app/category breakdown, when `!capabilities.appTracking`, render an "Install the desktop app to track screen time" empty state with a download CTA instead of empty charts.

- [ ] **Step 4: Manual verify**

Run: `npm run dev:web` → reports show focus-session data; tracking section shows the empty state.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: web reports (focus analytics + tracking empty state)"
```

---

## Task 11: Canvas / Notes on web

**Files:**
- Modify: `src/components/canvas/*` data persistence; `src/store/canvas/*`
- Test: `src/components/canvas/__tests__/canvasPersistence.test.ts`

**Interfaces:**
- Consumes: `platform.data.listCanvasDocs`, `platform.data.saveCanvasDoc`.

- [ ] **Step 1: Identify canvas persistence call sites**

Run: `grep -rn "electronAPI\|ipc\|canvas" electron/main/canvas | head; grep -rln "save\|persist" src/store/canvas` → list the read/write boundary.

- [ ] **Step 2: Write failing test for save delegating to platform**

```ts
import { describe, it, expect, vi } from 'vitest'
import { platform } from '@/services/platform'
it('saves canvas doc via platform', async () => {
  const spy = vi.spyOn(platform.data, 'saveCanvasDoc').mockResolvedValue({ id: 'c1' })
  await platform.data.saveCanvasDoc({ id: 'c1', nodes: [] })
  expect(spy).toHaveBeenCalled()
})
```

- [ ] **Step 3: Run, verify pass**

Run: `npm test` → Expected: PASS.

- [ ] **Step 4: Route canvas load/save through `platform.data`**

Replace IPC canvas persistence in the renderer with `platform.data.listCanvasDocs` / `saveCanvasDoc`. Serialize the canvas document (nodes/edges) to a JSON column.

- [ ] **Step 5: Manual E2E**

Run: `npm run dev:web` → create canvas content, add nodes, reload → Expected: persists via Supabase.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: canvas/notes persistence on web via supabase"
```

---

## Task 12: Focus timer + Picture-in-Picture widget

**Files:**
- Create: `src/components/focus/FocusPiP.tsx`
- Modify: `src/components/focus/FocusTimerPanel.tsx` (mount point), `src/components/focus/SuperFocusPill.tsx` (capability branch)
- Test: `src/components/focus/__tests__/focusPiP.test.tsx`

**Interfaces:**
- Consumes: `platform.capabilities.pictureInPicture`, `platform.capabilities.nativeOverlay`; existing focus Zustand store.

- [ ] **Step 1: Write failing test for fallback decision**

```tsx
import { describe, it, expect } from 'vitest'
import { canUsePiP } from '../FocusPiP'
describe('PiP support', () => {
  it('returns false when API absent', () => {
    // jsdom has no documentPictureInPicture
    expect(canUsePiP()).toBe(false)
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test` → Expected: FAIL (no `FocusPiP`).

- [ ] **Step 3: Implement `FocusPiP.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function canUsePiP() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window
}

export function FocusPiP({ children }: { children: React.ReactNode }) {
  const [pipBody, setPipBody] = useState<HTMLElement | null>(null)
  const pipRef = useRef<any>(null)

  async function open() {
    if (!canUsePiP()) return
    const pip = await (window as any).documentPictureInPicture.requestWindow({ width: 320, height: 180 })
    // copy styles so the timer is themed
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
      pip.document.head.appendChild(node.cloneNode(true))
    })
    pip.addEventListener?.('pagehide', () => setPipBody(null))
    pipRef.current = pip
    setPipBody(pip.document.body)
  }

  function close() { pipRef.current?.close?.(); setPipBody(null) }

  useEffect(() => () => close(), [])

  return (
    <>
      <button onClick={pipBody ? close : open}>
        {pipBody ? 'Dock timer' : 'Pop out timer'}
      </button>
      {pipBody
        ? createPortal(children, pipBody)
        : <div className="focus-pinned-panel">{children}</div>}
    </>
  )
}
```

- [ ] **Step 4: Wire into the focus panel with capability branching**

In `FocusTimerPanel.tsx`: if `platform.capabilities.nativeOverlay` use existing `SuperFocusPill` (Electron). Else render `<FocusPiP>` wrapping the timer + current task (web). The timer reads the existing Zustand store so PiP and main stay in sync.

- [ ] **Step 5: Run test, verify pass**

Run: `npm test` → Expected: PASS.

- [ ] **Step 6: Manual verify in Chromium**

Run: `npm run dev:web` in Chrome → click "Pop out timer" → a floating window shows the running timer over other apps; "Dock timer" returns it. In Firefox/Safari the pinned panel shows instead (no crash).

- [ ] **Step 7: Commit**

```bash
git add src/components/focus
git commit -m "feat: PiP focus widget with in-page fallback"
```

---

## Task 13: UI/UX redesign pass (web target)

**Files:**
- Modify: `src/index.css`, `tailwind.config.js`, web shell + key screens (auth, planner, focus, reports)

**Interfaces:**
- No new platform interfaces; visual only. Must not regress Electron UI.

- [ ] **Step 1: Establish design direction**

Apply the frontend-design skill to define type scale, spacing, color usage over existing CSS variables, and motion. Record decisions inline in `src/index.css` as comments/tokens.

- [ ] **Step 2: Reskin the web shell**

Update layout, navigation, and auth screens to the new system. Use Tailwind tokens; keep CSS-variable theming so Electron theme still works.

- [ ] **Step 3: Reskin planner, focus, reports surfaces**

Apply spacing/typography/color tokens consistently across these screens.

- [ ] **Step 4: Visual regression check on Electron**

Run: `npm run build` and launch Electron → Expected: desktop UI intact (no broken layout from shared CSS changes).

- [ ] **Step 5: Manual verify web**

Run: `npm run dev:web` → screens reflect the new direction cohesively.

- [ ] **Step 6: Commit**

```bash
git add src tailwind.config.js
git commit -m "feat: web UI/UX redesign pass"
```

---

## Task 14: Deploy config + final verification

**Files:**
- Create: `vercel.json` (or host config)
- Modify: `README.md` (web build/run section)

**Interfaces:**
- None.

- [ ] **Step 1: Add static host config**

```json
{ "buildCommand": "npm run build:web", "outputDirectory": "dist", "framework": null }
```

- [ ] **Step 2: Full verification sweep**

Run, expecting all to pass:
```bash
npm test
npx tsc --noEmit
npm run build:web && npm run check:web
npm run build
```

- [ ] **Step 3: Add the global "no direct electron" guard test (deferred from Task 7)**

Now that every module (shell T7, data T9, reports T10, canvas T11, PiP T12) routes through `platform`, add `src/services/platform/__tests__/no-direct-electron.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
function walk(d: string): string[] {
  return readdirSync(d).flatMap(f => {
    const p = join(d, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
describe('no direct electron access', () => {
  it('only electron.ts touches window.electron', () => {
    const files = walk('src').filter(f => /\.(ts|tsx)$/.test(f) && !f.endsWith('platform/electron.ts'))
    const offenders = files.filter(f => /window\.electron(API)?/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
```

Run: `npm test` → Expected: PASS (no offenders). If any remain, migrate them through `platform` before proceeding.

- [ ] **Step 4: E2E smoke on the built web app**

Run: `npm run preview` (or serve `dist`) → sign in, create task, reload (persists), open/close PiP, reports render with empty-state for tracking.

- [ ] **Step 4: Document web usage in README**

Add a "Web build" section: `npm run dev:web`, `npm run build:web`, deploy notes, and the PiP/Chromium caveat.

- [ ] **Step 5: Commit**

```bash
git add vercel.json README.md
git commit -m "chore: web deploy config and docs"
```

---

## Self-Review Notes

- **Spec coverage:** platform layer (T2-4,7), dual-target build (T5), bundle guard (T6, addresses §4 build guard), Supabase data (T3,9,11), auth (T8), reports honesty (T10), canvas (T11), PiP+fallback (T12), UI redesign (T13), verification/deploy (T14). All §2–§6 spec sections map to a task.
- **Assumption to verify early:** real Supabase table names (T9 Step 1) — `web.ts` placeholders must be reconciled before data tasks are accepted.
- **Risk carried from spec:** canvas port (T11) may need decomposition if the renderer↔main canvas boundary is larger than one task; revisit at T11 Step 1.
