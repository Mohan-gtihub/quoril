-- ============================================================
-- Migration: admin_allowlist
-- The database-backed access list for the Quoril admin panel
-- (/admin on the landing site).
--
-- HOW ACCESS WORKS — two sources, either one grants access:
--   1. ADMIN_EMAILS env var — the BREAK-GLASS fallback. Always
--      wins, works even if this table is missing or the DB query
--      fails. Changing it requires a redeploy.
--   2. This table — managed live from the panel's "Access" tab.
--      No redeploy needed.
--
-- IMPORTANT: an entry here does NOT create an account. It only
-- grants panel access to an email that ALREADY has (or later
-- creates) a Quoril Supabase Auth account with that exact
-- address. The person still signs in normally at /admin.
--
-- SECURITY: this table is service_role-ONLY. It is read
-- exclusively server-side by verifyAdmin() in
-- landing/lib/supabaseAdmin.ts. RLS is enabled with NO policies
-- for anon/authenticated, so the public API can never read or
-- write it — a signed-in user must not be able to see who the
-- admins are, let alone add themselves.
--
-- Apply manually in the Supabase SQL editor. Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_allowlist (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL,
    note       TEXT,
    -- The admin email that added this entry (audit trail; kept as
    -- plain text so it survives the adder's account being deleted).
    added_by   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive uniqueness so "A@x.com" and "a@x.com" collide.
-- A duplicate insert raises SQLSTATE 23505, which the API maps to
-- a friendly 409 "already an admin" response.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_allowlist_email_unique
    ON public.admin_allowlist (lower(email));

-- ------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- There are intentionally NO policies on this table. With RLS
-- enabled and zero policies, anon and authenticated can do
-- nothing at all; service_role bypasses RLS entirely.

-- ------------------------------------------------------------
-- 3. GRANTS
-- ------------------------------------------------------------

-- Postgres grants table privileges to PUBLIC in some setups, and
-- Supabase's default grants can reach anon/authenticated. Be
-- explicit: revoke everything, then hand the table to
-- service_role only. (RLS already blocks them, but defence in
-- depth — a future policy added by mistake shouldn't open it up.)
REVOKE ALL ON public.admin_allowlist FROM PUBLIC, anon, authenticated;
GRANT  ALL ON public.admin_allowlist TO service_role;

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN RAISE NOTICE 'admin_allowlist installed (service_role only).'; END $$;
