-- ============================================
-- Quoril — Product Analytics Events
--
-- product_events records HOW the app is used: app opens, session
-- heartbeats, screen views, task creation, focus completion, canvas
-- opens. It powers the admin panel's product metrics (DAU/WAU/MAU,
-- sessions, activation, retention, feature usage).
--
-- PRIVACY BY DESIGN: this table contains NO user content. Never write
-- task titles, note bodies, canvas content, message text, or file names
-- into `props` — only ids, route paths, enum values and counts.
--
-- Reads happen via service_role (admin panel) or the admin-only RPCs
-- below; regular users can INSERT their own rows and nothing else, the
-- same shape as analytics_events in web_analytics.sql.
--
-- Depends on: user_roles.sql (is_admin).
-- Apply manually in the Supabase SQL editor. Safe to re-run.
-- ============================================

CREATE TABLE IF NOT EXISTS public.product_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Client-generated UUID, one per app session (regenerated on launch).
    session_id  TEXT NOT NULL,
    -- 'app.opened' | 'session.heartbeat' | 'screen.viewed'
    -- | 'task.created' | 'focus.completed' | 'canvas.opened' | ...
    event       TEXT NOT NULL,
    -- Ids / paths / enums / counts ONLY. No user content, ever.
    props       JSONB DEFAULT '{}',
    app_version TEXT,
    platform    TEXT,                       -- 'electron' | 'web'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes shaped for the aggregation queries below.
CREATE INDEX IF NOT EXISTS idx_product_events_created_at
    ON public.product_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_user_created
    ON public.product_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_event_created
    ON public.product_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_session
    ON public.product_events (session_id);

-- RETENTION: this table grows fast (heartbeats). Rows older than N months
-- (start with 12) carry no analytical value once the daily/weekly rollups
-- have been read, and can be pruned safely, e.g. from a scheduled job:
--     DELETE FROM public.product_events
--     WHERE created_at < NOW() - INTERVAL '12 months';

-- ---------- RLS ----------
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- A signed-in user may record events for THEMSELVES only.
DROP POLICY IF EXISTS "users insert own product events" ON public.product_events;
CREATE POLICY "users insert own product events" ON public.product_events
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- No SELECT policy for regular users: raw event rows are never readable
-- through the public API. Admins are the one exception.
DROP POLICY IF EXISTS "admins read product events" ON public.product_events;
CREATE POLICY "admins read product events" ON public.product_events
    FOR SELECT USING (public.is_admin());

GRANT INSERT, SELECT ON public.product_events TO authenticated;
GRANT ALL ON public.product_events TO service_role;

-- ============================================
-- Aggregation RPCs
--
-- All aggregation happens in SQL — the admin panel must never pull raw
-- rows to JS. Each is SECURITY DEFINER so it can read past RLS and touch
-- auth.users.
--
-- AUTHORIZATION happens in the API layer, not here. These functions are
-- called only by landing/app/api/admin/metrics/route.ts using the
-- service-role key, and that route calls verifyAdmin() (ADMIN_EMAILS
-- allowlist) and returns 401 before any RPC runs.
--
-- They deliberately do NOT guard on public.is_admin(). is_admin() checks
-- auth.uid() against user_roles, but the service-role client has no
-- auth.uid() — it is not a user — so the guard returned false for every
-- call and every RPC raised 'forbidden'. Two separate notions of "admin"
-- exist in this project (the ADMIN_EMAILS allowlist used by the landing
-- API, and the user_roles table used in-app); the API layer owns this one.
--
-- Consequence: EXECUTE is granted to service_role ONLY. Do not grant to
-- authenticated — without an internal guard that would let any signed-in
-- user read whole-product metrics.
-- ============================================

-- ---------- Overview tiles ----------
CREATE OR REPLACE FUNCTION public.metrics_overview(days INT DEFAULT 30)
RETURNS TABLE (
    total_users         BIGINT,
    new_users_in_period BIGINT,
    dau                 BIGINT,
    wau                 BIGINT,
    mau                 BIGINT,
    total_events        BIGINT,
    app_opens_in_period BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM auth.users)::BIGINT,
        (SELECT COUNT(*) FROM auth.users u
          WHERE u.created_at >= NOW() - (days || ' days')::INTERVAL)::BIGINT,
        (SELECT COUNT(DISTINCT e.user_id) FROM public.product_events e
          WHERE e.created_at >= date_trunc('day', NOW()))::BIGINT,
        (SELECT COUNT(DISTINCT e.user_id) FROM public.product_events e
          WHERE e.created_at >= NOW() - INTERVAL '7 days')::BIGINT,
        (SELECT COUNT(DISTINCT e.user_id) FROM public.product_events e
          WHERE e.created_at >= NOW() - INTERVAL '30 days')::BIGINT,
        (SELECT COUNT(*) FROM public.product_events)::BIGINT,
        (SELECT COUNT(*) FROM public.product_events e
          WHERE e.event = 'app.opened'
            AND e.created_at >= NOW() - (days || ' days')::INTERVAL)::BIGINT;
