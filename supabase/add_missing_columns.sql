-- Add archived_at to lists table
ALTER TABLE public.lists ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add deleted_at to subtasks table (for consistent soft deletes)
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
