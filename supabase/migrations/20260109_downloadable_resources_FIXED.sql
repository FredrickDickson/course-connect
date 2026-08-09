-- Create downloadable_resources table for student portal resources
CREATE TABLE IF NOT EXISTS public.downloadable_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('PDF', 'Guide', 'Handbook', 'Rules', 'Policy', 'Workplan', 'Document')),
  category text NOT NULL CHECK (category IN ('Arbitrator', 'Mediator', 'Both')),
  file_size text NOT NULL,
  download_url text NOT NULL,
  icon text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.downloadable_resources ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view active resources
CREATE POLICY "Anyone can view active resources"
  ON public.downloadable_resources
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can insert/update/delete resources (FIXED: using users table instead of profiles)
CREATE POLICY "Admins can manage resources"
  ON public.downloadable_resources
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_downloadable_resources_category ON public.downloadable_resources(category);
CREATE INDEX IF NOT EXISTS idx_downloadable_resources_type ON public.downloadable_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_downloadable_resources_active ON public.downloadable_resources(is_active);
CREATE INDEX IF NOT EXISTS idx_downloadable_resources_order ON public.downloadable_resources(display_order);

-- Insert initial resources from CIMA
INSERT INTO public.downloadable_resources (title, description, resource_type, category, file_size, download_url, icon, display_order) VALUES
(
  'CIMA Arbitration Rules 2025',
  'Complete arbitration rules and procedures for 2025, including general provisions, tribunal constitution, proceedings, awards, and mediation guidelines.',
  'Rules',
  'Both',
  '2.5 MB',
  'https://thecima.org/wp-content/uploads/2025/11/CIMA_Rules-Edit-Nov.pdf',
  'Scale',
  1
),
(
  'CIMA Arbitration Rules - Comparative Perspective',
  'The CIMA Arbitration and Mediation Rules 2025 analyzed in comparative perspective with international arbitration standards.',
  'Guide',
  'Arbitrator',
  '1.8 MB',
  'https://thecima.org/wp-content/uploads/2025/11/The-CIMA-Arbitration-and-Mediation-Rules-2025-in-Comparative-Perspective.pdf',
  'BookOpen',
  2
),
(
  'CIMA Primer: Opportunities for ACIMArb',
  'A comprehensive primer on opportunities for Introductory-Level Arbitration Associates (ACIMArb), including career pathways and development opportunities.',
  'Guide',
  'Arbitrator',
  '3.2 MB',
  'https://thecima.org/wp-content/uploads/2025/08/A-CIMA-Primer-Series.pdf',
  'Users',
  3
),
(
  'CIMA Code of Conduct and Policies',
  'Official Code of Conduct and institutional policies for the Center for International Mediators and Arbitrators members and practitioners.',
  'Policy',
  'Both',
  '1.2 MB',
  'https://thecima.org/wp-content/uploads/2025/01/Center-for-International-Mediators-and-Arbitrators-CoC-and-Policies.pdf',
  'FileText',
  4
),
(
  'CIMA 2026 Annual Workplan',
  'Strategic workplan and organizational objectives for 2026, outlining CIMA''s initiatives, programs, and development goals.',
  'Workplan',
  'Both',
  '1.5 MB',
  'https://thecima.org/wp-content/uploads/2025/11/2026-ANNUAL-WORKPLAN-FINAL.pdf',
  'FileSpreadsheet',
  5
),
(
  'CIMA Course Fees Structure',
  'Comprehensive fee schedule for all CIMA training programs, certifications, and professional development courses.',
  'PDF',
  'Both',
  '850 KB',
  'https://thecima.org/wp-content/uploads/2025/01/CIMA-course-fees.pdf',
  'FileText',
  6
),
(
  'Model Arbitration Clause',
  'Standard arbitration clause templates and guidance for incorporation into commercial contracts and agreements.',
  'Guide',
  'Arbitrator',
  '650 KB',
  'https://thecima.org/wp-content/uploads/2025/01/PDFgearshare.pdf',
  'FileText',
  7
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_downloadable_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_downloadable_resources_updated_at
  BEFORE UPDATE ON public.downloadable_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_downloadable_resources_updated_at();

-- Add comment
COMMENT ON TABLE public.downloadable_resources IS 'Stores downloadable resources for students including CIMA official documents, guides, and training materials';
