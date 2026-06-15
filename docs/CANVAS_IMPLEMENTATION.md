# Quoril Canvas — Implementation Source of Truth

> **This file is the single authoritative reference for the Canvas feature.**
> Any future session should read this first before touching code.
> Update this file whenever decisions change, chunks complete, or files move.

**Scope:** Solo-user, local-first desktop canvas. **No AI. No collab.** These are explicitly out of scope for now.

---

## 0. Orientation for Future Sessions

- Project root: `c:\Users\Asus\Documents\code\blitzit-clone`
- Product name: **Quoril** (package.json name: `quoril`, appId: `com.quoril.app`)
- Current product: desktop productivity app (tasks + focus + reports + screen time)
- New initiative: **Canvas** — an infinite spatial workspace that becomes the primary app shell
- Positioning: local-first spatial second-brain wired to real task execution
- Canvas is **additive** — no existing Quoril feature is deleted, only wrapped as overlays
- **Not building:** AI features, real-time collaboration, cloud sync of canvas data (local SQLite only)

### Working rules
1. Read this file first. Don't re-explore the codebase blindly.
2. When a chunk completes or a decision changes, update the relevant section and bump "Last updated" at the bottom.
3. File paths in this doc use forward slashes; they are relative to project root.
4. When in doubt about a design decision, consult §3 (The Five Laws) — violating a Law is grounds for PR rejection.

---

## 1. Current Quoril Codebase (audit as of 2026-04-22)

### Stack
- **Shell:** Electron 28 + React 18 + TypeScript + Vite 5
- **State:** Zustand 4 with localStorage persist middleware
- **Styling:** TailwindCSS 3, CSS variables for theming
- **Routing:** react-router-dom v6 (HashRouter, for Electron)
- **Local DB:** better-sqlite3 9 in Electron main
- **Cloud (existing Quoril only, not canvas):** Supabase (Postgres + Auth + Realtime + Storage)
- **UI:** Custom components (no shadcn), lucide-react icons, Framer Motion, react-hot-toast
- **Forms:** react-hook-form + zod
- **Misc:** @dnd-kit, recharts, howler, canvas-confetti, active-win

### Folder map (existing)
```
electron/
  main/
    index.ts          — window mgmt, tray, IPC handlers
    db.ts             — better-sqlite3 + dbOps
    core/core.ts      — app tracking
    core/collector.ts
  preload/
    index.ts          — contextBridge
src/
  App.tsx             — routes + auth + deep-link
  components/
    auth/ dashboard/ focus/ layout/ planner/ reports/
    screentime/ sidebar/ ui/ workspaces/
  store/
    authStore, focusStore, taskStore, listStore, workspaceStore,
    settingsStore, syncStore, profileStore, plannerStore, uiStore
  services/
    localStorage, supabase, dataSyncService, backupService, soundService
  types/ utils/ hooks/ providers/ config/
```

### Existing SQLite tables (in `electron/main/db.ts` `initDatabase()` ~line 724)
- `db_meta`, `tasks`, `lists`, `subtasks`, `focus_sessions`
- `apps`, `contexts`, `app_sessions`
- `domain_sessions`, `app_categories`, `domain_categories`
- `workspaces`

### Existing IPC (`window.electronAPI.*`)
`window`, `app`, `notification`, `focus`, `file`, `store`, `db`, `auth`

### Existing routes (in `src/App.tsx`)
`/focus-popup`, `/dashboard`, `/workspaces`, `/planner`, `/focus`, `/settings`, `/reports`, `/activity`, `/screen-time`

### Existing sidebar (in `src/components/layout/Sidebar.tsx`)
Home, Planner, Workspaces, Reports, Screen Time, Settings + Workspaces list

---

## 2. Product Vision

**Quoril Canvas** = an infinite spatial workspace that becomes the primary app shell. Existing Quoril features (tasks, focus, reports) remain, invoked from canvas as overlays.

### The moat
> Canvas blocks reference live Quoril tasks and trigger real focus sessions.

No other tool has this Execution Loop inside one spatial surface:

```
IDEA ──drag-to-zone──▶ TASK ──click Start──▶ FOCUS (Quoril timer)
  ▲                                              │
  │                                              ▼
  └────────── FEEDBACK (auto-TextBlock) ◀──── session end
```

### One-liner wedge
> "The only canvas where zooming out tells you what you've been thinking about — and zooming in lets you execute on it."

---

## 3. The Five Laws (Non-Negotiable)

1. **Canvas is Primary.** Login lands on canvas. Every session starts/ends there.
2. **No Escape.** No action leaves canvas. Settings, task edits, reports = inline overlays.
3. **Behaviors, Not Components.** One unified `<Block>` renderer dispatches by kind. No "seven node components."
4. **Intent Over Inference.** User-drawn zones are truth. Auto-clusters are subtle opt-in hints only.
5. **Execution Is Native.** Canvas *is* execution: Idea → Task → Focus → Feedback on canvas.

