-- Fix: Update a session to show on the landing page banner
-- This will schedule the "Day 3" session for tomorrow

-- Option 1: Schedule for TOMORROW (will show in banner as upcoming)
UPDATE live_sessions
SET 
    scheduled_start = NOW() + INTERVAL '1 day',
    scheduled_end = NOW() + INTERVAL '1 day' + INTERVAL '6 hours',
    status = 'scheduled',
    is_public = true
WHERE id = '621b1115-b4c9-4a8a-9566-18597fff70ba'
RETURNING 
    id, 
    title, 
    scheduled_start, 
    scheduled_end, 
    status, 
    is_public;

-- Option 2: Schedule for 2 HOURS FROM NOW (will show urgency in banner)
-- UPDATE live_sessions
-- SET 
--     scheduled_start = NOW() + INTERVAL '2 hours',
--     scheduled_end = NOW() + INTERVAL '8 hours',
--     status = 'scheduled',
--     is_public = true
-- WHERE id = '621b1115-b4c9-4a8a-9566-18597fff70ba'
-- RETURNING 
--     id, 
--     title, 
--     scheduled_start, 
--     scheduled_end, 
--     status, 
--     is_public;

-- Option 3: Make it LIVE RIGHT NOW (will show with red "LIVE NOW" badge)
-- UPDATE live_sessions
-- SET 
--     scheduled_start = NOW() - INTERVAL '10 minutes',
--     scheduled_end = NOW() + INTERVAL '2 hours',
--     status = 'live',
--     is_public = true
-- WHERE id = '621b1115-b4c9-4a8a-9566-18597fff70ba'
-- RETURNING 
--     id, 
--     title, 
--     scheduled_start, 
--     scheduled_end, 
--     status, 
--     is_public;

-- Verify the change
SELECT 
    id,
    title,
    scheduled_start,
    scheduled_end,
    status,
    is_public,
    CASE 
        WHEN scheduled_start <= NOW() AND scheduled_end >= NOW() THEN '🔴 LIVE NOW - Banner will show!'
        WHEN scheduled_start > NOW() AND scheduled_start <= NOW() + INTERVAL '7 days' THEN '📅 UPCOMING - Banner will show!'
        ELSE '❌ Will NOT show in banner'
    END as banner_visibility
FROM live_sessions
WHERE id = '621b1115-b4c9-4a8a-9566-18597fff70ba';
