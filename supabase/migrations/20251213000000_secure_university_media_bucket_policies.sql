-- ============================================================================
-- SECURITY FIX: University Media Storage Bucket - Restrict DELETE/UPDATE
-- ============================================================================
-- 
-- VULNERABILITY: Previous policies allowed unauthorized users to DELETE and 
-- UPDATE files in the university-media bucket. This migration ensures that
-- only partners (with tenant matching) and staff/admin can modify files.
--
-- This migration:
-- 1. Drops ALL existing university-media storage policies
-- 2. Recreates the helper function for tenant path checking
-- 3. Creates secure policies using has_role() function to verify:
--    - SELECT: Public access (anyone can view university branding)
--    - INSERT: Partners (own tenant) OR staff/admin
--    - UPDATE: Partners (own tenant) OR staff/admin
--    - DELETE: Partners (own tenant) OR staff/admin
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing university-media policies (clean slate)
-- ============================================================================

-- Policies from various migrations that may exist
DROP POLICY IF EXISTS "University partners can upload media" ON storage.objects;
DROP POLICY IF EXISTS "University partners can update their media" ON storage.objects;
DROP POLICY IF EXISTS "University partners can delete their media" ON storage.objects;
DROP POLICY IF EXISTS "University partners can update media" ON storage.objects;
DROP POLICY IF EXISTS "University partners can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view university media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for university media" ON storage.objects;
DROP POLICY IF EXISTS "University tenants can upload media" ON storage.objects;
DROP POLICY IF EXISTS "University tenants can update media" ON storage.objects;
DROP POLICY IF EXISTS "University tenants can delete media" ON storage.objects;

-- ============================================================================
-- STEP 2: Create/Update helper function for tenant path verification
-- ============================================================================

-- This function checks if a storage path belongs to the user's tenant.
-- Supports multiple path structures:
--   1. Direct tenant folder: {tenant_id}/filename.ext
--   2. Subfolder structure: subfolder/{tenant_id}/filename.ext
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
  'Checks if a storage path belongs to the specified tenant. Used for RLS policies on storage buckets.';

-- Grant execute permission to authenticated users for use in RLS policies
GRANT EXECUTE ON FUNCTION public.storage_path_belongs_to_tenant(TEXT, UUID) TO authenticated;

-- ============================================================================
-- STEP 3: Create secure policies with proper role verification using has_role()
-- ============================================================================

-- -----------------------------------------------------------------------------
-- POLICY: SELECT - Public read access (anyone can view university branding)
-- -----------------------------------------------------------------------------
-- This allows university logos, hero images, and program images to be displayed
-- on the public website without authentication.
CREATE POLICY "Public read access for university media"
  ON storage.objects 
  FOR SELECT
  USING (bucket_id = 'university-media');

-- -----------------------------------------------------------------------------
-- POLICY: INSERT - Only partners (own tenant) or staff/admin can upload
-- -----------------------------------------------------------------------------
-- Partners can only upload to their own tenant's folder structure.
-- Staff and admins can upload anywhere for administrative purposes.
CREATE POLICY "University partners can upload media"
  ON storage.objects 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'university-media'
    AND (
      -- Partners can upload to their tenant folder only
      (
        public.has_role(auth.uid(), 'partner'::public.app_role)
        AND public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
      )
      -- Staff and admins can upload anywhere
      OR public.is_admin_or_staff(auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- POLICY: UPDATE - Only partners (own tenant) or staff/admin can update
-- -----------------------------------------------------------------------------
-- SECURITY: This restricts UPDATE operations to:
--   1. Users with 'partner' role who are updating files in their own tenant folder
--   2. Staff or admin users (who can update any file)
-- This prevents unauthorized users from modifying university branding assets.
CREATE POLICY "University partners can update media"
  ON storage.objects 
  FOR UPDATE 
  TO authenticated
  USING (
    bucket_id = 'university-media'
    AND (
      -- Partners can only update files in their own tenant folder
      (
        public.has_role(auth.uid(), 'partner'::public.app_role)
        AND public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
      )
      -- Staff and admins can update any file
      OR public.is_admin_or_staff(auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'university-media'
    AND (
      (
        public.has_role(auth.uid(), 'partner'::public.app_role)
        AND public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
      )
      OR public.is_admin_or_staff(auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- POLICY: DELETE - Only partners (own tenant) or staff/admin can delete
-- -----------------------------------------------------------------------------
-- SECURITY: This restricts DELETE operations to:
--   1. Users with 'partner' role who are deleting files in their own tenant folder
--   2. Staff or admin users (who can delete any file)
-- This prevents unauthorized users from deleting university branding assets.
CREATE POLICY "University partners can delete media"
  ON storage.objects 
  FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'university-media'
    AND (
      -- Partners can only delete files in their own tenant folder
      (
        public.has_role(auth.uid(), 'partner'::public.app_role)
        AND public.storage_path_belongs_to_tenant(name, public.get_user_tenant(auth.uid()))
      )
      -- Staff and admins can delete any file
      OR public.is_admin_or_staff(auth.uid())
    )
  );

-- ============================================================================
-- SECURITY SUMMARY
-- ============================================================================
-- 
-- Access Matrix for university-media bucket:
-- 
-- | Operation | Public | Student | Agent | Partner (own tenant) | Partner (other) | Staff/Admin |
-- |-----------|--------|---------|-------|---------------------|-----------------|-------------|
-- | SELECT    | ✓      | ✓       | ✓     | ✓                   | ✓               | ✓           |
-- | INSERT    | ✗      | ✗       | ✗     | ✓                   | ✗               | ✓           |
-- | UPDATE    | ✗      | ✗       | ✗     | ✓                   | ✗               | ✓           |
-- | DELETE    | ✗      | ✗       | ✗     | ✓                   | ✗               | ✓           |
-- 
-- Key Security Controls:
-- 1. has_role() - Verifies user has 'partner' role in user_roles table
-- 2. storage_path_belongs_to_tenant() - Ensures file path contains user's tenant ID
-- 3. is_admin_or_staff() - Allows administrative override for staff/admin users
--
-- This ensures:
-- - Students cannot modify university media
-- - Agents cannot modify university media  
-- - Partners can only modify their own university's media
-- - Staff and admins retain full access for administrative purposes
-- ============================================================================
