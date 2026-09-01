-- Create personal_notes_forms table to store employee information
CREATE TABLE IF NOT EXISTS personal_notes_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- A. Personal Details
  full_name TEXT NOT NULL,
  other_names TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  date_of_birth DATE NOT NULL,
  age INTEGER,
  nationality TEXT NOT NULL,
  hometown TEXT NOT NULL,
  region TEXT NOT NULL,
  languages_spoken TEXT[], -- Array of languages
  
  -- B. Identification
  ghana_card_no TEXT,
  passport_no TEXT,
  voter_id_no TEXT,
  nhis_no TEXT,
  tin TEXT,
  id_documents_urls TEXT[], -- URLs to uploaded ID documents
  
  -- C. Current Residential Address
  house_no TEXT,
  street_area TEXT NOT NULL,
  town_city TEXT NOT NULL,
  gps_address TEXT,
  length_of_stay TEXT,
  
  -- E. Family Information
  father_name TEXT,
  mother_name TEXT,
  number_of_children INTEGER DEFAULT 0,
  children_details JSONB, -- Array of {name, age}
  
  -- F. Next of Kin
  nok_name TEXT NOT NULL,
  nok_relationship TEXT NOT NULL,
  nok_telephone TEXT NOT NULL,
  nok_address TEXT NOT NULL,
  nok_occupation TEXT,
  
  -- G. Emergency Contact
  emergency_name TEXT NOT NULL,
  emergency_relationship TEXT NOT NULL,
  emergency_telephone TEXT NOT NULL,
  emergency_address TEXT NOT NULL,
  
  -- H. Education
  education_history JSONB, -- Array of {qualification, school, year}
  
  -- I. Employment History
  employment_history JSONB, -- Array of employment records
  
  -- J. References (renamed to avoid SQL keyword conflict)
  reference_history JSONB, -- Array of {name, occupation, telephone, relationship}
  
  -- K. Health Information
  blood_group TEXT,
  rhesus_factor TEXT CHECK (rhesus_factor IN ('positive', 'negative', 'unknown')),
  medical_conditions TEXT[],
  other_medical_condition TEXT,
  known_allergies TEXT,
  current_medication TEXT,
  previous_illnesses TEXT,
  physical_limitations BOOLEAN DEFAULT FALSE,
  physical_limitations_details TEXT,
  doctor_telephone TEXT,
  vaccination_status TEXT[],
  other_vaccination TEXT,
  
  -- P. Social Media (Optional)
  facebook TEXT,
  tiktok TEXT,
  twitter_x TEXT,
  
  -- R. Biometric Record
  height TEXT,
  distinguishing_marks TEXT,
  left_thumb_url TEXT, -- URL to thumb impression image
  right_thumb_url TEXT, -- URL to thumb impression image
  
  -- S. Declaration
  employee_signature_url TEXT,
  employee_signature_name TEXT NOT NULL,
  declaration_date DATE NOT NULL,
  
  -- T. Employer's Record
  date_interviewed DATE,
  date_engaged DATE,
  position TEXT,
  
  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by_user_id UUID,
  
  -- Privacy & Security
  is_confidential BOOLEAN DEFAULT TRUE,
  reviewed_by_admin_id UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

-- Enable RLS
ALTER TABLE personal_notes_forms ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit a form (for public link access)
CREATE POLICY "Anyone can insert personal notes form"
  ON personal_notes_forms
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can view forms
CREATE POLICY "Admins can view all forms"
  ON personal_notes_forms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can update forms (for reviewing)
CREATE POLICY "Admins can update forms"
  ON personal_notes_forms
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_personal_notes_forms_submitted_at 
  ON personal_notes_forms(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_personal_notes_forms_full_name 
  ON personal_notes_forms(full_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_personal_notes_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_personal_notes_forms_updated_at
  BEFORE UPDATE ON personal_notes_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_notes_forms_updated_at();

-- Create storage bucket for personal notes form files
INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-notes-forms', 'personal-notes-forms', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for personal notes forms
CREATE POLICY "Anyone can upload to personal-notes-forms during submission"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'personal-notes-forms');

CREATE POLICY "Admins can view personal-notes-forms files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'personal-notes-forms'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

COMMENT ON TABLE personal_notes_forms IS 'Stores confidential employee personal information forms for CIMA household/organization security and administrative purposes';
