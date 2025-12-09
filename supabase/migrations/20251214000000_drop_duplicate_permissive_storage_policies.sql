-- ============================================================================
-- CRITICAL SECURITY FIX: Drop duplicate permissive storage policies
-- ============================================================================
--
-- VULNERABILITY: The migration 20251203184734 created overly permissive policies
-- that only check `auth.role() = 'authenticated'`. These policies allow ANY
-- authenticated user to DELETE, UPDATE, and INSERT files in the university-media
-- bucket, completely bypassing tenant isolation and role-based access controls.
--
-- Even though subsequent migrations created properly-scoped security policies,
-- PostgreSQL's PERMISSIVE policy mode means that if ANY policy allows an action,
-- the action is permitted. So the old permissive policies bypass the new secure ones.
--
-- This migration drops ONLY the duplicate permissive policies, leaving the
-- properly-scoped policies from migration 20251213000000 intact.
--
-- Policies being dropped (created in 20251203184734):
--   - "University partners can delete their media" - allows ANY authenticated user to DELETE
--   - "University partners can update their media" - allows ANY authenticated user to UPDATE
--   - "Public can view university media" - duplicate of "Public read access for university media"
--
-- Policies being preserved (created in 20251213000000):
--   - "Public read access for university media" - SELECT (public access)
--   - "University partners can upload media" - INSERT (requires partner role + tenant check)
--   - "University partners can update media" - UPDATE (requires partner role + tenant check)
--   - "University partners can delete media" - DELETE (requires partner role + tenant check)
-- ============================================================================

-- Drop the insecure permissive policies that bypass tenant isolation
-- These policies only check `auth.role() = 'authenticated'` which is insufficient

-- Insecure DELETE policy - allows ANY authenticated user to delete files
DROP POLICY IF EXISTS "University partners can delete their media" ON storage.objects;

-- Insecure UPDATE policy - allows ANY authenticated user to update files
DROP POLICY IF EXISTS "University partners can update their media" ON storage.objects;

-- Duplicate SELECT policy (the secure "Public read access for university media" already exists)
DROP POLICY IF EXISTS "Public can view university media" ON storage.objects;

-- ============================================================================
-- VERIFICATION: After this migration, only these secure policies should exist
-- for the university-media bucket:
--
-- 1. "Public read access for university media" (SELECT)
--    - Allows public read access for university branding assets
--
-- 2. "University partners can upload media" (INSERT)
--    - Requires has_role(auth.uid(), 'partner') AND tenant path match
--    - OR is_admin_or_staff(auth.uid())
--
-- 3. "University partners can update media" (UPDATE)
--    - Requires has_role(auth.uid(), 'partner') AND tenant path match
--    - OR is_admin_or_staff(auth.uid())
--
-- 4. "University partners can delete media" (DELETE)
--    - Requires has_role(auth.uid(), 'partner') AND tenant path match
--    - OR is_admin_or_staff(auth.uid())
--
-- Run this query to verify:
-- SELECT policyname, cmd, permissive, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage';
-- ============================================================================
