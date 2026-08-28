-- Debug script to check why the landing page banner is not showing

-- 1. Check if there are any live sessions at all
SELECT COUNT(*) as total_sessions FROM live_sessions;

-- 2. Check sessions that should appear on landing (public sessions)
SELECT 
    id,
    title,
    session_type,
    scheduled_start,
    scheduled_end,
    status,
    is_public,
    instructor_id,
    CASE 
        WHEN scheduled_start <= NOW() AND scheduled_end >= NOW() THEN '🔴 LIVE NOW'
        WHEN scheduled_start > NOW() AND scheduled_start <= NOW() + INTERVAL '7 days' THEN '📅 UPCOMING (within 7 days)'
        WHEN scheduled_start > NOW() + INTERVAL '7 days' THEN '📆 FUTURE (after 7 days)'
        ELSE '⏱️ PAST'
    END as banner_status
FROM live_sessions
WHERE is_public = true
ORDER BY scheduled_start ASC;

-- 3. Check sessions that match the EXACT banner query criteria for "LIVE NOW"
SELECT 
    id,
    title,
    scheduled_start,
    scheduled_end,
    status,
    is_public,
    '✅ WOULD SHOW AS LIVE' as note
FROM live_sessions
WHERE status IN ('live', 'scheduled')
  AND scheduled_start <= NOW()
  AND scheduled_end >= NOW()
  AND is_public = true
ORDER BY scheduled_start ASC
LIMIT 1;

-- 4. Check sessions that match the EXACT banner query criteria for "UPCOMING SCHEDULED"
SELECT 
    id,
    title,
    scheduled_start,
    scheduled_end,
    status,
    is_public,
    '✅ WOULD SHOW AS UPCOMING' as note
FROM live_sessions
WHERE status = 'scheduled'
  AND is_public = true
  AND scheduled_start >= NOW()
  AND scheduled_start <= NOW() + INTERVAL '7 days'
ORDER BY scheduled_start ASC
LIMIT 1;

-- 5. Find sessions that are close but don't match (potential issues)
SELECT 
    id,
    title,
    scheduled_start,
    scheduled_end,
    status,
    is_public,
    CASE 
        WHEN is_public = false THEN '❌ NOT PUBLIC'
        WHEN status NOT IN ('live', 'scheduled') THEN '❌ STATUS IS: ' || status
        WHEN scheduled_start > NOW() + INTERVAL '7 days' THEN '❌ TOO FAR IN FUTURE'
        WHEN scheduled_end < NOW() THEN '❌ ALREADY ENDED'
        ELSE '❓ OTHER ISSUE'
    END as issue
FROM live_sessions
WHERE scheduled_start >= NOW() - INTERVAL '1 day'
ORDER BY scheduled_start ASC;

-- 6. Quick fix: Make the next upcoming session public and scheduled
-- UNCOMMENT THE LINES BELOW TO FIX:

-- UPDATE live_sessions
-- SET is_public = true,
--     status = 'scheduled'
-- WHERE id = (
--     SELECT id FROM live_sessions
--     WHERE scheduled_start >= NOW()
--     ORDER BY scheduled_start ASC
--     LIMIT 1
-- )
-- RETURNING id, title, is_public, status, scheduled_start;
