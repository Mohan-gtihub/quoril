-- ============================================================
-- Migration: web_v1_workspaces_canvas
-- Adds workspaces and canvas family tables (canvases, blocks,
-- connections, zones) to Supabase, mirroring the Electron SQLite
-- schema with per-user Row-Level Security.
--
-- Apply manually in the Supabase SQL editor.
-- ============================================================


-- ============================================================
-- 1. WORKSPACES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
    -- The desktop SQLite store and app clients create UUID strings themselves.
    -- Keep this TEXT so all workspace reference columns share the same type.
    id           TEXT PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    color        TEXT DEFAULT '#6366f1',
    icon         TEXT DEFAULT 'briefcase',
    sort_order   INTEGER DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_deleted
    ON public.workspaces (user_id, deleted_at);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own workspaces"   ON public.workspaces;
CREATE POLICY "Users can view their own workspaces"          ON public.workspaces FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own workspaces" ON public.workspaces;
CREATE POLICY "Users can create their own workspaces"        ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own workspaces" ON public.workspaces;
CREATE POLICY "Users can update their own workspaces"        ON public.workspaces FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON public.workspaces;
CREATE POLICY "Users can delete their own workspaces"        ON public.workspaces FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

-- Lists originate in supabase_setup.sql. Workspace collaboration relies on
-- this column, so it belongs in the base web/workspace migration rather than
-- a later policy-only delta.
ALTER TABLE public.lists
    ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lists_workspace_deleted
    ON public.lists (workspace_id, deleted_at);


-- ============================================================
-- 2. CANVASES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.canvases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- workspaces.id is TEXT in the existing schema, so this column must be TEXT to
    -- form the FK (whiteboards leave it null anyway).
    workspace_id        TEXT REFERENCES public.workspaces(id) ON DELETE SET NULL,
    title               TEXT NOT NULL DEFAULT 'Untitled',
    icon                TEXT,
    color               TEXT,
    viewport_json       JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
    home_viewport_json  JSONB,
    settings_json       JSONB NOT NULL DEFAULT '{"grid":true,"snap":false,"autoZoneHints":false}',
    schema_version      INTEGER DEFAULT 1,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_canvases_user_deleted
    ON public.canvases (user_id, deleted_at);

ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own canvases"    ON public.canvases;
CREATE POLICY "Users can view their own canvases"           ON public.canvases FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own canvases"  ON public.canvases;
CREATE POLICY "Users can create their own canvases"         ON public.canvases FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own canvases"  ON public.canvases;
CREATE POLICY "Users can update their own canvases"         ON public.canvases FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own canvases"  ON public.canvases;
CREATE POLICY "Users can delete their own canvases"         ON public.canvases FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.canvases TO authenticated;
GRANT ALL ON public.canvases TO service_role;


-- ============================================================
-- 3. BLOCKS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id       UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind            TEXT NOT NULL,
    x               NUMERIC NOT NULL DEFAULT 0,
    y               NUMERIC NOT NULL DEFAULT 0,
    w               NUMERIC NOT NULL DEFAULT 100,
    h               NUMERIC NOT NULL DEFAULT 60,
    z               INTEGER DEFAULT 0,
    rotation        NUMERIC DEFAULT 0,
    content_json    JSONB NOT NULL DEFAULT '{}',
    style_json      JSONB,
    tags_json       JSONB,
    linked_task_id  UUID,
    is_landmark     BOOLEAN DEFAULT false,
    last_touched_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_blocks_canvas_id
    ON public.blocks (canvas_id);
CREATE INDEX IF NOT EXISTS idx_blocks_canvas_deleted
    ON public.blocks (canvas_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_blocks_linked_task
    ON public.blocks (linked_task_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocks"    ON public.blocks;
CREATE POLICY "Users can view their own blocks"           ON public.blocks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own blocks"  ON public.blocks;
CREATE POLICY "Users can create their own blocks"         ON public.blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own blocks"  ON public.blocks;
CREATE POLICY "Users can update their own blocks"         ON public.blocks FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own blocks"  ON public.blocks;
CREATE POLICY "Users can delete their own blocks"         ON public.blocks FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;


-- ============================================================
-- 4. CONNECTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id       UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_block_id   UUID NOT NULL,
    to_block_id     UUID NOT NULL,
    from_anchor     TEXT DEFAULT 'auto',
    to_anchor       TEXT DEFAULT 'auto',
    kind            TEXT DEFAULT 'reference',
    label           TEXT,
    style_json      JSONB,
    condition_json  JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_connections_canvas_id
    ON public.connections (canvas_id);
CREATE INDEX IF NOT EXISTS idx_connections_canvas_deleted
    ON public.connections (canvas_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_connections_from_block
    ON public.connections (from_block_id);
CREATE INDEX IF NOT EXISTS idx_connections_to_block
    ON public.connections (to_block_id);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own connections"    ON public.connections;
CREATE POLICY "Users can view their own connections"           ON public.connections FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own connections"  ON public.connections;
CREATE POLICY "Users can create their own connections"         ON public.connections FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own connections"  ON public.connections;
CREATE POLICY "Users can update their own connections"         ON public.connections FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own connections"  ON public.connections;
CREATE POLICY "Users can delete their own connections"         ON public.connections FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;


-- ============================================================
-- 5. ZONES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.zones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id   UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT DEFAULT '',
    color       TEXT,
    icon        TEXT,
    pattern     TEXT DEFAULT 'none',
    bounds_json JSONB NOT NULL DEFAULT '{"x":0,"y":0,"w":0,"h":0}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_zones_canvas_id
    ON public.zones (canvas_id);
CREATE INDEX IF NOT EXISTS idx_zones_canvas_deleted
    ON public.zones (canvas_id, deleted_at);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own zones"    ON public.zones;
CREATE POLICY "Users can view their own zones"           ON public.zones FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own zones"  ON public.zones;
CREATE POLICY "Users can create their own zones"         ON public.zones FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own zones"  ON public.zones;
CREATE POLICY "Users can update their own zones"         ON public.zones FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own zones"  ON public.zones;
CREATE POLICY "Users can delete their own zones"         ON public.zones FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.zones TO authenticated;
GRANT ALL ON public.zones TO service_role;


-- ============================================================
-- Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload config';
