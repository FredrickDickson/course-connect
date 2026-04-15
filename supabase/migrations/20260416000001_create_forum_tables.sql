-- Create forum tables for community feature

-- Forum categories (e.g., "General Discussion", "Course Q&A")
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum boards (e.g., "CIMA F1 Discussion", "Technical Questions")
CREATE TABLE IF NOT EXISTS forum_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES forum_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  is_course_board BOOLEAN DEFAULT false,
  course_edition_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  post_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum posts
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES forum_boards(id) ON DELETE CASCADE,
  author_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  tags TEXT[],
  attachments TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_solution_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on forum tables
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - will be created in fix migration after columns are added
-- Policies moved to 20260416000002_fix_forum_schema.sql

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_posts_board_id ON forum_posts(board_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_slug ON forum_posts(slug);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_boards_category_id ON forum_boards(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_boards_slug ON forum_boards(slug);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_forum_categories_updated_at BEFORE UPDATE ON forum_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_boards_updated_at BEFORE UPDATE ON forum_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default forum categories
INSERT INTO forum_categories (name, slug, description, display_order) VALUES
  ('General Discussion', 'general', 'General discussions about CIMA and the platform', 1),
  ('Course Q&A', 'course-qa', 'Questions and answers about courses', 2),
  ('Study Groups', 'study-groups', 'Find study partners and groups', 3),
  ('Career', 'career', 'Career advice and discussions', 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert default general forum boards
INSERT INTO forum_boards (category_id, name, slug, description, is_course_board) 
SELECT 
  c.id,
  'Welcome & Introductions',
  'welcome',
  'Introduce yourself to the community',
  false
FROM forum_categories c WHERE c.slug = 'general'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO forum_boards (category_id, name, slug, description, is_course_board) 
SELECT 
  c.id,
  'General CIMA Discussion',
  'general-cima',
  'Discuss CIMA topics',
  false
FROM forum_categories c WHERE c.slug = 'general'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO forum_boards (category_id, name, slug, description, is_course_board) 
SELECT 
  c.id,
  'Technical Questions',
  'technical-questions',
  'Ask technical accounting questions',
  false
FROM forum_categories c WHERE c.slug = 'course-qa'
ON CONFLICT (slug) DO NOTHING;
