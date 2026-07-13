# Supabase RLS Verification

Run this check against a dedicated Supabase staging project before each production release and after every RLS or schema change. It creates three isolated test users and deletes them, along with their cascading test data, at the end of the run.

Do not use a personal account, a customer account, or a long-lived shared test account. The script provisions its own users with a unique `rls-` email prefix.

## Required configuration

Set these values in your shell or an untracked environment file:

```sh
RLS_TEST_SUPABASE_URL=https://your-project.supabase.co
RLS_TEST_SUPABASE_ANON_KEY=your-publishable-or-anon-key
RLS_TEST_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RLS_TEST_ALLOW_LIVE=true
```

`RLS_TEST_ALLOW_LIVE=true` is an intentional safety switch. The service-role key is used only to provision and delete the isolated test accounts; all authorization checks run through normal anon-key clients.

## Run

```sh
npm run test:rls
```

The check proves the intended access model for the current desktop and web data paths:

- Owner can create workspace, list, task, focus session, canvas, and block.
- An editor collaborator can read shared workspace/task/canvas data and edit the shared task and canvas block.
- An unrelated authenticated user cannot read or edit those records.
- An anonymous client cannot read or edit those records.

It fails on missing tables, missing policy functions, schema mismatch, non-working collaboration policies, or failed cleanup. Keep the terminal output as release evidence.

## Deployment rule

The SQL files in `supabase/` are historical manual deltas, not yet a single canonical migration chain. Do not infer that a live project is correct because an individual file has been applied. Apply the approved schema/RLS change in staging, run this command, then apply the same change to production and run it again using production-safe test accounts.

For a fresh project that needs the current task, workspace, and canvas collaboration model, apply the files in this order:

1. `supabase/supabase_setup.sql`
2. `supabase/web_v1_workspaces_canvas.sql`
3. `supabase/workspace_collaboration.sql`
4. `supabase/collaborative_edit_rls.sql`
5. `supabase/canvas_collaboration.sql`
6. `supabase/enforce_task_start_assignee.sql`

The web/workspace migration owns the `TEXT` workspace identifier and adds `lists.workspace_id`; subsequent collaboration files rely on both. Existing projects must be compared with this expected shape before applying a corrective migration.

LB-001 remains open until this verification has passed against the target production project and the SQL deployment history is consolidated into a reproducible migration chain.
