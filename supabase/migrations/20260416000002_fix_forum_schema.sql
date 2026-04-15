-- Fix existing forum tables - add missing columns

-- Add is_active column to forum_categories if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='forum_categories' AND column_name='is_active') THEN
    ALTER TABLE forum_categories ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add is_active column to forum_boards if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='forum_boards' AND column_name='is_active') THEN
    ALTER TABLE forum_boards ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add missing columns to forum_boards
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='forum_boards' AND column_name='post_count') THEN
    ALTER TABLE forum_boards ADD COLUMN post_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add missing columns to forum_posts
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='forum_posts' AND column_name='slug') THEN
    ALTER TABLE forum_posts ADD COLUMN slug VARCHAR(300);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='forum_posts' AND column_name='tags') THEN
    ALTER TABLE forum_posts ADD COLUMN tags TEXT[];
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='forum_posts' AND column_name='attachments') THEN
    ALTER TABLE forum_posts ADD COLUMN attachments TEXT[];
  END IF;
END $$;

-- Set default values for existing rows
UPDATE forum_categories SET is_active = true WHERE is_active IS NULL;
UPDATE forum_boards SET is_active = true WHERE is_active IS NULL;
UPDATE forum_boards SET post_count = 0 WHERE post_count IS NULL;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "forum_categories_public_read" ON forum_categories;
DROP POLICY IF EXISTS "forum_boards_public_read" ON forum_boards;
DROP POLICY IF EXISTS "forum_posts_public_read" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_user_create" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_user_update_own" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_user_delete_own" ON forum_posts;

-- Recreate RLS Policies
CREATE POLICY "forum_categories_public_read" ON forum_categories FOR SELECT USING (is_active = true);
CREATE POLICY "forum_boards_public_read" ON forum_boards FOR SELECT USING (is_active = true);
CREATE POLICY "forum_posts_public_read" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_user_create" ON forum_posts FOR INSERT WITH CHECK (auth.uid()::text = author_id::text);
CREATE POLICY "forum_posts_user_update_own" ON forum_posts FOR UPDATE USING (auth.uid()::text = author_id::text);
CREATE POLICY "forum_posts_user_delete_own" ON forum_posts FOR DELETE USING (auth.uid()::text = author_id::text);