**A PR violating any Law is rejected without discussion.**

---

## 4. Tech Stack Additions (all MIT)

| Package | Version | Purpose |
|---|---|---|
| `@xyflow/react` | ^12 | Canvas engine (pan/zoom/nodes/edges) |
| `@tiptap/react` | ^2 | Rich text |
| `@tiptap/starter-kit` | ^2 | TipTap defaults |
| `@tiptap/extension-placeholder` | ^2 | Empty hints |
| `@tiptap/extension-task-list` | ^2 | Checkbox lists |
| `@tiptap/extension-task-item` | ^2 | Checkbox items |
| `open-graph-scraper` | ^6 | Link unfurl (main process) |
| `density-clustering` | ^1 | DBSCAN for auto-zone hints |
| `rbush` | ^3 | In-memory R-tree viewport culling |
| `html-to-image` | ^1 | PNG export |

### Rejected
- **tldraw** — SDK licensing risk
- **Konva / Pixi** — iframe-overlay tax
- **Fabric.js** — license ambiguity
- **Lexical** — weaker ProseMirror ecosystem than TipTap
- **Yjs / Liveblocks** — out of scope (no collab)
- **sqlite-vec / embeddings** — out of scope (no AI)

### License audit rule
Every new dep must be MIT / Apache-2 / BSD. No SSPL, BSL, or "source-available."

---

## 5. Data Model

### TypeScript types (`src/types/canvas.ts` — to be created)

```ts
export type BlockKind =
  | 'text' | 'image' | 'video' | 'link'
  | 'checklist' | 'idea' | 'task_ref';

export interface TextContent { doc: unknown /* ProseMirror JSON */ }
export interface ImageContent { src: string; alt?: string; natW?: number; natH?: number }
export interface VideoContent { provider: 'youtube'; videoId: string; start?: number }
export interface LinkContent { url: string; title?: string; description?: string; image?: string; siteName?: string; fetchedAt?: number }
export interface ChecklistContent { items: { id: string; text: string; done: boolean }[] }
export interface IdeaContent { text: string; color?: string; icon?: string }
export interface TaskRefContent { taskId: string }

export type BlockContent =
  | { kind: 'text'; data: TextContent }
  | { kind: 'image'; data: ImageContent }
  | { kind: 'video'; data: VideoContent }
  | { kind: 'link'; data: LinkContent }
  | { kind: 'checklist'; data: ChecklistContent }
  | { kind: 'idea'; data: IdeaContent }
  | { kind: 'task_ref'; data: TaskRefContent };

export interface Block {
  id: string;
  canvasId: string;
  userId: string;
  kind: BlockKind;
  x: number; y: number; w: number; h: number; z: number;
  rotation?: number;
  content: BlockContent;
  style?: { bg?: string; border?: string; opacity?: number };
  tags?: string[];
  linkedTaskId?: string | null;
  isLandmark?: boolean;
  lastTouchedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Connection {
  id: string; canvasId: string; userId: string;
  fromBlockId: string; toBlockId: string;
  fromAnchor?: 'auto'|'n'|'s'|'e'|'w';
  toAnchor?: 'auto'|'n'|'s'|'e'|'w';
  kind: 'reference' | 'flow' | 'dependency';
  label?: string;
  style?: { color?: string; dashed?: boolean; width?: number };
  createdAt: string; updatedAt: string; deletedAt?: string|null;
}

export interface Zone {
  id: string; canvasId: string; userId: string;
  name: string;
  color?: string;
  icon?: string;
  pattern?: 'none' | 'dots' | 'grid' | 'noise';
  bounds: { x: number; y: number; w: number; h: number };
  createdAt: string; updatedAt: string; deletedAt?: string|null;
}

export interface Canvas {
  id: string; userId: string; workspaceId?: string | null;
  title: string; icon?: string; color?: string;
  viewport: { x: number; y: number; zoom: number };
  homeViewport?: { x: number; y: number; zoom: number };
  settings: { grid: boolean; snap: boolean; autoZoneHints: boolean; theme?: string };
  schemaVersion: number;
  createdAt: string; updatedAt: string; deletedAt?: string|null;
}
```

### SQLite schema (additive in `electron/main/db.ts`)

