-- Initialize track_progress rows automatically when a new user is created
-- This ensures the eligibility check never needs to do synchronous initialization

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize track_progress for both ARBITRATION and MEDIATION tracks
  INSERT INTO track_progress (user_id, track, level, pathway)
  VALUES 
    (NEW.id, 'ARBITRATION', 'NONE', 'STANDARD'),
    (NEW.id, 'MEDIATION', 'NONE', 'STANDARD')
  ON CONFLICT (user_id, track) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to initialize track_progress on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Also handle users created directly in public.users (backfill scenario)
CREATE OR REPLACE FUNCTION handle_public_user_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize track_progress for both ARBITRATION and MEDIATION tracks
  INSERT INTO track_progress (user_id, track, level, pathway)
  VALUES 
    (NEW.id, 'ARBITRATION', 'NONE', 'STANDARD'),
    (NEW.id, 'MEDIATION', 'NONE', 'STANDARD')
  ON CONFLICT (user_id, track) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_public_user_created ON public.users;

-- Create trigger to initialize track_progress on public.users insert
CREATE TRIGGER on_public_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_public_user_created();