END;
$$;

-- ---------- Daily active users time series (gap-filled) ----------
CREATE OR REPLACE FUNCTION public.metrics_daily_active(days INT DEFAULT 30)
RETURNS TABLE (
    day       DATE,
    dau       BIGINT,
    app_opens BIGINT,
    sessions  BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH span AS (
        SELECT generate_series(
            (CURRENT_DATE - (days - 1))::DATE,
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE AS day
    ),
    agg AS (
        SELECT
            e.created_at::DATE                       AS day,
            COUNT(DISTINCT e.user_id)                AS dau,
            COUNT(*) FILTER (WHERE e.event = 'app.opened') AS app_opens,
            COUNT(DISTINCT e.session_id)             AS sessions
        FROM public.product_events e
        WHERE e.created_at >= (CURRENT_DATE - (days - 1))::DATE
        GROUP BY 1
    )
    SELECT
        s.day,
        COALESCE(a.dau, 0)::BIGINT,
        COALESCE(a.app_opens, 0)::BIGINT,
        COALESCE(a.sessions, 0)::BIGINT
    FROM span s
    LEFT JOIN agg a ON a.day = s.day
    ORDER BY s.day;
END;
$$;

-- ---------- Session length ----------
-- Duration = last event minus first event for a session_id. Sessions
-- longer than 12h are treated as corrupt (a machine that slept with the
-- app open, a clock jump) and excluded — the same class of bad data that
-- has shown up in focus_sessions.
CREATE OR REPLACE FUNCTION public.metrics_sessions(days INT DEFAULT 30)
RETURNS TABLE (
    day                     DATE,
    session_count           BIGINT,
    avg_duration_seconds    NUMERIC,
    median_duration_seconds NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH span AS (
        SELECT generate_series(
            (CURRENT_DATE - (days - 1))::DATE,
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE AS day
    ),
    sess AS (
        SELECT
            e.session_id,
            MIN(e.created_at)::DATE AS day,
            EXTRACT(EPOCH FROM (MAX(e.created_at) - MIN(e.created_at)))::NUMERIC
                AS duration_seconds
        FROM public.product_events e
        WHERE e.created_at >= (CURRENT_DATE - (days - 1))::DATE
        GROUP BY e.session_id
        HAVING MAX(e.created_at) - MIN(e.created_at) <= INTERVAL '12 hours'
    ),
    agg AS (
        SELECT
            s.day,
            COUNT(*)                       AS session_count,
            ROUND(AVG(s.duration_seconds), 1) AS avg_duration_seconds,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
                ORDER BY s.duration_seconds)::NUMERIC, 1) AS median_duration_seconds
        FROM sess s
        GROUP BY s.day
    )
    SELECT
        sp.day,
        COALESCE(a.session_count, 0)::BIGINT,
        COALESCE(a.avg_duration_seconds, 0)::NUMERIC,
        COALESCE(a.median_duration_seconds, 0)::NUMERIC
    FROM span sp
    LEFT JOIN agg a ON a.day = sp.day
    ORDER BY sp.day;
END;
$$;

-- ---------- Activation by signup cohort ----------
-- "Activated" = the user has completed at least one focus session
-- (event = 'focus.completed') at any point after signing up.
CREATE OR REPLACE FUNCTION public.metrics_activation(days INT DEFAULT 30)
RETURNS TABLE (
    signup_day      DATE,
    signups         BIGINT,
    activated       BIGINT,
    activation_rate NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH cohort AS (
        SELECT u.id AS user_id, u.created_at::DATE AS signup_day
        FROM auth.users u
        WHERE u.created_at >= (CURRENT_DATE - (days - 1))::DATE
    ),
    activated_users AS (
        SELECT DISTINCT e.user_id
        FROM public.product_events e
        WHERE e.event = 'focus.completed'
    )
    SELECT
        c.signup_day,
        COUNT(*)::BIGINT,
        COUNT(a.user_id)::BIGINT,
        ROUND(
            100.0 * COUNT(a.user_id) / NULLIF(COUNT(*), 0), 1
        )::NUMERIC
    FROM cohort c
    LEFT JOIN activated_users a ON a.user_id = c.user_id
    GROUP BY c.signup_day
    ORDER BY c.signup_day;
END;
$$;

-- ---------- Feature usage by event name ----------
CREATE OR REPLACE FUNCTION public.metrics_feature_usage(days INT DEFAULT 30)
RETURNS TABLE (
    event        TEXT,
    event_count  BIGINT,
    unique_users BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.event,
        COUNT(*)::BIGINT,
        COUNT(DISTINCT e.user_id)::BIGINT
    FROM public.product_events e
    WHERE e.created_at >= NOW() - (days || ' days')::INTERVAL
    GROUP BY e.event
    ORDER BY 2 DESC;
END;
$$;

-- ---------- Weekly retention cohort grid ----------
-- Rows form a triangle: for each signup week, how many of that cohort's
-- users were active N weeks later. week_offset 0 = signup week itself.
--
-- NOTE ON THE SIGNATURE: this takes `days` purely for consistency with the
-- other five RPCs. An earlier version was zero-argument, and PostgREST
-- failed to resolve it from an empty JSON body — returning 42883
-- (undefined_function) even though the function existed with correct
-- grants, which the API then misreported as "SQL not applied". Keeping
-- every metrics RPC on an identical (days INT) signature avoids that
-- overload-resolution edge entirely. `days` bounds the signup cohorts
-- considered, so the grid does not grow without limit.
DROP FUNCTION IF EXISTS public.metrics_retention_cohorts();

CREATE OR REPLACE FUNCTION public.metrics_retention_cohorts(days INT DEFAULT 90)
RETURNS TABLE (
    cohort_week  DATE,
    week_offset  INT,
    users_active BIGINT,
    cohort_size  BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH cohort AS (
        SELECT
            u.id AS user_id,
            date_trunc('week', u.created_at)::DATE AS cohort_week
        FROM auth.users u
        WHERE u.created_at >= NOW() - (days || ' days')::INTERVAL
    ),
    sizes AS (
        SELECT c.cohort_week, COUNT(*)::BIGINT AS cohort_size
        FROM cohort c
        GROUP BY c.cohort_week
    ),
    activity AS (
        SELECT DISTINCT
            c.cohort_week,
            -- DATE - DATE yields an INTEGER number of days in Postgres, not
            -- an interval, so EXTRACT(EPOCH FROM ...) is invalid here — it
            -- raises 42883 "function pg_catalog.extract(unknown, integer)
            -- does not exist". Both dates are week-truncated, so the
            -- difference is always a whole number of weeks: just divide by 7.
            ((date_trunc('week', e.created_at)::DATE - c.cohort_week) / 7)::INT
                AS week_offset,
            e.user_id
        FROM public.product_events e
        JOIN cohort c ON c.user_id = e.user_id
        WHERE date_trunc('week', e.created_at)::DATE >= c.cohort_week
    )
    SELECT
        a.cohort_week,
        a.week_offset,
        COUNT(*)::BIGINT,
        s.cohort_size
    FROM activity a
    JOIN sizes s ON s.cohort_week = a.cohort_week
    GROUP BY a.cohort_week, a.week_offset, s.cohort_size
    ORDER BY a.cohort_week, a.week_offset;
END;
$$;

-- ---------- Grants ----------
-- service_role ONLY. These functions carry no internal authorization
-- (see the note above), so EXECUTE must not reach end users. The admin
-- API route holds the service-role key and gates on ADMIN_EMAILS.
--
-- The REVOKEs matter for anyone who applied an earlier version of this
-- file, which granted EXECUTE to `authenticated`. Re-running this file
-- closes that hole.
-- REVOKE FROM PUBLIC is the important one. Postgres grants EXECUTE on new
-- functions to PUBLIC by default, which shows up in pg_proc.proacl as a
-- bare `=X/postgres` entry. Revoking from `authenticated, anon` does NOT
-- remove it — PUBLIC is a distinct grantee, and every role inherits it.
-- Without this, any signed-in user could call these SECURITY DEFINER
-- functions and read whole-product metrics.
REVOKE ALL ON FUNCTION public.metrics_overview(INT)           FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.metrics_daily_active(INT)       FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.metrics_sessions(INT)           FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.metrics_activation(INT)         FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.metrics_feature_usage(INT)      FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public.metrics_retention_cohorts(INT)  FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.metrics_overview(INT)           TO service_role;
GRANT EXECUTE ON FUNCTION public.metrics_daily_active(INT)       TO service_role;
GRANT EXECUTE ON FUNCTION public.metrics_sessions(INT)           TO service_role;
GRANT EXECUTE ON FUNCTION public.metrics_activation(INT)         TO service_role;
GRANT EXECUTE ON FUNCTION public.metrics_feature_usage(INT)      TO service_role;
GRANT EXECUTE ON FUNCTION public.metrics_retention_cohorts(INT)  TO service_role;

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN RAISE NOTICE 'Product analytics events + metrics RPCs installed.'; END $$;
