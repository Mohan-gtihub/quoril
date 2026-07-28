-- ============================================
-- Quoril — Roles & Subscription Entitlements
-- (run once; safe to re-run)
--
-- Two SEPARATE dimensions:
--   1. ROLES        — many per user (admin, alpha_tester, beta_tester,
--                     blog_publisher, end_user). Persona / capability flags.
--   2. SUBSCRIPTION — exactly one tier per user (free/monthly/annual/lifetime).
--
-- Alpha/beta testers get FULL premium access for free until an admin revokes
-- the role (or sets subscriptions.override_until in the past). No payment
-- provider yet — subscriptions.tier is set manually from the admin panel;
-- Stripe/Razorpay webhooks can update it later without schema changes.
-- ============================================

-- ---------- Enums ----------
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM
        ('admin', 'alpha_tester', 'beta_tester', 'blog_publisher', 'end_user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_tier AS ENUM
        ('free', 'monthly', 'annual', 'lifetime');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Tables ----------
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role       public.app_role NOT NULL,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier               public.subscription_tier NOT NULL DEFAULT 'free',
    status             TEXT NOT NULL DEFAULT 'active',     -- active / past_due / cancelled
    -- When a tester's free-premium access ends. NULL = open-ended (access until
    -- the alpha/beta role is revoked). A past timestamp cuts access immediately.
    override_until     TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,                          -- for real paid subs
    provider           TEXT,                                 -- 'stripe' | 'razorpay' | NULL
    provider_ref       TEXT,                                 -- external subscription id
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Helper functions (SECURITY DEFINER so RLS policies can call them
--            without recursing into user_roles' own policies) ----------

CREATE OR REPLACE FUNCTION public.has_role(uid UUID, r public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = uid AND role = r
    );
$$;

-- Convenience: is the CURRENT caller an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'admin');
$$;

-- Effective tier: a paid tier wins; otherwise alpha/beta testers are treated as
-- 'lifetime' (full access) while their override window is open.
CREATE OR REPLACE FUNCTION public.effective_tier(uid UUID)
RETURNS public.subscription_tier
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT CASE
        WHEN s.tier IS NOT NULL AND s.tier <> 'free'
             AND s.status = 'active' THEN s.tier
        WHEN (public.has_role(uid, 'alpha_tester')
              OR public.has_role(uid, 'beta_tester'))
             AND (s.override_until IS NULL OR s.override_until > NOW())
            THEN 'lifetime'::public.subscription_tier
        ELSE 'free'::public.subscription_tier
    END
    FROM (SELECT 1) _
    LEFT JOIN public.subscriptions s ON s.user_id = uid;
$$;

CREATE OR REPLACE FUNCTION public.is_premium(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT public.effective_tier(uid) <> 'free';
$$;

-- ---------- Default row provisioning on signup ----------
-- Every new auth user gets an 'end_user' role + a 'free' subscription row.
CREATE OR REPLACE FUNCTION public.provision_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'end_user')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.subscriptions (user_id, tier)
    VALUES (NEW.id, 'free')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_roles ON auth.users;
CREATE TRIGGER on_auth_user_created_roles
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.provision_new_user();

-- Keep subscriptions.updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_subscription_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.touch_subscription_updated_at();

-- ---------- Backfill existing users ----------
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'end_user' FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.subscriptions (user_id, tier)
SELECT id, 'free' FROM auth.users
ON CONFLICT DO NOTHING;

-- ---------- Row Level Security ----------
ALTER TABLE public.user_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- user_roles: a user may READ their own roles; only admins may write.
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- subscriptions: a user may READ their own; only admins may write.
DROP POLICY IF EXISTS "read own subscription" ON public.subscriptions;
CREATE POLICY "read own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "admins manage subscriptions" ON public.subscriptions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Grants ----------
GRANT SELECT ON public.user_roles    TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL    ON public.user_roles    TO service_role;
GRANT ALL    ON public.subscriptions TO service_role;

-- has_role / effective_tier are SECURITY DEFINER; expose to callers.
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium(UUID) TO authenticated;

DO $$ BEGIN RAISE NOTICE 'Roles & entitlements installed.'; END $$;
