-- Create personal_notes_forms table
CREATE TABLE IF NOT EXISTS personal_notes_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  full_name VARCHAR(255) NOT NULL,
  other_names VARCHAR(255),
  gender VARCHAR(20),
  date_of_birth DATE,
  age INTEGER,
  nationality VARCHAR(100),
  hometown VARCHAR(255),
  region VARCHAR(100),
  languages_spoken TEXT[],
  
  -- Identification Numbers
  ghana_card_no VARCHAR(100),
  passport_no VARCHAR(100),
  voter_id_no VARCHAR(100),
  nhis_no VARCHAR(100),
  tin VARCHAR(100),
  id_documents_urls TEXT[],
  
  -- Address Information
  house_no VARCHAR(100),
  street_area VARCHAR(255),
  town_city VARCHAR(100),
  gps_address VARCHAR(255),
  length_of_stay VARCHAR(100),
  
  -- Family Information
  father_name VARCHAR(255),
  mother_name VARCHAR(255),
  number_of_children INTEGER,
  children_details JSONB,
  
  -- Emergency Contacts
  nok_name VARCHAR(255),
  nok_relationship VARCHAR(100),
  nok_telephone VARCHAR(20),
  nok_address TEXT,
  nok_occupation VARCHAR(100),
  
  emergency_name VARCHAR(255),
  emergency_relationship VARCHAR(100),
  emergency_telephone VARCHAR(20),
  emergency_address TEXT,
  
  -- Education
  education_history JSONB,
  
  -- Health Information
  blood_group VARCHAR(10),
  rhesus_factor VARCHAR(10),
  medical_conditions TEXT[],
  other_medical_condition TEXT,
  known_allergies TEXT,
  current_medication TEXT,
  previous_illnesses TEXT,
  physical_limitations BOOLEAN DEFAULT FALSE,
  physical_limitations_details TEXT,
  doctor_telephone VARCHAR(20),
  vaccination_status JSONB,
  other_vaccination TEXT,
  
  -- Physical Description
  height VARCHAR(50),
  distinguishing_marks TEXT,
  left_thumb_url VARCHAR(500),
  right_thumb_url VARCHAR(500),
  
  -- Social Media
  facebook VARCHAR(255),
  tiktok VARCHAR(255),
  twitter_x VARCHAR(255),
  
  -- Declaration
  employee_signature_name VARCHAR(255),
  declaration_date DATE,
  
  -- Review Status (for admin)
  reviewed_at TIMESTAMP,
  reviewed_by_admin_id UUID,
  review_notes TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on submitted_at for sorting
CREATE INDEX IF NOT EXISTS idx_personal_notes_forms_submitted_at 
ON personal_notes_forms(submitted_at DESC);

-- Create index on reviewed status
CREATE INDEX IF NOT EXISTS idx_personal_notes_forms_reviewed 
ON personal_notes_forms(reviewed_at);

-- Create index on gender for statistics
CREATE INDEX IF NOT EXISTS idx_personal_notes_forms_gender 
ON personal_notes_forms(gender);

-- Create index on region for statistics
CREATE INDEX IF NOT EXISTS idx_personal_notes_forms_region 
ON personal_notes_forms(region);

-- Enable RLS
ALTER TABLE personal_notes_forms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public form submission" ON personal_notes_forms;
DROP POLICY IF EXISTS "Users can view own forms" ON personal_notes_forms;
DROP POLICY IF EXISTS "Admins can read all forms" ON personal_notes_forms;
DROP POLICY IF EXISTS "Admins can update forms for review" ON personal_notes_forms;

-- Create policies fresh
CREATE POLICY "Allow public form submission" ON personal_notes_forms
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own forms" ON personal_notes_forms
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can read all forms" ON personal_notes_forms
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update forms for review" ON personal_notes_forms
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create or update the personal-notes-forms storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'personal-notes-forms',
  'personal-notes-forms',
  false,
  10485760, -- 10MB limit per file
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "personal_notes_forms_allow_upload" ON storage.objects;
DROP POLICY IF EXISTS "personal_notes_forms_allow_read" ON storage.objects;

-- Create storage policies with unique names
CREATE POLICY "personal_notes_forms_allow_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'personal-notes-forms');

CREATE POLICY "personal_notes_forms_allow_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'personal-notes-forms');
