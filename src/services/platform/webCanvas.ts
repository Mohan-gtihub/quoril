import type { CanvasPort } from './types'
import { supabase } from '@/services/supabase'

// Cast to any to bypass strict Supabase generated-types for tables not in the schema file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function now() { return new Date().toISOString() }

function parseJSON<T>(s: any, fallback: T): T {
  if (s == null) return fallback
  if (typeof s === 'object') return s as T  // Supabase returns JSONB as already-parsed objects
  try { return JSON.parse(s) } catch { return fallback }
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/* ---- hydration (mirrors electron/main/canvas/repo.ts) ---- */

function hydrateCanvas(r: any) {
  return {
    id: r.id,
    userId: r.user_id,
    workspaceId: r.workspace_id ?? null,
    title: r.title,
    icon: r.icon ?? undefined,
    color: r.color ?? undefined,
    viewport: parseJSON(r.viewport_json, { x: 0, y: 0, zoom: 1 }),
    homeViewport: parseJSON(r.home_viewport_json, undefined as any),
    settings: parseJSON(r.settings_json, { grid: true, snap: false, autoZoneHints: false }),
    schemaVersion: r.schema_version ?? 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
  }
}

function hydrateBlock(r: any) {
  return {
    id: r.id,
    canvasId: r.canvas_id,
    userId: r.user_id,
    kind: r.kind,
    x: r.x, y: r.y, w: r.w, h: r.h,
    z: r.z ?? 0,
    rotation: r.rotation ?? 0,
    content: parseJSON(r.content_json, { kind: r.kind, data: {} }),
    style: parseJSON(r.style_json, undefined as any),
    tags: parseJSON(r.tags_json, undefined as any),
    linkedTaskId: r.linked_task_id ?? null,
    isLandmark: !!r.is_landmark,
    lastTouchedAt: r.last_touched_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
  }
}

function hydrateConnection(r: any) {
  return {
    id: r.id,
    canvasId: r.canvas_id,
    userId: r.user_id,
    fromBlockId: r.from_block_id,
    toBlockId: r.to_block_id,
    fromAnchor: r.from_anchor ?? 'auto',
    toAnchor: r.to_anchor ?? 'auto',
    kind: r.kind ?? 'reference',
    label: r.label ?? undefined,
    style: parseJSON(r.style_json, undefined as any),
    condition: parseJSON(r.condition_json, undefined as any),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
  }
}

function hydrateZone(r: any) {
  return {
    id: r.id,
    canvasId: r.canvas_id,
    userId: r.user_id,
    name: r.name ?? '',
    color: r.color ?? undefined,
    icon: r.icon ?? undefined,
    pattern: r.pattern ?? 'none',
    bounds: parseJSON(r.bounds_json, { x: 0, y: 0, w: 0, h: 0 }),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
  }
}

/* ---- CanvasPort implementation ---- */

export const webCanvas: CanvasPort = {
  async list(userId) {
    const { data } = await db
      .from('canvases')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
    return (data ?? []).map(hydrateCanvas)
  },

  async get(id) {
    const { data } = await db
      .from('canvases')
      .select('*')
      .eq('id', id)
      .single()
    return data ? hydrateCanvas(data) : null
  },

  async create(c) {
    const userId = await getUserId()
    const ts = now()
    const row = {
      id: c.id,
      user_id: c.userId ?? userId,
      workspace_id: c.workspaceId ?? null,
      title: c.title ?? 'Untitled',
      icon: c.icon ?? null,
      color: c.color ?? null,
      viewport_json: c.viewport ?? { x: 0, y: 0, zoom: 1 },
      home_viewport_json: c.homeViewport ?? null,
      settings_json: c.settings ?? { grid: true, snap: false, autoZoneHints: false },
      schema_version: c.schemaVersion ?? 1,
      created_at: c.createdAt ?? ts,
      updated_at: ts,
      deleted_at: null,
    }
    const { data } = await db.from('canvases').upsert(row, { onConflict: 'id' }).select().single()
    return data ? hydrateCanvas(data) : null
  },

  async update(id, patch) {
    const existing = await webCanvas.get(id)
    if (!existing) return
    return webCanvas.create({ ...existing, ...patch, id, createdAt: existing.createdAt })
  },

  async softDelete(id) {
    const ts = now()
    await db.from('canvases').update({ deleted_at: ts, updated_at: ts }).eq('id', id)
  },

  async listBlocks(canvasId) {
    const { data } = await db
      .from('blocks')
      .select('*')
      .eq('canvas_id', canvasId)
      .is('deleted_at', null)
      .order('z', { ascending: true })
      .order('created_at', { ascending: true })
    return (data ?? []).map(hydrateBlock)
  },

  async upsertBlock(b) {
    const userId = await getUserId()
    const ts = now()
    const finite = (v: any, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
    const row = {
      id: b.id,
      canvas_id: b.canvasId,
      user_id: b.userId ?? userId,
      kind: b.kind,
      x: finite(b.x), y: finite(b.y), w: finite(b.w, 100), h: finite(b.h, 60),
      z: b.z ?? 0,
      rotation: b.rotation ?? 0,
      content_json: b.content ?? { kind: b.kind, data: {} },
      style_json: b.style ?? null,
      tags_json: b.tags ?? null,
      linked_task_id: b.linkedTaskId ?? null,
      is_landmark: b.isLandmark ?? false,
      last_touched_at: b.lastTouchedAt ?? ts,
      created_at: b.createdAt ?? ts,
      updated_at: ts,
      deleted_at: b.deletedAt ?? null,
    }
    const { data } = await db.from('blocks').upsert(row, { onConflict: 'id' }).select().single()
    return data ? hydrateBlock(data) : null
  },

  async upsertBlocksBatch(bs) {
    if (!bs || bs.length === 0) return
    const userId = await getUserId()
    const ts = now()
    const finite = (v: any, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
    const rows = bs.map((b: any) => ({
      id: b.id,
      canvas_id: b.canvasId,
      user_id: b.userId ?? userId,
      kind: b.kind,
      x: finite(b.x), y: finite(b.y), w: finite(b.w, 100), h: finite(b.h, 60),
      z: b.z ?? 0,
      rotation: b.rotation ?? 0,
      content_json: b.content ?? { kind: b.kind, data: {} },
      style_json: b.style ?? null,
      tags_json: b.tags ?? null,
      linked_task_id: b.linkedTaskId ?? null,
      is_landmark: b.isLandmark ?? false,
      last_touched_at: b.lastTouchedAt ?? ts,
      created_at: b.createdAt ?? ts,
      updated_at: ts,
      deleted_at: b.deletedAt ?? null,
    }))
    await db.from('blocks').upsert(rows, { onConflict: 'id' })
  },

  async softDeleteBlock(id) {
    const ts = now()
    await db.from('blocks').update({ deleted_at: ts, updated_at: ts }).eq('id', id)
  },

  async softDeleteBlocksBatch(ids) {
    if (!ids || ids.length === 0) return
    const ts = now()
    await db.from('blocks').update({ deleted_at: ts, updated_at: ts }).in('id', ids)
  },

  async listConnections(canvasId) {
    const { data } = await db
      .from('connections')
      .select('*')
      .eq('canvas_id', canvasId)
      .is('deleted_at', null)
    return (data ?? []).map(hydrateConnection)
  },

  async upsertConnection(c) {
    const userId = await getUserId()
    const ts = now()
    const row = {
      id: c.id,
      canvas_id: c.canvasId,
      user_id: c.userId ?? userId,
      from_block_id: c.fromBlockId,
      to_block_id: c.toBlockId,
      from_anchor: c.fromAnchor ?? 'auto',
      to_anchor: c.toAnchor ?? 'auto',
      kind: c.kind ?? 'reference',
      label: c.label ?? null,
      style_json: c.style ?? null,
      condition_json: c.condition ?? null,
      created_at: c.createdAt ?? ts,
      updated_at: ts,
      deleted_at: c.deletedAt ?? null,
    }
    const { data } = await db.from('connections').upsert(row, { onConflict: 'id' }).select().single()
    return data ? hydrateConnection(data) : null
  },

  async softDeleteConnection(id) {
    const ts = now()
    await db.from('connections').update({ deleted_at: ts, updated_at: ts }).eq('id', id)
  },

  async listZones(canvasId) {
    const { data } = await db
      .from('zones')
      .select('*')
      .eq('canvas_id', canvasId)
      .is('deleted_at', null)
    return (data ?? []).map(hydrateZone)
  },

  async upsertZone(z) {
    const userId = await getUserId()
    const ts = now()
    const row = {
      id: z.id,
      canvas_id: z.canvasId,
      user_id: z.userId ?? userId,
      name: z.name ?? '',
      color: z.color ?? null,
      icon: z.icon ?? null,
      pattern: z.pattern ?? 'none',
      bounds_json: z.bounds ?? { x: 0, y: 0, w: 0, h: 0 },
      created_at: z.createdAt ?? ts,
      updated_at: ts,
      deleted_at: z.deletedAt ?? null,
    }
    const { data } = await db.from('zones').upsert(row, { onConflict: 'id' }).select().single()
    return data ? hydrateZone(data) : null
  },

  async softDeleteZone(id) {
    const ts = now()
    await db.from('zones').update({ deleted_at: ts, updated_at: ts }).eq('id', id)
  },

  async unfurlLink(url) {
    // Cross-origin fetching is not reliable on web; return a minimal safe preview.
    return { url, title: url, description: '', image: undefined, siteName: undefined, fetchedAt: Date.now() }
  },
}
