-- Make sharifiddrisu205@gmail.com an admin user
-- Run this in your Supabase SQL Editor

-- First, find the user ID
DO $$
DECLARE
  user_id_var UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO user_id_var
  FROM auth.users
  WHERE email = 'sharifiddrisu205@gmail.com';

  -- If user exists, update their role
  IF user_id_var IS NOT NULL THEN
    -- Update role in users table
    UPDATE users
    SET role = 'admin'
    WHERE id = user_id_var;

    -- Also update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"admin"'
    )
    WHERE id = user_id_var;

    RAISE NOTICE 'User % has been made an admin', user_id_var;
  ELSE
    RAISE NOTICE 'User with email sharifiddrisu205@gmail.com not found. Please register first.';
  END IF;
END $$;

-- Verify the change
SELECT 
  u.id,
  u.email,
  users.role,
  u.raw_user_meta_data->>'role' as metadata_role
FROM auth.users u
LEFT JOIN users ON users.id = u.id
WHERE u.email = 'sharifiddrisu205@gmail.com';
