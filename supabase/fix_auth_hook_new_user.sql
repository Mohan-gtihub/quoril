-- ============================================
-- Quoril — FIX: new users (esp. Google OAuth) get created in auth.users but
-- never receive a session, so the app never routes them past the login screen.
--
-- ROOT CAUSE
-- The custom_access_token_hook runs (as supabase_auth_admin) every time an
-- access token is minted. If it throws — missing GRANT to supabase_auth_admin,
-- a not-yet-visible subscriptions/user_roles row for a brand-new user, or a
-- search_path issue — token minting fails, exchangeCodeForSession() returns an
-- error, and no session is set. Existing users already have working tokens, so
-- ONLY new signups break. That matches the symptom exactly.
--
-- THIS SCRIPT (safe to re-run):
--   1. Rewrites the hook so it can NEVER fail a login — any error inside is
--      swallowed and the original event is returned (user logs in with default
--      claims; roles/tier populate on the next token refresh).
--   2. Re-asserts every GRANT the hook needs at runtime.
--   3. Re-asserts the provisioning trigger so new users get their rows.
--
-- AFTER running: Dashboard → Authentication → Hooks → confirm "Custom Access
-- Token" points to public.custom_access_token_hook. Then have a NEW user try
-- Google login again.
-- ============================================

-- 1. ── Fail-safe hook ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    uid    UUID;
    claims JSONB := COALESCE(event->'claims', '{}'::JSONB);
    meta   JSONB := COALESCE(claims->'app_metadata', '{}'::JSONB);
    roles  JSONB := '[]'::JSONB;
    tier   TEXT  := 'free';
BEGIN
    -- Any failure below must NOT block login. Worst case the user signs in with
    -- default claims and gets the real ones on the next token refresh.
    BEGIN
        uid := (event->>'user_id')::UUID;

        SELECT COALESCE(jsonb_agg(role::TEXT), '[]'::JSONB)
          INTO roles
          FROM public.user_roles
         WHERE user_id = uid;

        tier := public.effective_tier(uid)::TEXT;
    EXCEPTION WHEN OTHERS THEN
        -- Keep the defaults; do not re-raise.
        roles := '[]'::JSONB;
        tier  := 'free';
    END;

    meta   := meta   || jsonb_build_object('roles', roles, 'tier', tier);
    claims := claims || jsonb_build_object('app_metadata', meta);

    RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- 2. ── Grants the hook needs at runtime (idempotent) ────────────────
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) FROM authenticated, anon, public;

GRANT USAGE  ON SCHEMA public               TO supabase_auth_admin;
GRANT SELECT ON public.user_roles           TO supabase_auth_admin;
GRANT SELECT ON public.subscriptions        TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.effective_tier(UUID)                 TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role)      TO supabase_auth_admin;

-- 3. ── Re-assert new-user provisioning (idempotent) ─────────────────
DROP TRIGGER IF EXISTS on_auth_user_created_roles ON auth.users;
CREATE TRIGGER on_auth_user_created_roles
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.provision_new_user();

-- Backfill anyone who slipped through (e.g. users created while the hook was
-- broken) so their next login carries full claims.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'end_user' FROM auth.users ON CONFLICT DO NOTHING;

INSERT INTO public.subscriptions (user_id, tier)
SELECT id, 'free' FROM auth.users ON CONFLICT DO NOTHING;

DO $$ BEGIN
    RAISE NOTICE 'Fail-safe custom_access_token_hook installed + grants/trigger re-asserted.';
END $$;