```sql
CREATE TABLE IF NOT EXISTS canvases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT,
  title TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  viewport_json TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
  home_viewport_json TEXT,
  settings_json TEXT NOT NULL DEFAULT '{"grid":true,"snap":false,"autoZoneHints":false}',
  schema_version INTEGER DEFAULT 1,
  created_at TEXT, updated_at TEXT, deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS canvases_user_idx ON canvases(user_id, deleted_at);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  x REAL NOT NULL, y REAL NOT NULL,
  w REAL NOT NULL, h REAL NOT NULL,
  z INTEGER DEFAULT 0,
  rotation REAL DEFAULT 0,
  content_json TEXT NOT NULL,
  style_json TEXT,
  tags_json TEXT,
  linked_task_id TEXT,
  is_landmark INTEGER DEFAULT 0,
  last_touched_at TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS blocks_canvas_idx ON blocks(canvas_id, deleted_at);
CREATE INDEX IF NOT EXISTS blocks_linked_task_idx ON blocks(linked_task_id);

CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  from_block_id TEXT NOT NULL,
  to_block_id TEXT NOT NULL,
  from_anchor TEXT DEFAULT 'auto',
  to_anchor TEXT DEFAULT 'auto',
  kind TEXT DEFAULT 'reference',
  label TEXT,
  style_json TEXT,
  created_at TEXT, updated_at TEXT, deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS connections_canvas_idx ON connections(canvas_id, deleted_at);
CREATE INDEX IF NOT EXISTS connections_from_idx ON connections(from_block_id);
CREATE INDEX IF NOT EXISTS connections_to_idx ON connections(to_block_id);

CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT,
  color TEXT,
  icon TEXT,
  pattern TEXT DEFAULT 'none',
  bounds_json TEXT NOT NULL,
  created_at TEXT, updated_at TEXT, deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS zones_canvas_idx ON zones(canvas_id, deleted_at);

CREATE TABLE IF NOT EXISTS link_previews (
  url TEXT PRIMARY KEY,
  title TEXT, description TEXT, image TEXT, site_name TEXT,
  fetched_at TEXT
);
```

**Note:** no `version` column, no `synced` column — local-only, single-user, no conflict resolution needed. Tombstones (`deleted_at`) kept for undo/restore within current session; hard-delete on canvas destroy.

---

## 6. Architecture

### Process map
```
┌────── Electron main ──────┐
│  index.ts                 │
│    canvas IPC handlers    │
│  canvas/repo.ts           │
│  canvas/ipc.ts            │
│  canvas/unfurl.ts         │
│  canvas/export.ts         │
│  db.ts (migrations)       │
└───────────────────────────┘
           │ contextBridge
┌──────────▼─── Renderer ───────┐
│ src/components/canvas/        │
│   CanvasApp, MetaCanvas,      │
│   CanvasSurface, Block,       │
│   edges/, layers/, overlays/  │
│ src/store/canvas/             │
│   canvasStore, blocksStore,   │
│   connectionsStore, zonesStore│
│   historyStore, overlayStore  │
│ workers/clusterWorker.ts      │
└───────────────────────────────┘
```

### Coordinate system
- World coords: float64, clamp ±1e6
- Screen: `world * zoom + pan`
- Zoom: [0.05, 4], log-stepped `zoom *= exp(-deltaY * 0.001)`
- Zoom anchors on cursor (Miro-style)
- Only world coords persisted

### App shell reframe
- Login → `<CanvasApp />`
- Legacy `<Layout>` + sidebar + routes → invoked only as **overlays** from canvas
- Sidebar = collapsible rail, not persistent chrome

### One Block component (Law 3)
```ts
const behaviors: Record<BlockKind, BlockBehavior> = {
  text:      { render: renderText,      editor: textEditor,   lod: textLod    },
  image:     { render: renderImage,     editor: imageEditor,  lod: imageLod   },
  video:     { render: renderVideo,     editor: null,         lod: videoLod   },
  link:      { render: renderLink,      editor: null,         lod: linkLod    },
  checklist: { render: renderChecklist, editor: checkEditor,  lod: checkLod   },
  idea:      { render: renderIdea,      editor: ideaEditor,   lod: ideaLod    },
  task_ref:  { render: renderTaskRef,   editor: null,         lod: taskLod    },
};
```

### Store topology (`src/store/canvas/`)
- `canvasStore` — activeCanvasId, viewport, selectedBlockIds, mode
- `blocksStore` — `{ byId, byCanvas, dirty }` + rbush R-tree
- `connectionsStore` — same shape
- `zonesStore` — `{ user: Zone[], autoHints: EphemeralZone[] }`
- `historyStore` — undo/redo ring buffer, cap 200
- `overlayStore` — which legacy overlay is active

**Perf rule:** each block subscribes via id-scoped selector. A-drag doesn't rerender B.

### IPC contract (`window.electronAPI.canvas.*`)
```ts
canvas = {
  list: (userId) => Promise<Canvas[]>,
  get: (id) => Promise<Canvas | null>,
  create: (partial) => Promise<Canvas>,
  update: (id, patch) => Promise<void>,
  softDelete: (id) => Promise<void>,

  listBlocks: (canvasId) => Promise<Block[]>,
  upsertBlock: (b) => Promise<void>,
  upsertBlocksBatch: (bs) => Promise<void>,
  softDeleteBlock: (id) => Promise<void>,
  softDeleteBlocksBatch: (ids) => Promise<void>,

  listConnections: (canvasId) => Promise<Connection[]>,
  upsertConnection: (c) => Promise<void>,
  softDeleteConnection: (id) => Promise<void>,

  listZones: (canvasId) => Promise<Zone[]>,
  upsertZone: (z) => Promise<void>,
  softDeleteZone: (id) => Promise<void>,

  unfurlLink: (url) => Promise<LinkContent>,
  exportCanvas: (id, format: 'json'|'png') => Promise<string>,
};
```

