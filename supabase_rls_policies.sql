-- ============================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Run these SQL commands in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP EXISTING POLICIES (if any)
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view their own lists" ON lists;
DROP POLICY IF EXISTS "Users can insert their own lists" ON lists;
DROP POLICY IF EXISTS "Users can update their own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete their own lists" ON lists;

DROP POLICY IF EXISTS "Users can view their own subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can insert their own subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can update their own subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can delete their own subtasks" ON subtasks;

DROP POLICY IF EXISTS "Users can view their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can insert their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can update their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can delete their own focus sessions" ON focus_sessions;

-- ============================================
-- 3. TASKS TABLE POLICIES
-- ============================================

-- Allow users to SELECT their own tasks
CREATE POLICY "Users can view their own tasks"
ON tasks
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to INSERT their own tasks
CREATE POLICY "Users can insert their own tasks"
ON tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own tasks
CREATE POLICY "Users can update their own tasks"
ON tasks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own tasks
CREATE POLICY "Users can delete their own tasks"
ON tasks
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 4. LISTS TABLE POLICIES
-- ============================================

-- Allow users to SELECT their own lists
CREATE POLICY "Users can view their own lists"
ON lists
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to INSERT their own lists
CREATE POLICY "Users can insert their own lists"
ON lists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own lists
CREATE POLICY "Users can update their own lists"
ON lists
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own lists
CREATE POLICY "Users can delete their own lists"
ON lists
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 5. SUBTASKS TABLE POLICIES
-- ============================================

-- Allow users to SELECT their own subtasks
CREATE POLICY "Users can view their own subtasks"
ON subtasks
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to INSERT their own subtasks
CREATE POLICY "Users can insert their own subtasks"
ON subtasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own subtasks
CREATE POLICY "Users can update their own subtasks"
ON subtasks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own subtasks
CREATE POLICY "Users can delete their own subtasks"
ON subtasks
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 6. FOCUS_SESSIONS TABLE POLICIES
-- ============================================

-- Allow users to SELECT their own focus sessions
CREATE POLICY "Users can view their own focus sessions"
ON focus_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to INSERT their own focus sessions
CREATE POLICY "Users can insert their own focus sessions"
ON focus_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own focus sessions
CREATE POLICY "Users can update their own focus sessions"
ON focus_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own focus sessions
CREATE POLICY "Users can delete their own focus sessions"
ON focus_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 7. VERIFY POLICIES ARE ACTIVE
-- ============================================

-- Run this to see all active policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 8. TEST POLICIES (Optional)
-- ============================================

-- Test that you can insert a list (replace with your user_id)
-- INSERT INTO lists (id, user_id, name, color, icon, sort_order, created_at, updated_at)
-- VALUES (
--     gen_random_uuid(),
--     auth.uid(),
--     'Test List',
--     '#3b82f6',
--     'list',
--     0,
--     now(),
--     now()
-- );

-- ============================================
-- NOTES
-- ============================================

-- 1. These policies ensure that:
--    - Users can only see their own data
--    - Users can only modify their own data
--    - No user can access another user's data
--
-- 2. The USING clause checks if the user can perform the action
--    The WITH CHECK clause validates the data being inserted/updated
--
-- 3. auth.uid() returns the currently authenticated user's ID
--
-- 4. After running these policies, your sync errors should be resolved
--
-- 5. If you still get errors, check that:
--    - The user is properly authenticated
--    - The user_id in your data matches auth.uid()
--    - RLS is enabled on the tables

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If you're still having issues, run this to check RLS status:
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tasks', 'lists', 'subtasks', 'focus_sessions');

-- Expected output: rowsecurity should be 't' (true) for all tables
