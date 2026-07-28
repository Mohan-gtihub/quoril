-- ============================================================
-- Migration: web_realtime_canvas
-- Enables Supabase Realtime for whiteboard data so a change made on
-- one device is pushed to other signed-in devices near-instantly.
--
-- The desktop app pushes local edits to the cloud on its normal ~10s
-- sync interval; this publication makes the OTHER device receive a
-- postgres_changes event and reload the affected scene.
--
-- RLS still applies to realtime: each client only receives rows where
-- auth.uid() = user_id (policies defined in web_v1_workspaces_canvas.sql).
--
-- Apply manually in the Supabase SQL editor.
-- ============================================================

-- Add the canvas tables to the realtime publication. Wrapped so re-running
-- is safe even if a table was already added.
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
END $$;

-- Realtime UPDATE/DELETE events only carry the changed columns unless the
-- table replicates the full previous row. The client re-fetches the row by id
-- anyway (scenes with inline images exceed the realtime payload cap), so the
-- default REPLICA IDENTITY is sufficient — no change needed.

NOTIFY pgrst, 'reload config';