### Persistence cadence
- Optimistic store update → queue in `pendingWrites`
- Debounced flush every **400ms** → `upsertBlocksBatch`
- On beforeunload / canvas switch → force flush

---

## 7. Execution Loop

```
IDEA ──drag-to-zone──▶ TASK ──click Start──▶ FOCUS
  ▲                                            │
  └─────── FEEDBACK (auto-TextBlock) ◀────────┘
```

1. **Capture** — double-click empty canvas → IdeaBlock with cursor
2. **Promote** — right-drag Idea onto User Zone → creates Quoril task, block becomes TaskRefBlock
3. **Execute** — click Start on TaskRefBlock → `useFocusStore.startSession(taskId)` → canvas enters Focus Mode
4. **Feedback** — session end auto-creates a TextBlock connected to the TaskRef with summary
5. **Reflect** — feedback blocks form a spatial trail

---

## 8. Spatial Memory Reinforcement

- **Zone identity** — color + icon + pattern (dots/grid/noise/none)
- **Landmark blocks** — `is_landmark`, subtle glow, pinned in MetaCanvas
- **Layout stability** — auto-hints never move blocks
- **Trails** — recently touched blocks fade over 48h
- **Home viewport** — ⌘+H set, ⌘+0 return, per-canvas

---

## 9. Chunked Roadmap

Chunks are small, shippable units. Each ends in a working app state. No AI, no collab.

**Total: 14 chunks, ~7 weeks.**

### Chunk table

| # | Chunk | Size | Status |
|---|---|---|---|
| **Phase 0 — Foundation** | | | |
| C0.1 | Install deps + SQL migrations | 0.5d | Done (2026-04-22) |
| C0.2 | Main-process canvas repo + IPC | 0.5d | Done (2026-04-22) |
| C0.3 | Preload bridge + types + empty stores | 0.5d | Done (2026-04-22) |
| C0.4 | App-shell reframe: login → blank canvas | 1d | Done (2026-04-22) |
| C0.5 | MetaCanvas switcher | 0.5d | Done (2026-04-22) |
| **Phase 1 — Interaction MVP** | | | |
| C1.1 | Unified `<Block>` + Idea + Text (TipTap) | 2d | Done (2026-04-22) |
| C1.2 | Image behavior + smart paste | 1.5d | Done (2026-04-22) |
| C1.3 | Selection, move, resize, delete, duplicate | 1.5d | Done (2026-04-22) |
| C1.4 | Undo/redo + autosave + keyboard shortcuts | 1.5d | Done (2026-04-22) |
| **Phase 2 — Rich behaviors + Execution Loop** | | | |
| C2.1 | Link behavior + main-process unfurl | 1.5d | Not started |
| C2.2 | Video behavior (YouTube, LOD, LRU) | 2d | Not started |
| C2.3 | Checklist + TaskRef behaviors | 2d | Not started |
| C2.4 | Execution Loop end-to-end | 2d | Not started |
| **Phase 3 — Zones, Connections, Polish** | | | |
| C3.1 | User Zones (draw, color, icon, pattern) | 2d | Not started |
| C3.2 | Connections (three types + labels) | 1.5d | Not started |
| C3.3 | Landmarks + trails + home viewport | 1d | Not started |
| C3.4 | LOD + rbush culling + stress test | 2d | Not started |
| C3.5 | Ghost hints + canvas Focus Mode | 1d | Not started |
| C3.6 | Auto-zone hints (opt-in, subtle) | 1d | Not started |
| C3.7 | JSON + PNG export | 1d | Not started |

---

### Phase 0 — Foundation

#### C0.1 — Install deps + SQL migrations (0.5d)
**Do:**
- `npm i @xyflow/react @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-task-list @tiptap/extension-task-item open-graph-scraper density-clustering rbush html-to-image`
- Add canvas tables to `initDatabase()` in `electron/main/db.ts` (see §5)
- Run dev build → verify tables exist via sqlite browser
**Touch:** `package.json`, `electron/main/db.ts`
**Exit:** app still runs, new tables present.

#### C0.2 — Main-process canvas repo + IPC (0.5d)
**Do:**
- Create `electron/main/canvas/repo.ts` — canvasOps, blockOps, connectionOps, zoneOps (CRUD with JSON serialization of *_json fields)
- Create `electron/main/canvas/ipc.ts` — register all handlers under `canvas:*`, `block:*`, `conn:*`, `zone:*`
- Wire `canvas/ipc.ts` into `electron/main/index.ts`
**Touch:** `electron/main/canvas/*` (new), `electron/main/index.ts`
**Exit:** IPC handlers respond to test invocations from renderer devtools.

