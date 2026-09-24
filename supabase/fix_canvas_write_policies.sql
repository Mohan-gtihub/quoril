-- Fix: 403 on POST /rest/v1/canvases?on_conflict=id (and the same class of
-- failure on blocks).
--
-- Symptom: the desktop sync push fails every cycle at
-- dataSyncService.ts:478 with PostgreSQL 42501. Sync retries forever.
--
-- Cause: canvas_collaboration.sql:100-109 replaced the canvases SELECT policy
-- to add `deleted_at IS NULL` plus a shared-access branch, but left the
-- INSERT/UPDATE/DELETE policies at the original bare `auth.uid() = user_id`
-- (web_v1_workspaces_canvas.sql:86-90). An upsert lands on INSERT ... ON
-- CONFLICT DO UPDATE, so an existing row is evaluated against the UPDATE
-- policy. Two rows now fail that the client legitimately pushes:
--
--   1. Soft-deleted rows. The client includes deleted_at in the payload
--      (dataSyncService.ts:639), but the new SELECT policy hides
--      deleted_at IS NOT NULL rows, so the UPDATE cannot see its target.
--   2. Shared canvases. canvas_is_accessible lets a member pull the row into
--      the local store; sync then pushes it back and the owner-only UPDATE
--      policy rejects it.
--
-- Fix: make the write policies agree with the read policy. Owners keep full
-- control including soft-delete; editors (per canvas_is_editable) may update
-- the scene but may not create or hard-delete.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- canvases
-- ---------------------------------------------------------------------------

-- INSERT stays owner-only: you may only create canvases you own.
DROP POLICY IF EXISTS "Users can create their own canvases" ON public.canvases;
CREATE POLICY "Users can create their own canvases"
    ON public.canvases
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE widens to editors, and drops the deleted_at filter so soft-deletes
-- and un-deletes both work. WITH CHECK is stated explicitly rather than
-- inherited from USING, and it forbids reassigning user_id to someone else.
DROP POLICY IF EXISTS "Users can update their own canvases" ON public.canvases;
DROP POLICY IF EXISTS "Users can update accessible canvases" ON public.canvases;
CREATE POLICY "Users can update accessible canvases"
    ON public.canvases
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.canvas_is_editable(id)
    )
    WITH CHECK (
        auth.uid() = user_id
        OR public.canvas_is_editable(id)
    );

-- DELETE stays owner-only. Note the app soft-deletes via UPDATE; this covers
-- hard deletes only.
DROP POLICY IF EXISTS "Users can delete their own canvases" ON public.canvases;
CREATE POLICY "Users can delete their own canvases"
    ON public.canvases
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- blocks — same asymmetry, same fix
-- ---------------------------------------------------------------------------
-- blocks are pushed in the same sync pass (SYNC_ORDER, dataSyncService.ts:10-19)
-- and their SELECT policy was widened alongside canvases, so the write side
-- has the identical mismatch.

DROP POLICY IF EXISTS "Users can create their own blocks" ON public.blocks;
CREATE POLICY "Users can create their own blocks"
    ON public.blocks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        OR public.canvas_is_editable(canvas_id)
    );

DROP POLICY IF EXISTS "Users can update their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can update accessible blocks" ON public.blocks;
CREATE POLICY "Users can update accessible blocks"
    ON public.blocks
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.canvas_is_editable(canvas_id)
    )
    WITH CHECK (
        auth.uid() = user_id
        OR public.canvas_is_editable(canvas_id)
    );

DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.blocks;
CREATE POLICY "Users can delete accessible blocks"
    ON public.blocks
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.canvas_is_editable(canvas_id)
    );

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Every canvases/blocks policy, with its USING and WITH CHECK expressions.
-- Confirm each FOR UPDATE row has a non-null with_check.
--
-- SELECT tablename, policyname, cmd, qual AS using_expr, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('canvases', 'blocks')
-- ORDER BY tablename, cmd, policyname;
