-- ============================================================
-- Migration: web_analytics
-- Adds first-party visitor analytics ("pixel") and an admin
-- audit log to the Quoril Supabase project.
--
--   * analytics_events — every pageview / exit / custom event the
--     landing site emits. Written with the public (anon) key, but
--     NOT readable through the public API (no SELECT policy), so
--     raw visitor data stays private. The admin panel reads it via
--     the service-role key.
--
--   * audit_log — records privileged admin actions (e.g. deleting
--     a waitlist row) so changes are attributable after the fact.
--
-- Apply manually in the Supabase SQL editor, after web_waitlist.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ANALYTICS EVENTS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Stable per-browser id (localStorage) and per-tab session id.
    visitor_id  TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    -- 'pageview' | 'exit' | 'click' | custom.
    type        TEXT NOT NULL,
    path        TEXT,
    referrer    TEXT,
    -- Where the visit originated (utm_source / referrer host).
    source      TEXT,
    country     TEXT,
    device      TEXT,            -- 'mobile' | 'tablet' | 'desktop'
    user_agent  TEXT,
    -- Milliseconds spent on the page (sent with 'exit' events).
    duration_ms INTEGER,
    -- Arbitrary extra payload (utm params, scroll depth, etc.).
    meta        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_created_at
    ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor
    ON public.analytics_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session
    ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type
    ON public.analytics_events (type);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone may record an event (the tracking pixel uses the anon key)...
DROP POLICY IF EXISTS "Anyone can record an event" ON public.analytics_events;
CREATE POLICY "Anyone can record an event"
    ON public.analytics_events FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- ...but only service_role can read it back (admin panel / jobs).
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT ALL    ON public.analytics_events TO service_role;

-- ------------------------------------------------------------
-- 2. AUDIT LOG
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action      TEXT NOT NULL,   -- e.g. 'waitlist.delete'
    target_id   TEXT,
    meta        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON public.audit_log (created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- No anon policies at all: the audit log is service_role-only, written
-- and read exclusively by the admin API.
GRANT ALL ON public.audit_log TO service_role;