#### C0.3 — Preload bridge + types + empty stores (0.5d)
**Do:**
- Extend `electron/preload/index.ts` with `electronAPI.canvas.*` (see §6 IPC contract)
- Create `src/types/canvas.ts` (see §5)
- Create `src/store/canvas/` — empty skeletons for canvasStore, blocksStore, connectionsStore, zonesStore, historyStore, overlayStore
**Touch:** `electron/preload/index.ts`, `src/types/canvas.ts` (new), `src/store/canvas/*` (new)
**Exit:** `window.electronAPI.canvas.list(userId)` works from console.

#### C0.4 — App-shell reframe (1d)
**Do:**
- Create `src/components/canvas/CanvasApp.tsx` — new top-level shell
- Create `src/components/canvas/CanvasSurface.tsx` — empty `<ReactFlow>` with pan/zoom, cursor-anchored
- Modify `src/App.tsx` — logged-in users render `<CanvasApp />`; legacy `<Layout>` wrapped so it's only reachable via overlay
- Create `src/components/canvas/overlays/OverlayHost.tsx` + `SettingsOverlay.tsx`, `ReportsOverlay.tsx`, `PlannerOverlay.tsx`, `ScreenTimeOverlay.tsx` — thin wrappers around existing components
- Hotkey map: cmd-, → settings overlay, cmd-shift-P → planner overlay, etc.
**Touch:** `src/App.tsx`, `src/components/canvas/*` (new)
**Exit:** login lands on empty infinite canvas with working pan/zoom; existing features reachable via overlay hotkeys.

#### C0.5 — MetaCanvas switcher (0.5d)
**Do:**
- Create `src/components/canvas/MetaCanvas.tsx` — zoom-out tile view of all canvases
- If user has 0 canvases → auto-create "My Canvas" and enter it
- If user has 1 → enter it directly
- If >1 → show MetaCanvas; click tile animates zoom-in
**Touch:** `src/components/canvas/MetaCanvas.tsx` (new), `CanvasApp.tsx`
**Exit:** multiple canvases, spatial switching (no route-like nav).

---

### Phase 1 — Interaction MVP

#### C1.1 — Unified `<Block>` + Idea + Text behaviors (2d)
**Do:**
- Create `src/components/canvas/Block.tsx` — single renderer, dispatches to behavior by kind
- Create `src/components/canvas/behaviors/registry.ts` — dispatch table
- Create `behaviors/idea.ts` — styled sticky, 8 preset colors, optional lucide icon
- Create `behaviors/text.ts` — TipTap editor with StarterKit + Placeholder + TaskList + TaskItem
- Register `<Block>` as the only react-flow node type
- Double-click empty canvas → creates IdeaBlock at cursor with cursor inside
**Touch:** `src/components/canvas/Block.tsx`, `behaviors/*` (new)
**Exit:** user can double-click, write an idea, press `/` to swap to Text block.

#### C1.2 — Image behavior + smart paste (1.5d)
**Do:**
- `behaviors/image.ts` — render + resize handles
- Paste handler: detect clipboard image, plain text, URL
  - Image <1MB → base64 in content_json
  - Image >=1MB → write `<userData>/canvas-assets/<canvasId>/<uuid>.<ext>`, store path in src
  - URL → LinkBlock placeholder (unfurled in C2.1)
  - Text → TextBlock
- Drag-drop file onto canvas → ImageBlock
**Touch:** `behaviors/image.ts`, `hooks/useSmartPaste.ts`, `electron/main/canvas/repo.ts` (asset path helper)
**Exit:** paste an image + a URL + some text, all land as correct block kinds.

#### C1.3 — Selection, move, resize, delete, duplicate (1.5d)
**Do:**
- Multi-select marquee (react-flow built-in)
- Move with drag (world coords updated)
- Resize handles on selected blocks
- Delete key → soft-delete
- ⌘+D → duplicate selection (offset +20, +20)
- Selection toolbar above selection with kind-specific actions
**Touch:** `CanvasSurface.tsx`, `SelectionToolbar.tsx` (new)
**Exit:** all selection ops work smoothly on 50 mixed blocks.

#### C1.4 — Undo/redo + autosave + keyboard shortcuts (1.5d)
**Do:**
- `historyStore.ts` — command pattern, ring buffer cap 200, coalesce same-id moves within 500ms
- Commands: createBlock, deleteBlock, moveBlocks (batch), resizeBlock
- TipTap has its own history; canvas undo never enters text internals
- `hooks/useCanvasPersistence.ts` — 400ms debounced flush, force flush on beforeunload
- `hooks/useKeyboardShortcuts.ts` — ⌘Z/⌘⇧Z/⌘D/Delete/Space-pan/⌘0 fit/⌘1 100%/`/` picker
- `SlashMenu.tsx` — block kind picker
**Touch:** `historyStore.ts`, `hooks/*` (new), `SlashMenu.tsx` (new)
**Exit:** user brainstorms 200 blocks in 10 min without breaking flow, reload restores everything.

