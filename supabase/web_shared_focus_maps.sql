-- ============================================================
-- Migration: web_shared_focus_maps
-- Stores publicly-shareable snapshots of a user's focus map so the
-- desktop app can mint a short public link (https://quoril.in/share/<id>)
-- that anyone can open in the browser — no auth required to view.
--
-- The app inserts a snapshot (the per-day minutes + headline stats),
-- gets back the row id, and builds the share URL from it. The landing
-- site reads the row anonymously and renders the map.
--
-- Apply manually in the Supabase SQL editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shared_focus_maps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Snapshot payload: { activity: { "YYYY-MM-DD": minutes }, stats: {...}, generatedAt }
    payload     JSONB NOT NULL,
    -- Optional owner (signed-in desktop users); null for anonymous shares.
    owner_id    UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE public.shared_focus_maps ENABLE ROW LEVEL SECURITY;

-- Anyone may create a share snapshot...
DROP POLICY IF EXISTS "Anyone can create a shared focus map" ON public.shared_focus_maps;
CREATE POLICY "Anyone can create a shared focus map"
    ON public.shared_focus_maps FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- ...and anyone with the link (the id) may read it. The id is an
-- unguessable UUID, so this is "unlisted public" rather than fully open.
DROP POLICY IF EXISTS "Anyone can read a shared focus map" ON public.shared_focus_maps;
CREATE POLICY "Anyone can read a shared focus map"
    ON public.shared_focus_maps FOR SELECT
    TO anon, authenticated
    USING (true);

-- Owners may delete their own shares; nobody can update in place.
DROP POLICY IF EXISTS "Owners can delete their shared focus maps" ON public.shared_focus_maps;
CREATE POLICY "Owners can delete their shared focus maps"
    ON public.shared_focus_maps FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

GRANT INSERT, SELECT ON public.shared_focus_maps TO anon, authenticated;
GRANT DELETE          ON public.shared_focus_maps TO authenticated;
GRANT ALL             ON public.shared_focus_maps TO service_role;
