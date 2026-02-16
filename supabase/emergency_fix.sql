-- ============================================
-- EMERGENCY FIX: RELAX CONSTRAINTS & ADD TABLES
-- ============================================

-- 1. TASKS: DROP Strict Check Constraints
-- Why: App uses 'active' but DB expects 'in_progress'. 
-- We drop the constraint to allow ANY status.
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- 2. TASKS: Add missing columns (if any)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimate_m INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS spent_s INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMPTZ;

-- 3. SUBTASKS: Create or Fix (Crucial for 400 Bad Request)
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

-- Ensure RLS on subtasks
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

-- 4. FOCUS_SESSIONS: Add missing columns
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'focus';
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS seconds INTEGER DEFAULT 0;
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS metadata TEXT;

-- 5. RELOAD CACHE
NOTIFY pgrst, 'reload config';
