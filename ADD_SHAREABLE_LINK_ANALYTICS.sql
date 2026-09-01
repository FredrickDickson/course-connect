-- Optional: Add shareable link analytics tracking
-- This allows admins to track how many people visit courses via shareable links

-- Create a table to track course link visits (optional analytics)
CREATE TABLE IF NOT EXISTS public.course_link_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visitor_ip TEXT,
  referrer TEXT,
  user_agent TEXT,
  converted_to_enrollment BOOLEAN DEFAULT FALSE,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_course_link_visits_course_id ON public.course_link_visits(course_id);
CREATE INDEX IF NOT EXISTS idx_course_link_visits_visited_at ON public.course_link_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_link_visits_converted ON public.course_link_visits(course_id, converted_to_enrollment);

-- Enable RLS
ALTER TABLE public.course_link_visits ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view analytics
CREATE POLICY "Admins can view all course visit analytics"
  ON public.course_link_visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Allow anonymous link visit tracking (insert only)
CREATE POLICY "Allow anonymous course visit tracking"
  ON public.course_link_visits
  FOR INSERT
  WITH CHECK (true);

-- Add a view for easy analytics
CREATE OR REPLACE VIEW public.course_link_analytics AS
SELECT 
  c.id as course_id,
  c.title as course_title,
  COUNT(clv.id) as total_visits,
  COUNT(DISTINCT clv.visitor_ip) as unique_visitors,
  COUNT(CASE WHEN clv.converted_to_enrollment = true THEN 1 END) as conversions,
  ROUND(
    CASE 
      WHEN COUNT(clv.id) > 0 
      THEN (COUNT(CASE WHEN clv.converted_to_enrollment = true THEN 1 END)::NUMERIC / COUNT(clv.id)::NUMERIC) * 100 
      ELSE 0 
    END, 
    2
  ) as conversion_rate_percent,
  MAX(clv.visited_at) as last_visit
FROM public.courses c
LEFT JOIN public.course_link_visits clv ON c.id = clv.course_id
GROUP BY c.id, c.title;

-- Grant access to view for admins
GRANT SELECT ON public.course_link_analytics TO authenticated;

COMMENT ON TABLE public.course_link_visits IS 'Tracks visits to courses via shareable links for analytics';
COMMENT ON VIEW public.course_link_analytics IS 'Aggregated analytics for course shareable link performance';

-- Note: This is optional. The shareable link feature works without this analytics table.
-- To implement tracking, add a call to record visits when users land on /course/:id page
