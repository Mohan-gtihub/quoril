-- ============================================
-- FIX SCHEMA MISMATCH
-- Run this in Supabase SQL Editor to fix 400 Errors
-- ============================================

-- 1. FIX LISTS TABLE
ALTER TABLE public.lists ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. FIX TASKS TABLE (Align with local DB)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimate_m INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS spent_s INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMPTZ;

-- 3. CREATE SUBTASKS TABLE (Was missing)
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    done BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Enable RLS for subtasks
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subtasks" ON public.subtasks;
CREATE POLICY "Users can view their own subtasks" ON public.subtasks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own subtasks" ON public.subtasks;
CREATE POLICY "Users can create their own subtasks" ON public.subtasks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subtasks" ON public.subtasks;
CREATE POLICY "Users can update their own subtasks" ON public.subtasks FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subtasks" ON public.subtasks;
CREATE POLICY "Users can delete their own subtasks" ON public.subtasks FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.subtasks TO authenticated;
GRANT ALL ON public.subtasks TO service_role;


-- 4. FIX FOCUS SESSIONS (Align with local DB)
-- We add the columns expected by the app. 
-- Existing columns like 'session_type' or 'duration_minutes' might simply be unused by the current app version.
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'focus';
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS seconds INTEGER DEFAULT 0;
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS metadata TEXT;

-- 5. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload config';
