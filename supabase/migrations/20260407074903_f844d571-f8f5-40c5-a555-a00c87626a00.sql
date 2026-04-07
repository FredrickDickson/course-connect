
-- Course Templates table
CREATE TABLE public.course_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_code text NOT NULL UNIQUE,
  description text,
  banner_image_url text,
  duration_hours integer,
  format text DEFAULT 'hybrid',
  default_capacity integer DEFAULT 30,
  default_ticket_types jsonb DEFAULT '[]'::jsonb,
  default_price numeric DEFAULT 0,
  default_currency text DEFAULT 'GHS',
  enquiry_phone_1 text,
  enquiry_phone_2 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates"
  ON public.course_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON public.course_templates FOR ALL
  TO authenticated
  USING (is_admin((auth.uid())::text));

-- Add template/cohort columns to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.course_templates(id),
  ADD COLUMN IF NOT EXISTS cohort_id text,
  ADD COLUMN IF NOT EXISTS course_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS venue text;

-- Index for cohort lookups
CREATE INDEX IF NOT EXISTS idx_courses_template_id ON public.courses(template_id);
CREATE INDEX IF NOT EXISTS idx_courses_cohort_id ON public.courses(cohort_id);
CREATE INDEX IF NOT EXISTS idx_courses_course_status ON public.courses(course_status);

-- Trigger for updated_at on templates
CREATE TRIGGER update_course_templates_updated_at
  BEFORE UPDATE ON public.course_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
