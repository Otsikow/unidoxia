-- ============================================================================
-- Fix University Media Storage Bucket Security
-- ============================================================================
-- Issue: The migration 20251203184734 created overly permissive policies that
-- allow ANY authenticated user to UPDATE and DELETE files in the university-media
-- bucket, bypassing tenant isolation.
--
-- This migration:
-- 1. Drops the insecure policies from the December 3rd migration
-- 2. Ensures secure policies are in place that restrict DELETE and UPDATE to:
--    - Users with 'partner' role whose tenant folder matches the file path
--    - Staff/admin users
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop insecure policies from 20251203184734 migration
-- ============================================================================

-- These policies only check `auth.role() = 'authenticated'` which is too permissive
DROP POLICY IF EXISTS "University partners can upload media" ON storage.objects;
DROP POLICY IF EXISTS "University partners can update their media" ON storage.objects;
DROP POLICY IF EXISTS "University partners can delete their media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view university media" ON storage.objects;

-- ============================================================================
-- STEP 2: Drop existing secure policies to recreate them with role checks
-- ============================================================================

-- Drop the original policies from 20251112090000 migration
DROP POLICY IF EXISTS "Public read access for university media" ON storage.objects;
DROP POLICY IF EXISTS "University tenants can upload media" ON storage.objects;
DROP POLICY IF EXISTS "University tenants can update media" ON storage.objects;
DROP POLICY IF EXISTS "University tenants can delete media" ON storage.objects;

-- ============================================================================
-- STEP 3: Create helper function to check tenant ownership of storage path
-- ============================================================================

-- This function checks if a storage path belongs to the user's tenant.
-- It supports two path structures:
--   1. Direct tenant folder: {tenant_id}/filename.ext (used by Profile.tsx for logos/heroes)
--   2. Subfolder structure: subfolder/{tenant_id}/... (used by ProgramForm.tsx for program images)
CREATE OR REPLACE FUNCTION public.storage_path_belongs_to_tenant(
  path_name TEXT,
  user_tenant UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
SET search_path = public, storage
AS $$
  SELECT 
    user_tenant IS NOT NULL 
    AND (
      -- Check if tenant ID is in the first folder position (e.g., {tenant_id}/logo.png)
      (storage.foldername(path_name))[1] = user_tenant::TEXT
      OR
      -- Check if tenant ID is in the second folder position (e.g., program-images/{tenant_id}/...)
      (storage.foldername(path_name))[2] = user_tenant::TEXT
    );
$$;

COMMENT ON FUNCTION public.storage_path_belongs_to_tenant(TEXT, UUID) IS 
  'Checks if a storage path belongs to the specified tenant. Supports both direct tenant folders and subfolder structures.';

-- Grant execute permission to authenticated users for use in RLS policies
GRANT EXECUTE ON FUNCTION public.storage_path_belongs_to_tenant(TEXT, UUID) TO authenticated;

-- ============================================================================
-- STEP 4: Recreate secure policies with proper role and tenant checks
-- ============================================================================

-- Public read access (anyone can view university branding assets)
CREATE POLICY "Public read access for university media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'university-media');

-- INSERT: Partners can upload to their tenant folder, admins/staff can upload anywhere
CREATE POLICY "University partners can upload media"
  ON storage.objects FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'university-media'
    AND (
      -- Partners can upload to their tenant folder
      (
        public.has_role(auth.uid(), 'partner'::public.app_role)
        AND public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
      )
      -- Admins and staff can upload anywhere
      OR public.is_admin_or_staff(auth.uid())
    )
  );

-- UPDATE: Partners can update files in their tenant folder, admins/staff can update anywhere
CREATE POLICY "University partners can update media"
  ON storage.objects FOR UPDATE 
  TO authenticated
  USING (
    bucket_id = 'university-media'
    AND (
      -- Partners can update files in their tenant folder
      (
        public.has_role(auth.uid(), 'partner'::public.app_role)
        AND public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
      )
      -- Admins and staff can update any file
      OR public.is_admin_or_staff(auth.uid())
    )
  );

-- DELETE: Partners can delete files in their tenant folder, admins/staff can delete anywhere
CREATE POLICY "University partners can delete media"
  ON storage.objects FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'university-media'
    AND (
      -- Partners can delete files in their tenant folder
      (
        public.has_role(auth.uid(), 'partner'::public.app_role)
        AND public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
      )
      -- Admins and staff can delete any file
      OR public.is_admin_or_staff(auth.uid())
    )
  );

-- ============================================================================
-- Summary of security improvements:
-- ============================================================================
-- - SELECT: Public access (unchanged - needed for marketing pages)
-- - INSERT: Requires 'partner' role + tenant match, OR admin/staff
-- - UPDATE: Requires 'partner' role + tenant match, OR admin/staff
-- - DELETE: Requires 'partner' role + tenant match, OR admin/staff
--
-- Supported path structures:
-- - {tenant_id}/logo.png (Profile.tsx uploads)
-- - program-images/{tenant_id}/{user_id}/file.jpg (ProgramForm.tsx uploads)
--
-- This ensures that:
-- 1. Only authenticated users with the 'partner' role can modify files
-- 2. Partners can only modify files in their own tenant folder
-- 3. Admins and staff retain full access for administrative purposes
-- ============================================================================