---

### Phase 2 — Rich Behaviors + Execution Loop

#### C2.1 — Link behavior + unfurl (1.5d)
**Do:**
- `electron/main/canvas/unfurl.ts` — `open-graph-scraper` with 5s timeout, cache to `link_previews` (24h TTL)
- `behaviors/link.ts` — card with favicon, title, description, hero image; click opens via `shell.openExternal`
- Paste URL → placeholder "Fetching..." → unfurl resolves → card populates
**Touch:** `electron/main/canvas/unfurl.ts` (new), `behaviors/link.ts` (new)
**Exit:** paste 5 URLs, all unfurl within 3s p95.

#### C2.2 — Video behavior (2d)
**Do:**
- `behaviors/video.ts` — YouTube only
- `zoom >= 0.6` → real iframe (youtube-nocookie) scaled by parent transform
- `0.4 <= zoom < 0.6` → `hqdefault.jpg` poster + play icon
- `zoom < 0.4` → poster, click does nothing (must zoom in)
- IntersectionObserver pauses off-viewport
- LRU cap: 8 live iframes across canvas
- Paste YouTube URL → VideoBlock (not LinkBlock)
**Touch:** `behaviors/video.ts` (new), smart-paste router
**Exit:** 10-video canvas, all pause off-screen, zoom transitions clean.

#### C2.3 — Checklist + TaskRef behaviors (2d)
**Do:**
- `behaviors/checklist.ts` — nested items, drag-reorder (@dnd-kit), % complete
- `behaviors/taskRef.ts`:
  - Inline picker searches Quoril tasks via existing `taskStore`
  - Renders: task title, list color chip, live `spent_s`, status dot
  - "Start" button → `useFocusStore.getState().startSession(taskId)`
  - Subscribes to taskStore for live updates
**Touch:** `behaviors/checklist.ts`, `behaviors/taskRef.ts` (new)
**Exit:** TaskRefBlock shows live timer, Start triggers real Quoril focus session.

#### C2.4 — Execution Loop end-to-end (2d)
**Do:**
- Right-drag IdeaBlock onto a User Zone (zones land in C3.1 — for now: onto any area tagged with a zone color)
  - Creates Quoril task in the nearest list (or prompts if ambiguous — see §16 open question)
  - Mutates block from 'idea' to 'task_ref' with linkedTaskId
- Hook focus-session-end event → auto-create TextBlock near the TaskRef with `"Worked Xm. ✓/·"` and a Connection from the TaskRef
- Canvas Focus Mode: when a focus session starts from a TaskRefBlock, fade non-related blocks to opacity 0.12 until session ends
**Touch:** `Execution Loop` cross-cutting — `behaviors/idea.ts`, `taskRef.ts`, `focusStore` listener, new `hooks/useExecutionLoop.ts`
**Exit:** 60-second demo video recordable: idea → task → focus → feedback.

---

### Phase 3 — Zones, Connections, Polish

#### C3.1 — User Zones (2d)
**Do:**
- Zone draw tool (press `Z`, drag rectangle) → creates Zone with default color
- Zone inspector (in-place, not overlay): name, color (palette), icon (lucide picker), pattern (none/dots/grid/noise)
- Zones render in a separate DOM layer behind react-flow, transformed with viewport
- Resize / move zone by dragging edges / body
**Touch:** `layers/ZoneLayer.tsx` (new), `toolbars/ZoneDrawTool.tsx` (new), `zonesStore.ts`
**Exit:** user draws 5 zones, each with distinct identity.

#### C3.2 — Connections (1.5d)
**Do:**
- Drag from node handle to another node → creates Connection
- Three kinds with distinct styles: reference (solid arrow), flow (dashed), dependency (thick)
- Double-click edge → inline label editor
- Edge reroute via midpoint handle
- Delete key on selected edge
**Touch:** `edges/ReferenceEdge.tsx`, `FlowEdge.tsx`, `DependencyEdge.tsx` (new)
**Exit:** all three edge kinds draw, label, reroute, delete.

#### C3.3 — Landmarks + trails + home viewport (1d)
**Do:**
- ⌘+L toggles `is_landmark` on selected block → subtle glow
- MetaCanvas overview shows landmark dots
- `last_touched_at` written on any block mutation
- `layers/TrailLayer.tsx` — recently touched blocks (<48h) get a fading highlight border
- ⌘+H saves current viewport as home; ⌘+0 returns to home
**Touch:** `TrailLayer.tsx` (new), block mutation reducers, canvasStore
**Exit:** visual memory cues feel natural, not noisy.

