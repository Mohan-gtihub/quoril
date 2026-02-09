# 🔒 Row Level Security (RLS) Setup Guide

## What's Happening?

You're seeing this error:
```
new row violates row-level security policy (USING expression) for table "lists"
```

This is **GOOD NEWS** - it means Row Level Security is working! However, the policies need to be configured properly.

---

## 🚀 Quick Fix (5 Minutes)

### Step 1: Open Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project: `izxoyfydqsopvaywrtuz`
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the RLS Policies

1. Click **"New Query"**
2. Open the file `supabase_rls_policies.sql` in this project
3. **Copy ALL the SQL code** from that file
4. **Paste it** into the Supabase SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)

### Step 3: Verify

After running the SQL, you should see:
- ✅ "Success. No rows returned"
- ✅ Or a table showing the created policies

### Step 4: Refresh Your App

1. Go back to your app at `http://localhost:5173`
2. **Refresh the page** (F5)
3. The sync errors should be gone!

---

## 📋 What the Policies Do

The RLS policies ensure:

1. **Data Isolation**: Users can only see their own data
2. **Security**: No user can access another user's tasks, lists, or sessions
3. **Proper Authentication**: All operations verify `auth.uid()` matches `user_id`

### Policy Structure

For each table (`tasks`, `lists`, `subtasks`, `focus_sessions`), we create 4 policies:

```sql
-- SELECT: View your own data
CREATE POLICY "Users can view their own [table]"
ON [table] FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Create your own data
CREATE POLICY "Users can insert their own [table]"
ON [table] FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Modify your own data
CREATE POLICY "Users can update their own [table]"
ON [table] FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Remove your own data
CREATE POLICY "Users can delete their own [table]"
ON [table] FOR DELETE
USING (auth.uid() = user_id);
```

---

## 🔍 Troubleshooting

### Issue 1: Still Getting Errors After Running SQL

**Solution:**
1. Make sure you're **logged in** to the app
2. Check that the SQL ran successfully (no red errors)
3. Try **signing out and back in** to refresh the session
4. Clear browser cache and refresh

### Issue 2: "auth.uid() is null"

**Solution:**
This means the user isn't authenticated. Make sure:
1. You're logged in to the app
2. Your session is valid
3. The Supabase client is initialized properly

### Issue 3: Policies Not Working

**Solution:**
Run this in Supabase SQL Editor to check if RLS is enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tasks', 'lists', 'subtasks', 'focus_sessions');
```

All tables should show `rowsecurity = t` (true).

### Issue 4: "Permission Denied" Errors

**Solution:**
Make sure the `user_id` in your local database matches the authenticated user:

```sql
-- Check user_id in lists table
SELECT id, user_id, name FROM lists LIMIT 5;

-- Check current auth user
SELECT auth.uid();
```

If they don't match, you may need to update the local data or create a new account.

---

## 🎯 Why This Happened

When you first created the Supabase tables, RLS was enabled by default, but **no policies were created**. This means:

- ❌ RLS was ON (good for security)
- ❌ No policies existed (blocks all operations)
- ❌ Result: All database operations were blocked

Now with the policies:
- ✅ RLS is ON (security maintained)
- ✅ Policies exist (operations allowed for authenticated users)
- ✅ Result: Users can access their own data securely

---

## 📊 Verify Policies Are Working

After setting up RLS, run this query in Supabase SQL Editor:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see **16 policies** (4 per table × 4 tables):
- ✅ tasks: SELECT, INSERT, UPDATE, DELETE
- ✅ lists: SELECT, INSERT, UPDATE, DELETE
- ✅ subtasks: SELECT, INSERT, UPDATE, DELETE
- ✅ focus_sessions: SELECT, INSERT, UPDATE, DELETE

---

## 🔐 Security Benefits

With RLS properly configured:

1. **Multi-tenant Security**: Each user's data is completely isolated
2. **Database-level Protection**: Even if your app has a bug, users can't access others' data
3. **Automatic Enforcement**: Supabase enforces these rules on every query
4. **No Code Changes Needed**: Security is handled at the database level

---

## 📝 Summary

**What you need to do:**
1. ✅ Open Supabase SQL Editor
2. ✅ Copy & paste `supabase_rls_policies.sql`
3. ✅ Run the SQL
4. ✅ Refresh your app

**Expected result:**
- ✅ No more RLS errors
- ✅ Data syncs properly
- ✅ Secure, isolated user data

---

## 🆘 Still Need Help?

If you're still experiencing issues after following this guide:

1. **Check the browser console** for specific error messages
2. **Check Supabase logs**: Dashboard > Logs > API Logs
3. **Verify authentication**: Make sure you're logged in
4. **Check the SQL output**: Look for any red error messages

---

## 🎉 Once It's Working

After RLS is set up correctly:
- ✅ Your app will sync data seamlessly
- ✅ Each user's data is completely private
- ✅ Database operations are secure by default
- ✅ No more 403 Forbidden errors

**Your data is now secure at the database level!** 🔒

---

*Last Updated: February 9, 2026*
