-- Update Day 3 session to TODAY's schedule (9:00 AM - 4:45 PM)
-- This will make the banner show immediately

UPDATE live_sessions
SET 
    scheduled_start = CURRENT_DATE + TIME '09:00:00',
    scheduled_end = CURRENT_DATE + TIME '16:45:00',
    status = CASE 
        WHEN CURRENT_TIME < TIME '09:00:00' THEN 'scheduled'
        WHEN CURRENT_TIME >= TIME '09:00:00' AND CURRENT_TIME <= TIME '16:45:00' THEN 'live'
        ELSE 'scheduled'
    END,
    is_public = true
WHERE id = '621b1115-b4c9-4a8a-9566-18597fff70ba'
RETURNING 
    id, 
    title, 
    scheduled_start, 
    scheduled_end, 
    status, 
    is_public,
    CURRENT_TIME as current_time;

-- Verify the session will show on landing page
SELECT 
    id,
    title,
    scheduled_start,
    scheduled_end,
    status,
    is_public,
    CURRENT_TIME as current_time,
    CASE 
        WHEN scheduled_start <= NOW() AND scheduled_end >= NOW() THEN '🔴 LIVE NOW - Banner will show with red badge!'
        WHEN scheduled_start > NOW() AND scheduled_start <= NOW() + INTERVAL '7 days' THEN '📅 STARTING SOON - Banner will show!'
        ELSE '❌ Will NOT show in banner'
    END as banner_status,
    CASE 
        WHEN scheduled_start > NOW() THEN 
            EXTRACT(EPOCH FROM (scheduled_start - NOW())) / 60 || ' minutes until start'
        WHEN scheduled_start <= NOW() AND scheduled_end >= NOW() THEN
            'SESSION IS LIVE NOW!'
        ELSE 'Session ended'
    END as time_info
FROM live_sessions
WHERE id = '621b1115-b4c9-4a8a-9566-18597fff70ba';
