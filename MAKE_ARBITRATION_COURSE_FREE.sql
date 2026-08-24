-- Step 1: Find the Arbitration course
SELECT 
    id, 
    title, 
    price, 
    is_free,
    is_published
FROM courses
WHERE title ILIKE '%Law, Practice and Procedure%Arbitration%'
   OR title ILIKE '%Domestic and international Arbitration%'
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Update to make it FREE (UPDATE THE ID BELOW WITH THE ACTUAL COURSE ID FROM STEP 1)
-- IMPORTANT: Copy the course ID from the result above and paste it in the WHERE clause below

UPDATE courses
SET 
    price = 0,
    is_free = true
WHERE id = 'PASTE_THE_COURSE_ID_HERE'; -- ⚠️ REPLACE THIS WITH ACTUAL COURSE ID

-- Step 3: Verify the update
SELECT 
    id, 
    title, 
    price, 
    is_free,
    is_published
FROM courses
WHERE title ILIKE '%Arbitration%'
ORDER BY created_at DESC;

-- After running this, the course will:
-- ✅ Show "Free" instead of "$370.00"
-- ✅ Show "Enroll Now for Free" or "Enroll for Free" button
-- ✅ Show "No payment required · Instant access" message
-- ✅ Skip payment/checkout completely - direct enrollment

