-- ============================================================================
-- Ensure dedicated course images bucket exists with secure policies
-- ============================================================================
-- This migration guarantees a storage bucket dedicated to course/program
-- images. It ensures uploads are retained and publicly retrievable while still
-- enforcing tenant isolation for modifications.
-- ============================================================================

-- Create the bucket (5 MB limit, common image MIME types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-images',
  'course-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper to validate the storage path belongs to the user's tenant
CREATE OR REPLACE FUNCTION public.storage_path_belongs_to_tenant(
  path_name TEXT,
  user_tenant UUID
) RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
SET search_path = public, storage
AS $$
  SELECT
    user_tenant IS NOT NULL AND (
      (storage.foldername(path_name))[1] = user_tenant::TEXT OR
      (storage.foldername(path_name))[2] = user_tenant::TEXT
    );
$$;

GRANT EXECUTE ON FUNCTION public.storage_path_belongs_to_tenant(TEXT, UUID) TO authenticated;

-- Public read access so courses can display their images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public read access for course images'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public read access for course images"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'course-images');
  END IF;
END $$;

-- Insert permission: partners (own tenant) or staff/admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Partners can upload course images'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Partners can upload course images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'course-images' AND (
          (
            public.has_role(auth.uid(), 'partner'::public.app_role) AND
            public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
          )
          OR public.is_admin_or_staff(auth.uid())
        )
      );
  END IF;
END $$;

-- Update permission: partners (own tenant) or staff/admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Partners can update course images'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Partners can update course images"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'course-images' AND (
          (
            public.has_role(auth.uid(), 'partner'::public.app_role) AND
            public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
          )
          OR public.is_admin_or_staff(auth.uid())
        )
      )
      WITH CHECK (
        bucket_id = 'course-images' AND (
          (
            public.has_role(auth.uid(), 'partner'::public.app_role) AND
            public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
          )
          OR public.is_admin_or_staff(auth.uid())
        )
      );
  END IF;
END $$;

-- Delete permission: partners (own tenant) or staff/admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Partners can delete course images'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Partners can delete course images"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'course-images' AND (
          (
            public.has_role(auth.uid(), 'partner'::public.app_role) AND
            public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
          )
          OR public.is_admin_or_staff(auth.uid())
        )
      );
  END IF;
END $$;
