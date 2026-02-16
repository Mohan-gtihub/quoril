-- SQL to Clean Corrupted Focus Sessions
-- Run this if you have corrupted session data causing analytics issues

-- Step 1: Check for corrupted sessions (sessions > 24 hours)
SELECT 
    id, 
    task_id,
    start_time,
    end_time,
    seconds,
    ROUND(seconds / 3600.0, 2) as hours,
    type
FROM focus_sessions 
WHERE seconds > 86400  -- More than 24 hours
ORDER BY seconds DESC;

-- Step 2: Check for negative duration sessions
SELECT 
    id,
    task_id,
    start_time,
    end_time, 
    seconds,
    type
FROM focus_sessions
WHERE seconds < 0
ORDER BY seconds ASC;

-- Step 3: BACKUP before deleting (save the corrupted data)
-- CREATE TABLE focus_sessions_corrupted_backup AS 
-- SELECT * FROM focus_sessions WHERE seconds > 86400 OR seconds < 0;

-- Step 4: DELETE corrupted sessions (CAREFUL!)
-- Uncomment to execute:
-- DELETE FROM focus_sessions WHERE seconds > 86400 OR seconds < 0;

-- Step 5: Verify clean data
SELECT 
    COUNT(*) as total_sessions,
    ROUND(AVG(seconds) / 60.0, 2) as avg_minutes,
    ROUND(MAX(seconds) / 3600.0, 2) as max_hours,
    ROUND(MIN(seconds) / 60.0, 2) as min_minutes
FROM focus_sessions;

-- Step 6: Check today's sessions specifically
SELECT 
    id,
    task_id,
    start_time,
    end_time,
    ROUND(seconds / 60.0, 2) as minutes,
    type
FROM focus_sessions
WHERE DATE(start_time) = DATE('now')
ORDER BY start_time DESC;
