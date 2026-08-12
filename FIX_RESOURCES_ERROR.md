# Fix Resources Table Error - Quick Solution

## Problem
The error shows: `Could not find the table 'public.downloadable_resources' in the schema cache`

This means the database table hasn't been created yet.

## Solution: Run SQL Migration in Supabase Dashboard

### Step 1: Go to Supabase SQL Editor
1. Open your browser and go to: https://supabase.com/dashboard/project/emvibxbcrvritkwkguya
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Copy and Paste the SQL Below

```sql
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

-- Only admins can insert/update/delete resources
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
```

### Step 3: Run the SQL
1. Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for the success message: "Success. No rows returned"

### Step 4: Refresh Your Application
1. Go back to your app at https://cimalearn.thecima.org/resources
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. The resources should now load correctly!

## What This Does:
- ✅ Creates the `downloadable_resources` table
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Adds 7 official CIMA resources
- ✅ Creates indexes for fast queries
- ✅ Sets up automatic `updated_at` timestamp

## Verify It Worked:
After running the SQL, you should see:
1. No more 404 errors in browser console
2. Resources page shows downloadable documents
3. Admin dashboard has "Resources" tab with management interface

## Troubleshooting:
If you still see errors after running the SQL:
1. Check that you're logged in to Supabase dashboard
2. Make sure you selected the correct project (emvibxbcrvritkwkguya)
3. Try running each SQL statement separately if the full script fails
4. Check for any error messages in the SQL editor

## Alternative: Use Supabase CLI (if you prefer)
If you have the real DATABASE_URL, you can also run:
```bash
supabase db push --db-url "your_real_database_url_here"
```

But the SQL Editor method is simpler and more reliable!
