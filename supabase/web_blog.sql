-- ============================================================
-- Migration: web_blog
-- Backs the marketing blog. Posts are authored in the admin
-- panel (service_role) and stored as raw HTML so the content can
-- be designed freely. The public site reads ONLY published posts
-- through the anon key, enforced by row-level security.
--
-- Apply manually in the Supabase SQL editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT NOT NULL,
    title         TEXT NOT NULL,
    excerpt       TEXT,
    -- Raw HTML body. The admin authors this; the site renders it inside
    -- a styled `.blog-content` container, so any valid HTML is allowed.
    content_html  TEXT NOT NULL DEFAULT '',
    cover_image   TEXT,
    author        TEXT,
    tags          TEXT[] NOT NULL DEFAULT '{}',
    -- 'draft' | 'published'
    status        TEXT NOT NULL DEFAULT 'draft',
    -- Estimated read time in minutes (computed by the app on save).
    read_minutes  INT NOT NULL DEFAULT 1,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Slugs are the public URL key, so they must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug
    ON public.blog_posts (lower(slug));

-- Listing the published feed orders by published_at DESC.
CREATE INDEX IF NOT EXISTS idx_blog_posts_published
    ON public.blog_posts (status, published_at DESC);

-- Keep updated_at honest on every write.
CREATE OR REPLACE FUNCTION public.blog_posts_touch_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.blog_posts_touch_updated_at();

-- ------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- The public (anon + signed-in) may read ONLY published posts.
-- Drafts stay invisible until they're published.
DROP POLICY IF EXISTS "Published posts are public" ON public.blog_posts;
CREATE POLICY "Published posts are public"
    ON public.blog_posts FOR SELECT
    TO anon, authenticated
    USING (status = 'published');

-- All writes (and reading drafts) go through service_role from the
-- admin API, which bypasses RLS. No anon INSERT/UPDATE/DELETE policy.

GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT ALL    ON public.blog_posts TO service_role;
