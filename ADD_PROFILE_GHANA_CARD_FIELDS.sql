-- ============================================
-- ADD: Profile Picture & Ghana Card Upload Fields
-- ============================================
-- This migration adds two new upload fields to the personal_notes_forms table

-- Step 1: Add profile_picture_url column (for employee photo)
ALTER TABLE personal_notes_forms 
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

-- Step 2: Add ghana_card_url column (for Ghana Card upload)
ALTER TABLE personal_notes_forms 
ADD COLUMN IF NOT EXISTS ghana_card_url VARCHAR(500);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN personal_notes_forms.profile_picture_url IS 'URL to employee profile picture stored in Supabase storage';
COMMENT ON COLUMN personal_notes_forms.ghana_card_url IS 'URL to Ghana Card document stored in Supabase storage';

-- Step 4: Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_personal_notes_forms_profile_picture 
ON personal_notes_forms(profile_picture_url) 
WHERE profile_picture_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_personal_notes_forms_ghana_card 
ON personal_notes_forms(ghana_card_url) 
WHERE ghana_card_url IS NOT NULL;

-- Verification
DO $
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Added profile_picture_url column';
  RAISE NOTICE '✅ Added ghana_card_url column';
  RAISE NOTICE '✅ Created indexes for new columns';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 New fields ready for use!';
  RAISE NOTICE '   - Profile Picture Upload: Upload employee photo';
  RAISE NOTICE '   - Ghana Card Upload: Upload official Ghana Card';
  RAISE NOTICE '';
END $;
