-- Per-user generation log, used only to enforce the daily quota in the
-- quoril-insights function.
--
-- It stores who generated and when, and nothing about what: the payload and the
-- briefing never touch the server's storage. Quoril's privacy posture is that
-- productivity data stays in the user's own rows, and a quota counter is not a
-- reason to start keeping copies.

create table if not exists public.insight_generations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create index if not exists insight_generations_user_created_idx
    on public.insight_generations (user_id, created_at desc);

alter table public.insight_generations enable row level security;

-- No policies are defined on purpose. The only writer is the Edge Function,
-- which uses the service role and bypasses RLS; with RLS on and no policy, a
-- user's own anon key can neither read nor forge rows. A client that could
-- delete its own rows could reset its own quota.

-- Housekeeping: rows older than the quota window serve no purpose.
create or replace function public.prune_insight_generations()
returns void
language sql
security definer
set search_path = public
as $$
    delete from public.insight_generations where created_at < now() - interval '7 days';
$$;
