-- Create subtasks table
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_user_id ON public.subtasks(user_id);

-- RLS Policies
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subtasks"
    ON public.subtasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subtasks"
    ON public.subtasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subtasks"
    ON public.subtasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subtasks"
    ON public.subtasks FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.subtasks TO authenticated;
GRANT ALL ON public.subtasks TO service_role;
