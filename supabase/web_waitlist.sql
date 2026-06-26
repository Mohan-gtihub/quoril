-- ============================================================
-- Migration: web_waitlist
-- Collects landing-page waitlist signups in the Quoril Supabase
-- project. Designed to accept inserts from the marketing site
-- using the public (anon) key — no auth account required — while
-- keeping the collected emails private (no anonymous SELECT).
--
-- Apply manually in the Supabase SQL editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.waitlist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    role        TEXT,
    platform    TEXT,
    referrer    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive uniqueness so "A@x.com" and "a@x.com" collide.
-- Duplicate inserts raise SQLSTATE 23505, which the app maps to
-- a friendly "already on the list" response.
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_unique
    ON public.waitlist (lower(email));

-- ------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or signed-in) may add themselves to the waitlist...
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join the waitlist"
    ON public.waitlist FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- ...but nobody can read, update or delete rows through the public
-- API. There is intentionally no SELECT/UPDATE/DELETE policy, so the
-- collected emails are only reachable via service_role (dashboard,
-- server jobs). Counts are exposed through the function below.

GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT ALL    ON public.waitlist TO service_role;

-- ------------------------------------------------------------
-- 3. PUBLIC COUNT (for the social-proof number on the site)
-- ------------------------------------------------------------

-- SECURITY DEFINER so it can count rows the caller can't SELECT.
CREATE OR REPLACE FUNCTION public.waitlist_count()
    RETURNS bigint
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
AS $$
    SELECT count(*) FROM public.waitlist;
$$;

GRANT EXECUTE ON FUNCTION public.waitlist_count() TO anon, authenticated;
