-- ============================================================================
-- Verify Zoom Registration is Disabled
-- ============================================================================
-- This script helps verify that Zoom meetings are created without registration

-- 1. Check recent sessions and their Zoom configuration
SELECT 
    id,
    title,
    scheduled_start,
    status,
    zoom_meeting_id,
    zoom_join_url,
    zoom_registration_url, -- Should be NULL or empty
    is_public,
    course_id,
    instructor_id,
    created_at
FROM live_sessions
WHERE status IN ('scheduled', 'live')
ORDER BY created_at DESC
LIMIT 5;

-- 2. Verify no registration URLs are set
SELECT 
    COUNT(*) as total_sessions,
    COUNT(zoom_registration_url) as sessions_with_registration_url,
    CASE 
        WHEN COUNT(zoom_registration_url) = 0 THEN '✅ All sessions have NO registration URL'
        ELSE '⚠️ Some sessions have registration URLs'
    END as status
FROM live_sessions
WHERE status IN ('scheduled', 'live');

-- 3. Check session participants (our internal registration)
SELECT 
    ls.title as session_title,
    ls.scheduled_start,
    COUNT(sp.id) as registered_users,
    ls.max_participants,
    CASE 
        WHEN ls.max_participants IS NULL THEN 'Unlimited'
        WHEN COUNT(sp.id) < ls.max_participants THEN 'Spots available'
        ELSE 'Full'
    END as capacity_status
FROM live_sessions ls
LEFT JOIN session_participants sp ON ls.id = sp.session_id
WHERE ls.status IN ('scheduled', 'live')
GROUP BY ls.id, ls.title, ls.scheduled_start, ls.max_participants
ORDER BY ls.scheduled_start;

-- 4. Show user registration flow (internal only)
SELECT 
    u.first_name || ' ' || u.last_name as user_name,
    u.email,
    ls.title as session_title,
    sp.registered_at,
    sp.registration_status,
    CASE 
        WHEN sp.joined_at IS NOT NULL THEN '✅ Joined session'
        WHEN ls.status = 'live' THEN '⏳ Can join now'
        WHEN ls.scheduled_start > NOW() THEN '📅 Waiting for session'
        ELSE '❌ Missed session'
    END as join_status
FROM session_participants sp
JOIN users u ON sp.user_id = u.id
JOIN live_sessions ls ON sp.session_id = ls.id
WHERE ls.status IN ('scheduled', 'live')
ORDER BY sp.registered_at DESC
LIMIT 10;

-- 5. Verify direct join capability
-- Sessions should have join_url but NO registration_url
SELECT 
    title,
    scheduled_start,
    status,
    CASE 
        WHEN zoom_join_url IS NOT NULL AND zoom_registration_url IS NULL THEN '✅ Direct join enabled'
        WHEN zoom_join_url IS NOT NULL AND zoom_registration_url IS NOT NULL THEN '⚠️ Has registration URL (should be removed)'
        ELSE '❌ Missing join URL'
    END as join_configuration,
    zoom_join_url
FROM live_sessions
WHERE status IN ('scheduled', 'live')
ORDER BY scheduled_start;