#### C3.4 — LOD + rbush culling + stress test (2d)
**Do:**
- `hooks/useViewportCulling.ts` — rbush R-tree over blocksStore, query 1.5x viewport, only those rendered
- `hooks/useLOD.ts` — three tiers:
  - `zoom >= 0.4` → full fidelity
  - `0.15 <= zoom < 0.4` → card mode (title + kind icon only, no iframes, TipTap read-only)
  - `zoom < 0.15` → map mode — single `<canvas>` layer of dots + zone rects, no per-block DOM
- Stress test: 5k-block generator command in dev, measure fps at each zoom level
**Touch:** `hooks/useViewportCulling.ts`, `useLOD.ts`, `layers/LODLayer.tsx` (new)
**Exit:** 5k-block canvas holds 60fps pan at any zoom.

#### C3.5 — Ghost hints + canvas Focus Mode (1d)
**Do:**
- `layers/GhostHints.tsx` — inline translucent hints near viewport edge based on dominant zone (rule-based: most common tag, recent edits)
- Canvas Focus Mode ⌘+. — fade non-selected (or non-zone) blocks to 0.12, dim non-touching edges
- Integrates with Quoril focusStore (Law 5)
**Touch:** `GhostHints.tsx`, `hooks/useFocusMode.ts`
**Exit:** hints feel ambient, not pushy; Focus Mode toggles cleanly.

#### C3.6 — Auto-zone hints (1d)
**Do:**
- `workers/clusterWorker.ts` — DBSCAN over block centroids, debounced 800ms
- Output: ephemeral zones in `zonesStore.autoHints`
- `ZoneLayer.tsx` renders auto-hints as subtle dotted outlines, only when `canvas.settings.autoZoneHints=true` AND `zoom < 0.5`
- Setting toggle: "Show zone hints" (default OFF — Law 4)
**Touch:** `workers/clusterWorker.ts` (new), `ZoneLayer.tsx`
**Exit:** hints appear only when opted in, never move anything.

#### C3.7 — JSON + PNG export (1d)
**Do:**
- `electron/main/canvas/export.ts`:
  - JSON: full canvas + blocks + connections + zones + schemaVersion; subset-compatible with JSONCanvas where possible
  - PNG: via `html-to-image` on the react-flow viewport or full content bounds
- Export triggered from settings overlay (per-canvas)
**Touch:** `electron/main/canvas/export.ts` (new), overlay wiring
**Exit:** user exports a canvas as JSON and PNG from a single dialog.

---

## 10. Critical Architectural Decisions

### A. Undo/redo — command pattern
Ring buffer cap 200; coalesce same-id moves within 500ms; TipTap own history for text internals.

### B. Text editor — TipTap
Extensions: StarterKit, Placeholder, TaskList, TaskItem.

### C. Video at zoom
- `zoom >= 0.6` → real iframe
- `0.4 <= zoom < 0.6` → poster
- `zoom < 0.4` → poster locked
- IntersectionObserver pauses off-viewport
- LRU cap: 8 live iframes

### D. 60fps rules
1. Pan mutates one parent `transform`; nodes don't rerender
2. Zustand selectors scoped per-block
3. All edges in one SVG layer
4. Spatial queries throttled to rAF
5. Workers: DBSCAN, PNG export, unfurl scheduling
6. No `console.log` in render paths

### E. Virtualization
- `@xyflow/react` `onlyRenderVisibleElements=true`
- rbush culler query by 1.5x viewport
- LOD three-tier
- Fallback if 10k fails: Pixi tile layer for `zoom<0.25` (3wk detour)

### F. Export
Phase 3: JSON + PNG.
JSON subset-compatible with JSONCanvas (Obsidian Canvas interop) = trust signal.

### G. Asset storage
Local only: `<userData>/canvas-assets/<canvasId>/<uuid>.<ext>`.
GC: on canvas hard-delete, rm assets folder; weekly orphan scan.

---

## 11. File Manifest

### New files
```
electron/main/canvas/
  repo.ts
  ipc.ts
  unfurl.ts
  export.ts

src/types/
  canvas.ts

src/store/canvas/
  canvasStore.ts
  blocksStore.ts
  connectionsStore.ts
  zonesStore.ts
  historyStore.ts
  overlayStore.ts

src/components/canvas/
  CanvasApp.tsx
  MetaCanvas.tsx
  CanvasSurface.tsx
  Block.tsx
  behaviors/
    text.ts
    image.ts
    video.ts
    link.ts
    checklist.ts
    idea.ts
    taskRef.ts
    registry.ts
  edges/
    ReferenceEdge.tsx
    FlowEdge.tsx
    DependencyEdge.tsx
  layers/
    ZoneLayer.tsx
    GhostHints.tsx
    TrailLayer.tsx
    LODLayer.tsx
  overlays/
    OverlayHost.tsx
    SettingsOverlay.tsx
    ReportsOverlay.tsx
    PlannerOverlay.tsx
    ScreenTimeOverlay.tsx
  toolbars/
    SelectionToolbar.tsx
    SlashMenu.tsx
    ZoneDrawTool.tsx
  hooks/
    useCanvasPersistence.ts
    useUndoRedo.ts
    useLOD.ts
    useSmartPaste.ts
    useKeyboardShortcuts.ts
    useViewportCulling.ts
    useExecutionLoop.ts
    useFocusMode.ts
  workers/
    clusterWorker.ts
```

