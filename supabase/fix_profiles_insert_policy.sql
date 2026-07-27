-- ============================================================
-- Fix: "new row violates row-level security policy for table profiles"
--
-- profiles had only SELECT and UPDATE policies (supabase_setup.sql).
-- profileStore.updateProfile() writes with .upsert(), which Postgres
-- evaluates as INSERT ... ON CONFLICT UPDATE, so it is checked against
-- the INSERT policy. With none defined, RLS denied every save for users
-- whose profile row did not already exist.
--su
-- WITH CHECK (auth.uid() = id) keeps users from creating a profile row
-- owned by anyone else. Idempotent; safe to re-run.
-- ============================================================

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- The existing UPDATE policy has a USING clause but no WITH CHECK, so it
-- checks the row being replaced but not the row being written. Without it,
-- the ON CONFLICT branch of an upsert could rewrite id to another user.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

NOTIFY pgrst, 'reload schema';
