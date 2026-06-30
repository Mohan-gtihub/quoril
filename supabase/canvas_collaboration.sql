-- ============================================================
-- Canvas collaboration
-- Adds email-based per-canvas members and RLS for sharing a single
-- whiteboard (canvas) with another user — independent of workspace
-- sharing. Mirrors workspace_collaboration.sql.
--
-- The whole Excalidraw scene is stored as ONE row in public.blocks
-- (block.id = canvas.id), so sharing a canvas = granting access to the
-- canvases row + its scene block. Canvas metadata (rename/delete) stays
-- owner-only; members get editor access to the scene only.
--
-- Apply manually in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.canvas_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id   UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
    invited_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    UNIQUE (canvas_id, email)
);

CREATE INDEX IF NOT EXISTS idx_canvas_members_canvas
    ON public.canvas_members (canvas_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_canvas_members_email
    ON public.canvas_members (lower(email), deleted_at);

ALTER TABLE public.canvas_members ENABLE ROW LEVEL SECURITY;

-- True when the current user owns the canvas OR is an accepted member by email.
CREATE OR REPLACE FUNCTION public.canvas_is_accessible(c_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.canvases c
        WHERE c.id = c_id
          AND c.deleted_at IS NULL
          AND (
              c.user_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.canvas_members cm
                  WHERE cm.canvas_id = c_id
                    AND cm.deleted_at IS NULL
                    AND cm.accepted_at IS NOT NULL
                    AND lower(cm.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
              )
          )
    );
$$;

-- ---- canvas_members policies ----

DROP POLICY IF EXISTS "Canvas owners can manage members" ON public.canvas_members;
CREATE POLICY "Canvas owners can manage members"
    ON public.canvas_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.canvases c
            WHERE c.id = canvas_members.canvas_id
              AND c.user_id = auth.uid()
              AND c.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.canvases c
            WHERE c.id = canvas_members.canvas_id
              AND c.user_id = auth.uid()
              AND c.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Canvas members can view own memberships" ON public.canvas_members;
CREATE POLICY "Canvas members can view own memberships"
    ON public.canvas_members
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    );

-- ---- canvases: widen SELECT to include shared canvases ----
-- (rename/delete/update stay owner-only via the existing policies)

DROP POLICY IF EXISTS "Users can view their own canvases" ON public.canvases;
DROP POLICY IF EXISTS "Users can view accessible canvases" ON public.canvases;
CREATE POLICY "Users can view accessible canvases"
    ON public.canvases
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            auth.uid() = user_id
            OR public.canvas_is_accessible(id)
        )
    );

-- ---- blocks: members get full access to the shared canvas's scene ----

DROP POLICY IF EXISTS "Users can view their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can view accessible blocks" ON public.blocks;
CREATE POLICY "Users can view accessible blocks"
    ON public.blocks
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.canvas_is_accessible(canvas_id)
    );

DROP POLICY IF EXISTS "Users can create their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can create accessible blocks" ON public.blocks;
CREATE POLICY "Users can create accessible blocks"
    ON public.blocks
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR public.canvas_is_accessible(canvas_id)
    );

DROP POLICY IF EXISTS "Users can update their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can update accessible blocks" ON public.blocks;
CREATE POLICY "Users can update accessible blocks"
    ON public.blocks
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR public.canvas_is_accessible(canvas_id)
    )
    WITH CHECK (
        auth.uid() = user_id
        OR public.canvas_is_accessible(canvas_id)
    );

GRANT ALL ON public.canvas_members TO authenticated;
GRANT ALL ON public.canvas_members TO service_role;

NOTIFY pgrst, 'reload schema';
