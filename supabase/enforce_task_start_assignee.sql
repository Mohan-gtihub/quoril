-- ============================================================
-- Enforce "only the assignee may START a task" at the database level.
--
-- Builds on collaborative_edit_rls.sql. That file lets any workspace
-- editor UPDATE any task (rename, reassign, move) — which is the intended
-- collaborative model. But it means an editor can also flip another
-- member's task into a running state (status='active' / started_at set),
-- which the product does NOT want: only the assignee (or anyone, if the
-- task is unassigned) should be able to start tracking time.
--
-- RLS can't express this: WITH CHECK validates the whole NEW row and can't
-- tell "starting" (touching started_at/status) apart from "editing title".
-- A BEFORE UPDATE trigger is column/transition-aware, so it can allow
-- general edits while blocking the start transition for non-assignees.
--
-- Apply manually in the Supabase SQL editor (idempotent: safe to re-run).
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_task_start_assignee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_email TEXT := lower(COALESCE(auth.jwt() ->> 'email', ''));
    ws_id TEXT;
BEGIN
    -- Only police the transition that actually STARTS a task. Edits that don't
    -- begin a run (rename, reassign, pause -> started_at cleared, re-sync of an
    -- already-started row) fall straight through untouched.
    IF (NEW.status = 'active' AND COALESCE(OLD.status, '') <> 'active')
       OR (NEW.started_at IS NOT NULL AND OLD.started_at IS NULL) THEN

        SELECT l.workspace_id INTO ws_id
        FROM public.lists l
        WHERE l.id = NEW.list_id;

        -- Personal (non-workspace) tasks are unaffected — assignment is a
        -- workspace concept. Only enforce inside a shared workspace.
        IF ws_id IS NOT NULL THEN
            -- Mirrors the client rule (canEditTaskTime): allowed iff the task is
            -- unassigned or assigned to the caller. The owner gets no special
            -- pass — if you assign it away, only the assignee may run it.
            IF NOT (
                NEW.assigned_to IS NULL
                OR lower(NEW.assigned_to) = caller_email
            ) THEN
                RAISE EXCEPTION 'Only the assignee may start this task'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_task_start_assignee ON public.tasks;
CREATE TRIGGER trg_enforce_task_start_assignee
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_task_start_assignee();

NOTIFY pgrst, 'reload schema';
