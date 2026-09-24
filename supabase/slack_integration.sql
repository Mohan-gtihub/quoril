-- Slack integration schema (ported from Quoril-Swift).
--
-- Slack credentials are server-only. No client RLS policy is intentionally
-- added: the Edge Functions use the service role and return a redacted status
-- shape. RLS is enabled with no policies, so the anon/authenticated keys can
-- never read these tables directly.
--
-- The Swift project shipped this as three migrations:
--   202608030001_slack_integration.sql          (the schema below)
--   202608040110_slack_captures_in_today.sql     (temp backfill of due_at)
--   202608040120_revert_slack_capture_due_backfill.sql (reverted that backfill)
-- The two backfill migrations net to a no-op (Slack now asks for an explicit
-- due date in the modal), so only the schema is reproduced here.

create table if not exists public.slack_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slack_team_id text not null,
  slack_team_name text not null,
  slack_user_id text not null,
  bot_user_id text,
  access_token text not null,
  scopes text not null default '',
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (slack_team_id, slack_user_id)
);

alter table public.slack_installations enable row level security;

create table if not exists public.slack_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.slack_oauth_states enable row level security;

create table if not exists public.slack_captures (
  event_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid,
  source_kind text not null check (source_kind in ('message_shortcut', 'app_mention')),
  created_at timestamptz not null default now()
);

alter table public.slack_captures enable row level security;

create index if not exists slack_captures_user_created_idx
  on public.slack_captures (user_id, created_at desc);
