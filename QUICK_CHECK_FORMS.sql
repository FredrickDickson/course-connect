-- Quick check: Are there forms in the database?
SELECT 
  COUNT(*) as total_forms,
  '📊 Forms in database' as status
FROM personal_notes_forms;

-- Show the forms
SELECT 
  id,
  full_name,
  gender,
  age,
  town_city,
  TO_CHAR(submitted_at, 'YYYY-MM-DD HH24:MI') as submitted
FROM personal_notes_forms
ORDER BY submitted_at DESC
LIMIT 10;
