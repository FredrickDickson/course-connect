-- Fix SECURITY DEFINER views to use SECURITY INVOKER
-- This ensures views respect RLS policies of the querying user
-- Fixes "Security Definer View" errors from Supabase advisors

-- Drop and recreate pathway_analytics view with SECURITY INVOKER
DROP VIEW IF EXISTS public.pathway_analytics;

CREATE VIEW public.pathway_analytics WITH (security_invoker = true) AS
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  p.pathway,
  p.level,
  COUNT(DISTINCT e.course_id) as courses_completed,
  COUNT(DISTINCT c.id) as total_courses_in_pathway,
  ROUND(
    (COUNT(DISTINCT e.course_id)::float / NULLIF(COUNT(DISTINCT c.id), 0)) * 100, 
    2
  ) as completion_percentage
FROM public.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.course_enrollments e ON e.user_id = u.id AND e.status = 'completed'
LEFT JOIN public.courses c ON c.pathway = p.pathway AND c.level = p.level
GROUP BY u.id, u.first_name, u.last_name, p.pathway, p.level;

-- Drop and recreate course_enrollments_legacy view with SECURITY INVOKER
DROP VIEW IF EXISTS public.course_enrollments_legacy;

CREATE VIEW public.course_enrollments_legacy WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.user_id,
  e.course_id,
  e.status,
  e.enrolled_at,
  e.completed_at,
  e.payment_status,
  u.first_name,
  u.last_name,
  c.title as course_title,
  c.level as course_level
FROM public.course_enrollments e
JOIN public.users u ON u.id = e.user_id
JOIN public.courses c ON c.id = e.course_id;

-- Drop and recreate course_catalog_view with SECURITY INVOKER
DROP VIEW IF EXISTS public.course_catalog_view;

CREATE VIEW public.course_catalog_view WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.title,
  c.level,
  c.pathway,
  c.price,
  c.currency,
  c.thumbnail_url,
  c.description,
  c.duration_hours,
  c.is_published,
  c.category_id,
  cat.name as category_name,
  COUNT(DISTINCT e.user_id) as enrollment_count,
  AVG(cast(r.rating as numeric)) as avg_rating,
  COUNT(r.id) as review_count
FROM public.courses c
LEFT JOIN public.categories cat ON cat.id = c.category_id
LEFT JOIN public.course_enrollments e ON e.course_id = c.id AND e.status = 'active'
LEFT JOIN public.reviews r ON r.course_id = c.id
WHERE c.is_published = true
GROUP BY c.id, c.title, c.level, c.pathway, c.price, c.currency, c.thumbnail_url, 
         c.description, c.duration_hours, c.is_published, c.category_id, cat.name;
