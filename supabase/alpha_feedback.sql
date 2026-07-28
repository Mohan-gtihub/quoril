-- ============================================
-- Quoril — Alpha/Beta In-App Feedback
--
-- Testers (alpha_tester / beta_tester roles) file bug reports & ideas from a
-- floating widget. The client auto-attaches context (route, version, platform,
-- console logs) and an optional screenshot. Admins triage in the panel.
--
-- Depends on: user_roles.sql (has_role, is_admin).
-- ============================================

DO $$ BEGIN
    CREATE TYPE public.feedback_type AS ENUM ('bug', 'idea', 'confusing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.feedback_status AS ENUM ('new', 'triaged', 'resolved', 'wontfix');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.feedback (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email     TEXT,
    type           public.feedback_type NOT NULL DEFAULT 'bug',
    message        TEXT NOT NULL,
    route          TEXT,                       -- e.g. '/focus'
    app_version    TEXT,
    platform       TEXT,                       -- 'electron' | 'web'
    os_version     TEXT,
    app_state      JSONB,                      -- theme, focus mode, etc.
    console_logs   JSONB,                      -- rolling ring of recent errors
    screenshot_path TEXT,                      -- path in feedback-screenshots bucket
    status         public.feedback_status NOT NULL DEFAULT 'new',
    admin_notes    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Length guard: keep a runaway client from inserting megabytes of text.
ALTER TABLE public.feedback
    DROP CONSTRAINT IF EXISTS feedback_message_len;
ALTER TABLE public.feedback
    ADD CONSTRAINT feedback_message_len
    CHECK (char_length(message) BETWEEN 1 AND 5000);

CREATE OR REPLACE FUNCTION public.touch_feedback_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_feedback_updated_at ON public.feedback;
CREATE TRIGGER trg_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION public.touch_feedback_updated_at();

-- ---------- RLS ----------
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Testers may submit their OWN feedback (and only if they hold a tester role,
-- so a normal user can't spam the table even if the widget is hidden).
DROP POLICY IF EXISTS "testers insert own feedback" ON public.feedback;
CREATE POLICY "testers insert own feedback" ON public.feedback
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND (public.has_role(auth.uid(), 'alpha_tester')
             OR public.has_role(auth.uid(), 'beta_tester'))
    );

-- A tester may read back their own submissions; admins read everything.
DROP POLICY IF EXISTS "read own or admin feedback" ON public.feedback;
CREATE POLICY "read own or admin feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Only admins triage (update/delete).
DROP POLICY IF EXISTS "admins update feedback" ON public.feedback;
CREATE POLICY "admins update feedback" ON public.feedback
    FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins delete feedback" ON public.feedback;
CREATE POLICY "admins delete feedback" ON public.feedback
    FOR DELETE USING (public.is_admin());

GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

-- ---------- Storage bucket for screenshots ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Testers upload only into their own folder (path prefix = their uid).
DROP POLICY IF EXISTS "testers upload own screenshots" ON storage.objects;
CREATE POLICY "testers upload own screenshots" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'feedback-screenshots'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
        AND (public.has_role(auth.uid(), 'alpha_tester')
             OR public.has_role(auth.uid(), 'beta_tester'))
    );

-- A tester may read their own screenshots; admins read all.
DROP POLICY IF EXISTS "read own or admin screenshots" ON storage.objects;
CREATE POLICY "read own or admin screenshots" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'feedback-screenshots'
        AND ((storage.foldername(name))[1] = auth.uid()::TEXT OR public.is_admin())
    );

DO $$ BEGIN RAISE NOTICE 'Feedback table + screenshots bucket installed.'; END $$;
