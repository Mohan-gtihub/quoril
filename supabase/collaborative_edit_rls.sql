-- ============================================================
-- Collaborative-edit RLS delta
--
-- Builds on workspace_collaboration.sql. Fixes the gaps that block the
-- desktop sync push (which uses upsert(onConflict:'id') and now preserves
-- the ORIGINAL owner's user_id so edits sync back to the owner instead of
-- being re-homed to the editor).
--
-- Why the existing policies aren't enough:
--   1. An upsert is INSERT ... ON CONFLICT DO UPDATE. Postgres evaluates the
--      INSERT policy's WITH CHECK on the NEW row. The current INSERT policies
--      require `auth.uid() = user_id`, which is FALSE when a member edits a
--      row owned by someone else -> 42501 / 403.
--   2. workspaces has SELECT + UPDATE policies but NO INSERT policy, so the
--      owner's own workspace upsert is denied by default-deny -> the 403 you
--      saw on workspaces/<id>.
--   3. focus_sessions has no membership policies here at all.
--
-- Apply manually in the Supabase SQL editor (idempotent: safe to re-run).
-- Assumes public.workspace_is_accessible(TEXT) from workspace_collaboration.sql.
--
-- Role model: SELECT uses workspace_is_accessible (any member can read).
-- WRITES use workspace_is_editable (owner or role='editor'); viewers are
-- therefore read-only.
-- ============================================================

-- ----------------------------------------------------------------
-- Editor-only access helper. Mirrors workspace_is_accessible but
-- additionally requires role='editor' for non-owner members.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.workspace_is_editable(ws_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = ws_id
          AND w.deleted_at IS NULL
          AND (
              w.user_id = auth.uid()
              OR EXISTS (
                  SELECT 1
                  FROM public.workspace_members wm
                  WHERE wm.workspace_id = ws_id
                    AND wm.deleted_at IS NULL
                    AND wm.accepted_at IS NOT NULL
                    AND wm.role = 'editor'
                    AND lower(wm.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
              )
          )
    );
$$;

-- ----------------------------------------------------------------
-- WORKSPACES: allow the owner to INSERT/upsert their own workspace.
-- (Membership write to a workspace row itself stays owner-only.)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create owned workspaces" ON public.workspaces;
CREATE POLICY "Users can create owned workspaces"
    ON public.workspaces
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- LISTS: replace the INSERT policy so a member can insert/upsert a
-- list into an accessible workspace even when they are not the owner.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create lists in accessible workspaces" ON public.lists;
CREATE POLICY "Users can create lists in accessible workspaces"
    ON public.lists
    FOR INSERT
    WITH CHECK (
        -- own personal (no workspace) list
        (auth.uid() = user_id AND workspace_id IS NULL)
        -- or any list whose workspace the caller can edit (owner/editor)
        OR (workspace_id IS NOT NULL AND public.workspace_is_editable(workspace_id))
    );

DROP POLICY IF EXISTS "Users can update accessible workspace lists" ON public.lists;
CREATE POLICY "Users can update accessible workspace lists"
    ON public.lists
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR (workspace_id IS NOT NULL AND public.workspace_is_editable(workspace_id))
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (workspace_id IS NOT NULL AND public.workspace_is_editable(workspace_id))
    );

-- ----------------------------------------------------------------
-- TASKS: replace INSERT policy to allow upsert into accessible
-- workspace lists regardless of the row's owner.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create tasks in accessible workspace lists" ON public.tasks;
CREATE POLICY "Users can create tasks in accessible workspace lists"
    ON public.tasks
    FOR INSERT
    WITH CHECK (
        -- own personal (no list) task
        (auth.uid() = user_id AND list_id IS NULL)
        -- or a task in a list the caller can edit (own or shared workspace editor)
        OR EXISTS (
            SELECT 1
            FROM public.lists l
            WHERE l.id = tasks.list_id
              AND (
                  l.user_id = auth.uid()
                  OR (l.workspace_id IS NOT NULL
                      AND public.workspace_is_editable(l.workspace_id))
              )
        )
    );

DROP POLICY IF EXISTS "Users can update accessible workspace tasks" ON public.tasks;
CREATE POLICY "Users can update accessible workspace tasks"
    ON public.tasks
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.lists l
            WHERE l.id = tasks.list_id
              AND l.workspace_id IS NOT NULL
              AND public.workspace_is_editable(l.workspace_id)
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.lists l
            WHERE l.id = tasks.list_id
              AND l.workspace_id IS NOT NULL
              AND public.workspace_is_editable(l.workspace_id)
        )
    );

-- ----------------------------------------------------------------
-- SUBTASKS: existing file only had SELECT + UPDATE. Add INSERT so a
-- member can upsert a subtask under an accessible task.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create subtasks in accessible workspaces" ON public.subtasks;
CREATE POLICY "Users can create subtasks in accessible workspaces"
    ON public.subtasks
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.tasks t
            JOIN public.lists l ON l.id = t.list_id
            WHERE t.id = subtasks.task_id
              AND l.workspace_id IS NOT NULL
              AND public.workspace_is_editable(l.workspace_id)
        )
    );

DROP POLICY IF EXISTS "Users can update accessible workspace subtasks" ON public.subtasks;
CREATE POLICY "Users can update accessible workspace subtasks"
    ON public.subtasks
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.lists l ON l.id = t.list_id
            WHERE t.id = subtasks.task_id
              AND l.workspace_id IS NOT NULL
              AND public.workspace_is_editable(l.workspace_id)
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.lists l ON l.id = t.list_id
            WHERE t.id = subtasks.task_id
              AND l.workspace_id IS NOT NULL
              AND public.workspace_is_editable(l.workspace_id)
        )
    );

-- ----------------------------------------------------------------
-- FOCUS SESSIONS: always owned by the caller (you log your own focus
-- time, even on a shared task). Owner-only ALL policy is sufficient and
-- avoids cross-user write surface. The task_id FK may point at a shared
-- task; SELECT on tasks is already granted to members.
-- ----------------------------------------------------------------
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users manage own focus sessions"
    ON public.focus_sessions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT EXECUTE ON FUNCTION public.workspace_is_editable(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
