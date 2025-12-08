-- Add unique constraint on profiles.email to prevent duplicate accounts
-- First, identify and keep only the most recent profile per email for partner role
-- This will clean up existing duplicates before adding the constraint

-- Create a temp table to identify profiles to keep (most recent per email)
WITH ranked_profiles AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM profiles
  WHERE email IS NOT NULL
)
-- Delete duplicate profiles (keeping most recent)
DELETE FROM profiles 
WHERE id IN (
  SELECT id FROM ranked_profiles WHERE rn > 1
);

-- Now add the unique constraint on email
ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);