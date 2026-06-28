-- ============================================================
-- Workspace collaboration
-- Adds email-based workspace members and RLS for shared workspace data.
--
-- Apply manually in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspace_members (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
    invited_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accepted_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace
    ON public.workspace_members (workspace_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_workspace_members_email
    ON public.workspace_members (lower(email), deleted_at);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.workspace_is_accessible(ws_id TEXT)
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
                    AND lower(wm.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
              )
          )
    );
$$;

DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
CREATE POLICY "Workspace owners can manage members"
    ON public.workspace_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_members.workspace_id
              AND w.user_id = auth.uid()
              AND w.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_members.workspace_id
              AND w.user_id = auth.uid()
              AND w.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Workspace members can view own memberships" ON public.workspace_members;
CREATE POLICY "Workspace members can view own memberships"
    ON public.workspace_members
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    );

DROP POLICY IF EXISTS "Users can view accessible workspaces" ON public.workspaces;
CREATE POLICY "Users can view accessible workspaces"
    ON public.workspaces
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            auth.uid() = user_id
            OR public.workspace_is_accessible(id)
        )
    );

DROP POLICY IF EXISTS "Users can update owned workspaces" ON public.workspaces;
CREATE POLICY "Users can update owned workspaces"
    ON public.workspaces
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view accessible workspace lists" ON public.lists;
CREATE POLICY "Users can view accessible workspace lists"
    ON public.lists
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            auth.uid() = user_id
            OR (
                workspace_id IS NOT NULL
                AND public.workspace_is_accessible(workspace_id)
            )
        )
    );

DROP POLICY IF EXISTS "Users can create lists in accessible workspaces" ON public.lists;
CREATE POLICY "Users can create lists in accessible workspaces"
    ON public.lists
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            workspace_id IS NULL
            OR public.workspace_is_accessible(workspace_id)
        )
    );

DROP POLICY IF EXISTS "Users can update accessible workspace lists" ON public.lists;
CREATE POLICY "Users can update accessible workspace lists"
    ON public.lists
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR (
            workspace_id IS NOT NULL
            AND public.workspace_is_accessible(workspace_id)
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (
            workspace_id IS NOT NULL
            AND public.workspace_is_accessible(workspace_id)
        )
    );

DROP POLICY IF EXISTS "Users can view accessible workspace tasks" ON public.tasks;
CREATE POLICY "Users can view accessible workspace tasks"
    ON public.tasks
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1
                FROM public.lists l
                WHERE l.id = tasks.list_id
                  AND l.workspace_id IS NOT NULL
                  AND public.workspace_is_accessible(l.workspace_id)
            )
        )
    );

DROP POLICY IF EXISTS "Users can create tasks in accessible workspace lists" ON public.tasks;
CREATE POLICY "Users can create tasks in accessible workspace lists"
    ON public.tasks
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            list_id IS NULL
            OR EXISTS (
                SELECT 1
                FROM public.lists l
                WHERE l.id = tasks.list_id
                  AND (
                      l.user_id = auth.uid()
                      OR (
                          l.workspace_id IS NOT NULL
                          AND public.workspace_is_accessible(l.workspace_id)
                      )
                  )
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
            SELECT 1
            FROM public.lists l
            WHERE l.id = tasks.list_id
              AND l.workspace_id IS NOT NULL
              AND public.workspace_is_accessible(l.workspace_id)
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.lists l
            WHERE l.id = tasks.list_id
              AND l.workspace_id IS NOT NULL
              AND public.workspace_is_accessible(l.workspace_id)
        )
    );

DROP POLICY IF EXISTS "Users can view accessible workspace subtasks" ON public.subtasks;
CREATE POLICY "Users can view accessible workspace subtasks"
    ON public.subtasks
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1
                FROM public.tasks t
                JOIN public.lists l ON l.id = t.list_id
                WHERE t.id = subtasks.task_id
                  AND l.workspace_id IS NOT NULL
                  AND public.workspace_is_accessible(l.workspace_id)
            )
        )
    );

DROP POLICY IF EXISTS "Users can update accessible workspace subtasks" ON public.subtasks;
CREATE POLICY "Users can update accessible workspace subtasks"
    ON public.subtasks
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.tasks t
            JOIN public.lists l ON l.id = t.list_id
            WHERE t.id = subtasks.task_id
              AND l.workspace_id IS NOT NULL
              AND public.workspace_is_accessible(l.workspace_id)
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.tasks t
            JOIN public.lists l ON l.id = t.list_id
            WHERE t.id = subtasks.task_id
              AND l.workspace_id IS NOT NULL
              AND public.workspace_is_accessible(l.workspace_id)
        )
    );

-- ------------------------------------------------------------
-- Task assignment within shared workspaces
-- A task can be assigned to a single workspace member, identified
-- by email (matches workspace_members.email; survives invitees who
-- haven't logged in yet). Any member can assign — the existing
-- "Users can update accessible workspace tasks" policy already
-- grants the required UPDATE permission, so no new policy is needed.
-- ------------------------------------------------------------

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
    ON public.tasks (lower(assigned_to))
    WHERE assigned_to IS NOT NULL;

-- ------------------------------------------------------------
-- Per-workspace nicknames
-- A friendly display name for each participant (owner + members),
-- keyed by email and scoped to a single workspace. Shared: anyone
-- with access to the workspace can read and set them.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workspace_nicknames (
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    nickname     TEXT NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, email)
);

ALTER TABLE public.workspace_nicknames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view workspace nicknames" ON public.workspace_nicknames;
CREATE POLICY "Members can view workspace nicknames"
    ON public.workspace_nicknames
    FOR SELECT
    USING (public.workspace_is_accessible(workspace_id));

DROP POLICY IF EXISTS "Members can manage workspace nicknames" ON public.workspace_nicknames;
CREATE POLICY "Members can manage workspace nicknames"
    ON public.workspace_nicknames
    FOR ALL
    USING (public.workspace_is_accessible(workspace_id))
    WITH CHECK (public.workspace_is_accessible(workspace_id));

GRANT ALL ON public.workspace_nicknames TO authenticated;
GRANT ALL ON public.workspace_nicknames TO service_role;

GRANT ALL ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;

NOTIFY pgrst, 'reload schema';
