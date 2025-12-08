-- ============================================================================
-- Ensure profile-photos storage bucket exists
-- ============================================================================
-- Issue: The profile-photos bucket may not exist in some environments,
-- causing "Bucket not found" errors when users try to upload profile avatars.
--
-- This migration ensures the bucket exists with proper configuration and
-- RLS policies for authenticated users to manage their profile photos.
-- ============================================================================

-- Create the profile-photos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos', 
  'profile-photos', 
  true,  -- Public bucket so avatars can be displayed
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Drop existing policies to recreate them cleanly
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;

-- ============================================================================
-- Create storage policies for profile photos
-- ============================================================================

-- Allow any authenticated user to upload to their own folder
CREATE POLICY "Authenticated users can upload profile photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access so avatars display everywhere
CREATE POLICY "Users can view all profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

-- Allow users to update their own profile photos
CREATE POLICY "Users can update their own profile photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own profile photos
CREATE POLICY "Users can delete their own profile photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- Summary:
-- ============================================================================
-- - Bucket: profile-photos (public, 5MB limit, image types only)
-- - INSERT: Users can upload to their own folder ({user_id}/filename)
-- - SELECT: Public access (avatars need to be viewable by everyone)
-- - UPDATE: Users can only update their own photos
-- - DELETE: Users can only delete their own photos
-- ============================================================================
