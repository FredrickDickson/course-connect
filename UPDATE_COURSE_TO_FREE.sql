-- STEP 1: Copy the course ID from the previous query
-- STEP 2: Paste it below where it says 'PASTE_COURSE_ID_HERE'
-- STEP 3: Run this query

UPDATE courses
SET 
    price = 0,
    is_free = true
WHERE id = 'PASTE_COURSE_ID_HERE';

-- After running, verify it worked:
SELECT id, title, price, is_free
FROM courses
WHERE id = 'PASTE_COURSE_ID_HERE';
