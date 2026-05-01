-- Add track and level fields to courses table
-- This enables courses to be associated with specific qualification tracks and levels

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS track TEXT CHECK (track IN ('ARBITRATION', 'MEDIATION')),
ADD COLUMN IF NOT EXISTS qualification_level TEXT CHECK (qualification_level IN ('ASSOCIATE', 'MEMBER', 'FELLOW'));

-- Add comments for documentation
COMMENT ON COLUMN courses.track IS 'Qualification track: ARBITRATION or MEDIATION';
COMMENT ON COLUMN courses.qualification_level IS 'Qualification level achieved: ASSOCIATE, MEMBER, or FELLOW';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_track ON courses(track);
CREATE INDEX IF NOT EXISTS idx_courses_qualification_level ON courses(qualification_level);
CREATE INDEX IF NOT EXISTS idx_courses_track_level ON courses(track, qualification_level);

-- Set default values for existing courses (if any)
-- Default to ARBITRATION and ASSOCIATE for backward compatibility
UPDATE courses
SET track = 'ARBITRATION',
    qualification_level = CASE 
        WHEN LOWER(level) = 'associate' THEN 'ASSOCIATE'
        WHEN LOWER(level) = 'member' THEN 'MEMBER'
        WHEN LOWER(level) = 'fellow' THEN 'FELLOW'
        ELSE 'ASSOCIATE'
    END
WHERE track IS NULL;
