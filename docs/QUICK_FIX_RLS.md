# 🚨 QUICK FIX: RLS Error Resolution

## The Error You're Seeing
```
[Sync] lists failed: new row violates row-level security policy
403 Forbidden
```

## ⚡ 3-Step Fix (2 Minutes)

### 1️⃣ Open Supabase
- Go to: https://app.supabase.com
- Select project: `izxoyfydqsopvaywrtuz`
- Click: **SQL Editor** → **New Query**

### 2️⃣ Run This SQL
Copy and paste this into the SQL Editor and click **Run**:

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- LISTS POLICIES
CREATE POLICY "Users can view their own lists" ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own lists" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lists" ON lists FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lists" ON lists FOR DELETE USING (auth.uid() = user_id);

-- TASKS POLICIES
CREATE POLICY "Users can view their own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- SUBTASKS POLICIES
CREATE POLICY "Users can view their own subtasks" ON subtasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subtasks" ON subtasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subtasks" ON subtasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subtasks" ON subtasks FOR DELETE USING (auth.uid() = user_id);

-- FOCUS_SESSIONS POLICIES
CREATE POLICY "Users can view their own focus sessions" ON focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own focus sessions" ON focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own focus sessions" ON focus_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own focus sessions" ON focus_sessions FOR DELETE USING (auth.uid() = user_id);
```

### 3️⃣ Refresh Your App
- Press **F5** in your browser
- Errors should be gone! ✅

---

## 📖 More Details
See `RLS_SETUP_GUIDE.md` for complete instructions and troubleshooting.

---

## ✅ What This Does
- Allows users to access **only their own data**
- Prevents users from seeing other users' data
- Fixes the 403 Forbidden errors
- Maintains database-level security

---

## 🎯 Expected Result
After running the SQL:
- ✅ No more sync errors
- ✅ Data syncs properly
- ✅ Secure multi-user support
