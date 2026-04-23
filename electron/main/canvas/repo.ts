import { dbOps } from '../db'

const exec = dbOps.exec

function now() { return new Date().toISOString() }

type Row = Record<string, any>

function parseJSON<T>(s: any, fallback: T): T {
    if (s == null) return fallback
    try { return JSON.parse(s) } catch { return fallback }
}

function hydrateCanvas(r: Row) {
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

function hydrateBlock(r: Row) {
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

function hydrateConnection(r: Row) {
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

function hydrateZone(r: Row) {
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

/* ---------------- canvases ---------------- */

export const canvasOps = {
    list(userId: string) {
        const rows = exec(
            'SELECT * FROM canvases WHERE user_id=? AND deleted_at IS NULL ORDER BY updated_at DESC',
            [userId]
        ) as Row[]
        return (rows || []).map(hydrateCanvas)
    },
    get(id: string) {
        const rows = exec('SELECT * FROM canvases WHERE id=?', [id]) as Row[]
        return rows && rows[0] ? hydrateCanvas(rows[0]) : null
    },
    create(c: any) {
        const ts = now()
        const row = {
            id: c.id,
            user_id: c.userId,
            workspace_id: c.workspaceId ?? null,
            title: c.title ?? 'Untitled',
            icon: c.icon ?? null,
            color: c.color ?? null,
            viewport_json: JSON.stringify(c.viewport ?? { x: 0, y: 0, zoom: 1 }),
            home_viewport_json: c.homeViewport ? JSON.stringify(c.homeViewport) : null,
            settings_json: JSON.stringify(c.settings ?? { grid: true, snap: false, autoZoneHints: false }),
            schema_version: c.schemaVersion ?? 1,
            created_at: c.createdAt ?? ts,
            updated_at: ts,
            deleted_at: null,
        }
        const cols = Object.keys(row)
        exec(
            `INSERT OR REPLACE INTO canvases (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            Object.values(row)
        )
        return canvasOps.get(c.id)!
    },
    update(id: string, patch: any) {
        const current = canvasOps.get(id)
        if (!current) return
        const merged = { ...current, ...patch }
        canvasOps.create({ ...merged, createdAt: current.createdAt })
    },
    softDelete(id: string) {
        exec('UPDATE canvases SET deleted_at=?, updated_at=? WHERE id=?', [now(), now(), id])
    },
}

/* ---------------- blocks ---------------- */

const finite = (v: any, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

function blockRow(b: any, ts: string) {
    return {
        id: b.id,
        canvas_id: b.canvasId,
        user_id: b.userId,
        kind: b.kind,
        x: finite(b.x), y: finite(b.y), w: finite(b.w, 100), h: finite(b.h, 60),
        z: b.z ?? 0,
        rotation: b.rotation ?? 0,
        content_json: JSON.stringify(b.content ?? { kind: b.kind, data: {} }),
        style_json: b.style ? JSON.stringify(b.style) : null,
        tags_json: b.tags ? JSON.stringify(b.tags) : null,
        linked_task_id: b.linkedTaskId ?? null,
        is_landmark: b.isLandmark ? 1 : 0,
        last_touched_at: b.lastTouchedAt ?? ts,
        created_at: b.createdAt ?? ts,
        updated_at: ts,
        deleted_at: b.deletedAt ?? null,
    }
}

export const blockOps = {
    list(canvasId: string) {
        const rows = exec(
            'SELECT * FROM blocks WHERE canvas_id=? AND deleted_at IS NULL ORDER BY z ASC, created_at ASC',
            [canvasId]
        ) as Row[]
        return (rows || []).map(hydrateBlock)
    },
    upsert(b: any) {
        const row = blockRow(b, now())
        const cols = Object.keys(row)
        exec(
            `INSERT OR REPLACE INTO blocks (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            Object.values(row)
        )
    },
    upsertBatch(bs: any[]) {
        if (!bs || bs.length === 0) return
        const ts = now()
        for (const b of bs) {
            const row = blockRow(b, ts)
            const cols = Object.keys(row)
            exec(
                `INSERT OR REPLACE INTO blocks (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
                Object.values(row)
            )
        }
    },
    softDelete(id: string) {
        const ts = now()
        exec('UPDATE blocks SET deleted_at=?, updated_at=? WHERE id=?', [ts, ts, id])
    },
    softDeleteBatch(ids: string[]) {
        const ts = now()
        for (const id of ids) {
            exec('UPDATE blocks SET deleted_at=?, updated_at=? WHERE id=?', [ts, ts, id])
        }
    },
}

/* ---------------- connections ---------------- */

export const connectionOps = {
    list(canvasId: string) {
        const rows = exec(
            'SELECT * FROM connections WHERE canvas_id=? AND deleted_at IS NULL',
            [canvasId]
        ) as Row[]
        return (rows || []).map(hydrateConnection)
    },
    upsert(c: any) {
        const ts = now()
        const row = {
            id: c.id,
            canvas_id: c.canvasId,
            user_id: c.userId,
            from_block_id: c.fromBlockId,
            to_block_id: c.toBlockId,
            from_anchor: c.fromAnchor ?? 'auto',
            to_anchor: c.toAnchor ?? 'auto',
            kind: c.kind ?? 'reference',
            label: c.label ?? null,
            style_json: c.style ? JSON.stringify(c.style) : null,
            condition_json: c.condition ? JSON.stringify(c.condition) : null,
            created_at: c.createdAt ?? ts,
            updated_at: ts,
            deleted_at: c.deletedAt ?? null,
        }
        const cols = Object.keys(row)
        exec(
            `INSERT OR REPLACE INTO connections (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            Object.values(row)
        )
    },
    softDelete(id: string) {
        const ts = now()
        exec('UPDATE connections SET deleted_at=?, updated_at=? WHERE id=?', [ts, ts, id])
    },
}

/* ---------------- zones ---------------- */

export const zoneOps = {
    list(canvasId: string) {
        const rows = exec(
            'SELECT * FROM zones WHERE canvas_id=? AND deleted_at IS NULL',
            [canvasId]
        ) as Row[]
        return (rows || []).map(hydrateZone)
    },
    upsert(z: any) {
        const ts = now()
        const row = {
            id: z.id,
            canvas_id: z.canvasId,
            user_id: z.userId,
            name: z.name ?? '',
            color: z.color ?? null,
            icon: z.icon ?? null,
            pattern: z.pattern ?? 'none',
            bounds_json: JSON.stringify(z.bounds ?? { x: 0, y: 0, w: 0, h: 0 }),
            created_at: z.createdAt ?? ts,
            updated_at: ts,
            deleted_at: z.deletedAt ?? null,
        }
        const cols = Object.keys(row)
        exec(
            `INSERT OR REPLACE INTO zones (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            Object.values(row)
        )
    },
    softDelete(id: string) {
        const ts = now()
        exec('UPDATE zones SET deleted_at=?, updated_at=? WHERE id=?', [ts, ts, id])
    },
}
