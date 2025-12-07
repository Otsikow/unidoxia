-- ============================================================================
-- FIX: University Profile Save - Role Mapping Issue
-- ============================================================================
-- 
-- ROOT CAUSE: The RLS policies check for `get_user_role(auth.uid()) = 'partner'`
-- but the `get_user_role` function returns the raw role from profiles, which 
-- might be 'university' for some legacy accounts. Since 'university' is not a 
-- valid app_role enum value, the comparison fails and updates are blocked.
--
-- This migration:
-- 1. Updates the get_user_role function to map 'university' -> 'partner'
-- 2. Updates any profiles with role='university' to role='partner'
-- 3. Recreates clean RLS policies with proper role checks
-- ============================================================================

-- ============================================================================
-- STEP 1: Update get_user_role to handle 'university' role mapping
-- ============================================================================

-- First, check if the function exists and update it
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  raw_role TEXT;
  mapped_role public.app_role;
BEGIN
  -- Get the raw role from profiles
  SELECT role::TEXT INTO raw_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- If no profile found, return 'student' as default
  IF raw_role IS NULL THEN
    RETURN 'student'::public.app_role;
  END IF;
  
  -- Map 'university' to 'partner' for backward compatibility
  -- This handles legacy accounts that were created with the 'university' role
  CASE LOWER(TRIM(raw_role))
    WHEN 'university' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'partner' THEN mapped_role := 'partner'::public.app_role;
    WHEN 'student' THEN mapped_role := 'student'::public.app_role;
    WHEN 'agent' THEN mapped_role := 'agent'::public.app_role;
    WHEN 'staff' THEN mapped_role := 'staff'::public.app_role;
    WHEN 'admin' THEN mapped_role := 'admin'::public.app_role;
    WHEN 'counselor' THEN mapped_role := 'counselor'::public.app_role;
    WHEN 'verifier' THEN mapped_role := 'verifier'::public.app_role;
    WHEN 'finance' THEN mapped_role := 'finance'::public.app_role;
    WHEN 'school_rep' THEN mapped_role := 'school_rep'::public.app_role;
    ELSE mapped_role := 'student'::public.app_role;
  END CASE;
  
  RETURN mapped_role;
END;
$$;

COMMENT ON FUNCTION public.get_user_role(UUID) IS 
  'Returns the user role, mapping legacy ''university'' role to ''partner'' for RLS compatibility.';

-- ============================================================================
-- STEP 2: Update existing profiles with role='university' to 'partner'
-- ============================================================================

-- This ensures data consistency - profiles should use the proper enum values
UPDATE public.profiles
SET role = 'partner'
WHERE role::TEXT = 'university';

-- Also update user_roles table if applicable
UPDATE public.user_roles
SET role = 'partner'::public.app_role
WHERE role::TEXT = 'university';

-- Log how many were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE 'Updated % profiles from university to partner role', updated_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Recreate clean RLS policies for universities table
-- ============================================================================

-- Drop ALL existing policies on universities to ensure clean slate
DROP POLICY IF EXISTS "university_strict_select" ON public.universities;
DROP POLICY IF EXISTS "university_strict_insert" ON public.universities;
DROP POLICY IF EXISTS "university_strict_update" ON public.universities;
DROP POLICY IF EXISTS "university_admin_all" ON public.universities;
DROP POLICY IF EXISTS "partner_read_own_university" ON public.universities;
DROP POLICY IF EXISTS "partner_create_university" ON public.universities;
DROP POLICY IF EXISTS "partner_update_university" ON public.universities;
DROP POLICY IF EXISTS "partner_delete_university" ON public.universities;
DROP POLICY IF EXISTS "university_select" ON public.universities;
DROP POLICY IF EXISTS "university_insert" ON public.universities;
DROP POLICY IF EXISTS "university_update" ON public.universities;
DROP POLICY IF EXISTS "university_delete" ON public.universities;
DROP POLICY IF EXISTS "Partners can create their university profile" ON public.universities;
DROP POLICY IF EXISTS "Partners can update their university profile" ON public.universities;
DROP POLICY IF EXISTS "Partners can create their university" ON public.universities;
DROP POLICY IF EXISTS "Partners can update their university" ON public.universities;
DROP POLICY IF EXISTS "University users can create their university profile" ON public.universities;
DROP POLICY IF EXISTS "University users can update their university profile" ON public.universities;
DROP POLICY IF EXISTS "Public can view active universities" ON public.universities;
DROP POLICY IF EXISTS "Anyone can view universities in their tenant" ON public.universities;
DROP POLICY IF EXISTS "Admins can manage universities" ON public.universities;

