-- Fix: missing GRANT EXECUTE on RLS helper functions
--
-- Symptom: GET /rest/v1/canvases returns 403 (PostgreSQL 42501,
-- "permission denied for function canvas_is_accessible"). The desktop sync
-- pull for `canvases` fails on every run; the same fault applies to
-- `workspaces` via workspace_is_accessible.
--
-- Cause: public.canvas_is_accessible() and public.workspace_is_accessible()
-- are referenced from RLS policies but were never granted EXECUTE to the
-- `authenticated` role. Their _is_editable counterparts were granted
-- (canvas_realtime_collaboration.sql:37, collaborative_edit_rls.sql:203);
-- these two were missed.
--
-- Note: a SECURITY DEFINER function still requires the *caller* to hold
-- EXECUTE. The definer context governs what runs inside the function, not
-- who may invoke it. PostgreSQL grants EXECUTE to PUBLIC by default, so this
-- only bites where that default has been revoked -- which is the case here.
--
-- Safe to re-run. Idempotent, and a no-op if the grants already exist.

-- Canvases: used by the "Users can view accessible canvases" SELECT policy
-- (canvas_collaboration.sql:100-109) and the blocks policies below it.
GRANT EXECUTE ON FUNCTION public.canvas_is_accessible(UUID) TO authenticated;

-- Workspaces: used by the workspace SELECT policies
-- (workspace_collaboration.sql:29).
GRANT EXECUTE ON FUNCTION public.workspace_is_accessible(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Verification. Run after applying; both rows should show has_execute = true.
-- ---------------------------------------------------------------------------
-- SELECT p.proname,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS has_execute
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('canvas_is_accessible', 'workspace_is_accessible');
