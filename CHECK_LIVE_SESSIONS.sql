-- Check all live sessions in the database
SELECT 
    id,
    title,
    session_type,
    scheduled_start,
    scheduled_end,
    status,
    instructor_id,
    is_public,
    created_at
FROM live_sessions
ORDER BY scheduled_start DESC
LIMIT 20;

-- Check with current user filter (if you know your user ID)
-- Replace 'YOUR_USER_ID' with your actual user ID
-- SELECT * FROM live_sessions 
-- WHERE instructor_id = 'YOUR_USER_ID' OR is_public = true
-- ORDER BY scheduled_start DESC;

-- Check upcoming sessions (sessions that haven't ended yet)
SELECT 
    id,
    title,
    session_type,
    scheduled_start,
    scheduled_end,
    status,
    CASE 
        WHEN scheduled_end >= NOW() THEN 'UPCOMING/ACTIVE'
        ELSE 'PAST'
    END as time_status
FROM live_sessions
WHERE scheduled_end >= NOW()
ORDER BY scheduled_start ASC;
