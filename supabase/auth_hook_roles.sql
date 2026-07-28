-- ============================================
-- Quoril — Custom Access Token Hook
--
-- Stamps the user's roles + effective subscription tier into the JWT so the
-- client can read them from session.user.app_metadata with ZERO DB round-trips.
--
-- Depends on: user_roles.sql (roles, effective_tier).
--
-- AFTER running this file you MUST register the hook in the Supabase Dashboard:
--   Authentication → Hooks (Beta) → "Custom Access Token" →
--   select  public.custom_access_token_hook
-- (or via CLI: set auth.hook.custom_access_token.uri to
--  "pg-functions://postgres/public/custom_access_token_hook")
--
-- Existing sessions won't carry the claims until their token next refreshes
-- (or the user signs in again).
-- ============================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    uid    UUID := (event->>'user_id')::UUID;
    claims JSONB := COALESCE(event->'claims', '{}'::JSONB);
    meta   JSONB := COALESCE(claims->'app_metadata', '{}'::JSONB);
    roles  JSONB;
    tier   TEXT;
BEGIN
    SELECT COALESCE(jsonb_agg(role::TEXT), '[]'::JSONB)
      INTO roles
      FROM public.user_roles
     WHERE user_id = uid;

    tier := public.effective_tier(uid)::TEXT;

    meta   := meta   || jsonb_build_object('roles', roles, 'tier', tier);
    claims := claims || jsonb_build_object('app_metadata', meta);

    RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- The auth admin role executes the hook.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) FROM authenticated, anon, public;

-- The hook reads these while running as supabase_auth_admin.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.user_roles TO supabase_auth_admin;
GRANT SELECT ON public.subscriptions TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.effective_tier(UUID) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO supabase_auth_admin;

DO $$ BEGIN
    RAISE NOTICE 'custom_access_token_hook installed — now register it in Dashboard → Auth → Hooks.';
END $$;