### Modified files (additive only)
- `electron/main/db.ts` — add canvas tables in `initDatabase()` (~line 724)
- `electron/main/index.ts` — register canvas IPC handlers
- `electron/preload/index.ts` — add `electronAPI.canvas.*`
- `src/App.tsx` — logged-in users render `<CanvasApp />`

**Zero deletions. Zero breaking changes.**

---

## 12. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | react-flow fails at 10k nodes | Med | High | Stress test in C3.4. Fallback: Pixi tile layer |
| 2 | iframe scaling glitches | High | Med | Poster at <0.6; iframe never <0.4; LRU 8 |
| 3 | Auto-cluster quality feels dumb | High | Low | Opt-in hints only (Law 4) |
| 4 | Native-module CI matrix | Med | Med | Pre-existing pain; budget 2d before release |
| 5 | Scope creep on block kinds | High | Med | Hard-limit at 7 kinds |
| 6 | App-shell pivot disorients existing users | Med | High | Legacy overlays still work; onboarding tip on first canvas load |

---

## 13. Competitive Positioning

| Competitor | Weakness | We win |
|---|---|---|
| Notion | Trees can't express loose spatial relationships | Zones encode nuance without structure |
| Miro | No real docs; slow past 2k; no offline | Rich blocks + local-first + LOD |
| Obsidian Canvas | Read-only graph; no embeds first-class | Canvas is the workspace; live video/link/task |
| tldraw | Whiteboard for a session, not durable; SDK licensing | Durable, semantic, wired to execution |
| Excalidraw | Drawing tool | Structured blocks + connections + zones |

---

## 14. Decision Log

- **2026-04-22** — Adopted Five Laws. Canvas is app shell.
- **2026-04-22** — Picked `@xyflow/react`; rejected tldraw (license), Konva/Pixi (iframe tax).
- **2026-04-22** — TipTap over Lexical/ProseMirror/contenteditable.
- **2026-04-22** — User zones primary; auto zones = opt-in hints (Law 4).
- **2026-04-22** — One `<Block>` + behaviors dispatch (Law 3).
- **2026-04-22** — Execution Loop is the launch feature (Phase 2).
- **2026-04-22** — Name: Quoril (keep).
- **2026-04-22** — **AI and Collab explicitly out of scope.** No Yjs, no Supabase mirror for canvas, no embeddings, no LLM features. Local SQLite only. Revisit later if demanded.
- **2026-04-22** — Dropped `version` and `synced` columns from canvas tables (no sync needed).
- **2026-04-22** — Removed monetization gating plan until paid tiers become relevant.
- **2026-04-22** — Phase 0 (C0.1–C0.5) + Phase 1 (C1.1–C1.4) implemented. DB migration bumped to v10 with canvases/blocks/connections/zones/link_previews tables. Legacy routes moved under `/legacy/*` prefix; default route renders `<CanvasApp />`. Phase 2 deps (`open-graph-scraper`, `density-clustering`, `html-to-image`) deferred until their chunks.
- **2026-04-22** — Open-question resolutions adopted: first run auto-creates "My Canvas" and enters it; TrailLayer default ON (revisit in C3.3); TaskRef list-mapping deferred to C2.4.

---

## 15. Out of Scope (for now)

- Real-time collaboration (Yjs, presence cursors, shared canvases)
- Cloud sync of canvas data to Supabase
- AI features (zone naming, suggestions, semantic search, summaries)
- PDF export
- Multi-user share dialog
- Subscription billing / feature gates

These are not forbidden forever — just not in the current plan. Schema is compatible with adding them later (add `user_id`/`version`/`synced` columns and a mirror migration when needed).

---

## 16. Open Questions

- [ ] First run: auto-create "My Canvas" and land in it, or show MetaCanvas empty state? (**Recommendation:** auto-create with a single welcome IdeaBlock: "Double-click anywhere. Press / for options.")
- [ ] TaskRef promotion: drag Idea onto a User Zone → pick Quoril list by zone name mapping, or prompt? (**Recommendation:** if zone has a linked list, use it silently; else prompt once and remember.)
- [ ] TrailLayer default: on or off? (**Recommendation:** on, with setting to disable.)

---

## 17. How to Start a Work Session

1. Read §0 + §3 Five Laws + §9 chunk table (status column)
2. Find the next chunk marked "Not started"
3. Read that chunk's Do/Touch/Exit block
4. Consult §6 architecture + §11 file manifest before creating files
5. Re-check §10 before deviating from a decision
6. On completion: flip status to "Done", update this file's date, append to §14 if a decision changed

---

*Last updated: 2026-04-22 (Phase 0 + Phase 1 complete; next chunk: C2.1 Link unfurl)*
