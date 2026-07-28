-- ============================================================
-- Quoril Canvas realtime collaboration
--
-- Apply in the Supabase SQL editor after canvas_collaboration.sql.
-- This migration is idempotent and works with Supabase's Free plan:
-- it uses Realtime Broadcast + Presence and the existing blocks table.
-- ============================================================

-- Owners and editors may change the scene; viewers remain read-only.
CREATE OR REPLACE FUNCTION public.canvas_is_editable(c_id UUID)
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
                    AND cm.role = 'editor'
                    AND lower(cm.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
              )
          )
    );
$$;

GRANT EXECUTE ON FUNCTION public.canvas_is_editable(UUID) TO authenticated;

-- Scene snapshots always retain the canvas owner's user_id. Editors can
-- insert/update that row, but cannot move it to another owner or canvas.
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can view accessible blocks" ON public.blocks;
CREATE POLICY "Users can view accessible blocks"
    ON public.blocks
    FOR SELECT
    TO authenticated
    USING (public.canvas_is_accessible(canvas_id));

DROP POLICY IF EXISTS "Users can create their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can create accessible blocks" ON public.blocks;
DROP POLICY IF EXISTS "Canvas editors can create scene snapshots" ON public.blocks;
CREATE POLICY "Canvas editors can create scene snapshots"
    ON public.blocks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.canvas_is_editable(canvas_id)
        AND EXISTS (
            SELECT 1
            FROM public.canvases c
            WHERE c.id = blocks.canvas_id
              AND c.user_id = blocks.user_id
              AND c.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Users can update their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can update accessible blocks" ON public.blocks;
DROP POLICY IF EXISTS "Canvas editors can update scene snapshots" ON public.blocks;
CREATE POLICY "Canvas editors can update scene snapshots"
    ON public.blocks
    FOR UPDATE
    TO authenticated
    USING (public.canvas_is_editable(canvas_id))
    WITH CHECK (
        public.canvas_is_editable(canvas_id)
        AND EXISTS (
            SELECT 1
            FROM public.canvases c
            WHERE c.id = blocks.canvas_id
              AND c.user_id = blocks.user_id
              AND c.deleted_at IS NULL
        )
    );

-- Helpers for private Realtime channel authorization. Channel names are
-- canvas:<uuid>; malformed or unrelated topics are rejected.
CREATE OR REPLACE FUNCTION public.canvas_topic_is_accessible(topic_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN topic_name ~* '^canvas:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN public.canvas_is_accessible(split_part(topic_name, ':', 2)::UUID)
        ELSE FALSE
    END;
$$;

CREATE OR REPLACE FUNCTION public.canvas_topic_is_editable(topic_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN topic_name ~* '^canvas:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN public.canvas_is_editable(split_part(topic_name, ':', 2)::UUID)
        ELSE FALSE
    END;
$$;

GRANT EXECUTE ON FUNCTION public.canvas_topic_is_accessible(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.canvas_topic_is_editable(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Canvas participants can receive realtime events" ON realtime.messages;
CREATE POLICY "Canvas participants can receive realtime events"
    ON realtime.messages
    FOR SELECT
    TO authenticated
    USING (
        extension IN ('broadcast', 'presence')
        AND public.canvas_topic_is_accessible(realtime.topic())
    );

DROP POLICY IF EXISTS "Canvas participants can send realtime events" ON realtime.messages;
CREATE POLICY "Canvas participants can send realtime events"
    ON realtime.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        extension IN ('broadcast', 'presence')
        AND (
            (extension = 'presence' AND public.canvas_topic_is_accessible(realtime.topic()))
            OR (extension = 'broadcast' AND public.canvas_topic_is_editable(realtime.topic()))
        )
    );

-- Postgres-change events back up Broadcast and keep the board/share lists
-- current. Duplicate-object handling keeps re-runs safe.
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.canvases;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
