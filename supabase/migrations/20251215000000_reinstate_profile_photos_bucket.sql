-- Ensure the profile-photos bucket exists in all environments
-- Some stacks still surface "Bucket not found" for profile avatars when the
-- bucket was never created. This migration reenforces the bucket definition
-- and policies without breaking existing setups.

-- Create or update the profile-photos bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'profile-photos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'profile-photos',
      'profile-photos',
      true, -- public so avatars render everywhere
      5242880, -- 5MB
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
    );
  ELSE
    UPDATE storage.buckets
      SET public = true,
          file_size_limit = 5242880,
          allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
    WHERE id = 'profile-photos';
  END IF;
END$$;

-- Idempotent helpers for policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND polname = 'Authenticated users can upload profile photos'
  ) THEN
    CREATE POLICY "Authenticated users can upload profile photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'profile-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND polname = 'Users can view all profile photos'
  ) THEN
    CREATE POLICY "Users can view all profile photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'profile-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND polname = 'Users can update their own profile photos'
  ) THEN
    CREATE POLICY "Users can update their own profile photos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'profile-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND polname = 'Users can delete their own profile photos'
  ) THEN
    CREATE POLICY "Users can delete their own profile photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'profile-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;