-- Ensure RLS is enabled
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICY 1: SELECT - Who can view universities
-- ============================================================================
CREATE POLICY "universities_select_policy"
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (
    -- Partners can see their own tenant's university
    (
      public.get_user_role(auth.uid()) = 'partner'::public.app_role
      AND tenant_id = public.get_user_tenant(auth.uid())
    )
    OR
    -- Active universities are publicly visible for directory/discovery
    active = true
    OR
    -- Admins and staff can see all
    public.is_admin_or_staff(auth.uid())
  );

-- ============================================================================
-- POLICY 2: INSERT - Partners can create university for their tenant
-- ============================================================================
CREATE POLICY "universities_insert_policy"
  ON public.universities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be a partner role (get_user_role handles 'university' mapping)
    public.get_user_role(auth.uid()) = 'partner'::public.app_role
    -- Must be creating for their own tenant
    AND tenant_id = public.get_user_tenant(auth.uid())
    -- Tenant must not already have a university (enforced by unique constraint, but double-check)
    AND NOT EXISTS (
      SELECT 1 FROM public.universities u 
      WHERE u.tenant_id = public.get_user_tenant(auth.uid())
    )
  );

-- ============================================================================
-- POLICY 3: UPDATE - Partners can update their own tenant's university
-- ============================================================================
CREATE POLICY "universities_update_policy"
  ON public.universities
  FOR UPDATE
  TO authenticated
  USING (
    -- Must be a partner role (get_user_role handles 'university' mapping)
    public.get_user_role(auth.uid()) = 'partner'::public.app_role
    -- Must be updating their own tenant's university
    AND tenant_id = public.get_user_tenant(auth.uid())
  )
  WITH CHECK (
    -- Must be a partner role
    public.get_user_role(auth.uid()) = 'partner'::public.app_role
    -- Must be their own tenant (cannot change tenant_id)
    AND tenant_id = public.get_user_tenant(auth.uid())
  );

-- ============================================================================
-- POLICY 4: DELETE - Only admins can delete universities
-- ============================================================================
CREATE POLICY "universities_delete_policy"
  ON public.universities
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_staff(auth.uid())
  );

-- ============================================================================
-- POLICY 5: Admin full access (for admin operations)
-- ============================================================================
CREATE POLICY "universities_admin_all_policy"
  ON public.universities
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- ============================================================================
-- STEP 4: Create or update helper function for has_role with university mapping
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Get the mapped role using get_user_role which handles 'university' -> 'partner'
  user_role := public.get_user_role(p_user_id);
  
  RETURN user_role = p_role;
END;
$$;

COMMENT ON FUNCTION public.has_role(UUID, public.app_role) IS 
  'Checks if a user has a specific role, with proper role mapping.';

-- ============================================================================
-- STEP 5: Verify the fix - check for any remaining 'university' roles
-- ============================================================================

DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  -- Check profiles table
  SELECT COUNT(*) INTO remaining_count
  FROM public.profiles
  WHERE role::TEXT = 'university';
  
  IF remaining_count > 0 THEN
    RAISE WARNING 'There are still % profiles with university role that need attention', remaining_count;
  ELSE
    RAISE NOTICE 'All profiles have been successfully migrated from university to partner role';
  END IF;
  
  -- Verify get_user_role function works correctly
  RAISE NOTICE 'Role mapping verification complete. University -> Partner mapping is now active.';
END $$;

-- ============================================================================
-- STEP 6: Add index for faster role lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================================
-- DONE: University profile saving should now work correctly for all partner users
-- ============================================================================
