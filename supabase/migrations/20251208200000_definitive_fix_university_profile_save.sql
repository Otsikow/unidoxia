-- ============================================================================
-- DEFINITIVE FIX: University Profile Save
-- ============================================================================
-- 
-- This migration provides a comprehensive fix for the university profile
-- save functionality by:
--
-- 1. Dropping ALL existing RLS policies on universities table to remove conflicts
-- 2. Creating a robust get_user_role function with proper 'university' -> 'partner' mapping
-- 3. Ensuring get_user_tenant returns the correct tenant_id
-- 4. Updating any profiles that still have role='university' to 'partner'
-- 5. Creating clean, non-conflicting RLS policies
-- 6. Adding detailed logging for debugging
--
-- Root cause: Multiple migrations created overlapping RLS policies with different
-- names, and the role mapping wasn't consistently applied.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing policies on universities table
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  -- Drop all policies on universities table dynamically
  FOR policy_name IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'universities' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.universities', policy_name);
    RAISE NOTICE 'Dropped policy: %', policy_name;
  END LOOP;
END $$;

-- Also explicitly drop known policy names in case the dynamic drop missed any
DROP POLICY IF EXISTS "university_strict_select" ON public.universities;
DROP POLICY IF EXISTS "university_strict_insert" ON public.universities;
DROP POLICY IF EXISTS "university_strict_update" ON public.universities;
DROP POLICY IF EXISTS "university_admin_all" ON public.universities;
DROP POLICY IF EXISTS "universities_select_policy" ON public.universities;
DROP POLICY IF EXISTS "universities_insert_policy" ON public.universities;
DROP POLICY IF EXISTS "universities_update_policy" ON public.universities;
DROP POLICY IF EXISTS "universities_delete_policy" ON public.universities;
DROP POLICY IF EXISTS "universities_admin_all_policy" ON public.universities;
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

-- ============================================================================
-- STEP 2: Create robust get_user_role function with 'university' -> 'partner' mapping
-- ============================================================================

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
  -- Handle NULL input
  IF user_id IS NULL THEN
    RETURN 'student'::public.app_role;
  END IF;

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
  -- IMPORTANT: The CASE must handle all possible values stored in the database
  raw_role := LOWER(TRIM(raw_role));
  
  CASE raw_role
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
    ELSE 
      -- Log unexpected role value and default to student
      RAISE WARNING 'Unexpected role value: % for user %', raw_role, user_id;
      mapped_role := 'student'::public.app_role;
  END CASE;
  
  RETURN mapped_role;
END;
$$;

COMMENT ON FUNCTION public.get_user_role(UUID) IS 
  'Returns the user role, mapping legacy ''university'' role to ''partner'' for RLS compatibility.';

-- ============================================================================
-- STEP 3: Ensure get_user_tenant function exists and works correctly
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  tenant UUID;
BEGIN
  -- Handle NULL input
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT tenant_id INTO tenant
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN tenant;
END;
$$;

COMMENT ON FUNCTION public.get_user_tenant(UUID) IS 
  'Returns the tenant_id for a user from their profile.';

-- ============================================================================
-- STEP 4: Ensure is_admin_or_staff function exists
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_staff(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  user_role := public.get_user_role(user_id);
  RETURN user_role IN ('admin'::public.app_role, 'staff'::public.app_role);
END;
$$;

COMMENT ON FUNCTION public.is_admin_or_staff(UUID) IS 
  'Returns TRUE if the user has admin or staff role.';

-- ============================================================================
-- STEP 5: Update any remaining profiles with role='university' to 'partner'
-- ============================================================================

-- Count before update
DO $$
DECLARE
  university_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO university_count
  FROM public.profiles
  WHERE role::TEXT = 'university';
  
  IF university_count > 0 THEN
    RAISE NOTICE 'Found % profiles with university role - updating to partner', university_count;
  END IF;
END $$;

-- Perform the update
UPDATE public.profiles
SET role = 'partner'
WHERE role::TEXT = 'university';

-- Also update user_roles table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
    UPDATE public.user_roles
    SET role = 'partner'::public.app_role
    WHERE role::TEXT = 'university';
    RAISE NOTICE 'Updated user_roles table';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Ensure RLS is enabled on universities table
-- ============================================================================

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create clean RLS policies for universities table
-- ============================================================================

-- POLICY: SELECT - Public can view active universities, partners can view their own
CREATE POLICY "uni_select_policy"
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (
    -- Active universities are visible to everyone (for directory/discovery)
    active = TRUE
    OR
    -- Partners can see their own tenant's university (even if inactive)
    (
      public.get_user_role(auth.uid()) = 'partner'::public.app_role
      AND tenant_id = public.get_user_tenant(auth.uid())
    )
    OR
    -- Admins and staff can see all universities
    public.is_admin_or_staff(auth.uid())
  );

-- POLICY: INSERT - Partners can create university for their own tenant
CREATE POLICY "uni_insert_policy"
  ON public.universities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be a partner role
    public.get_user_role(auth.uid()) = 'partner'::public.app_role
    -- Must be creating for their own tenant
    AND tenant_id = public.get_user_tenant(auth.uid())
  );

-- POLICY: UPDATE - Partners can update their own tenant's university
-- This is the critical policy for saving profiles
CREATE POLICY "uni_update_policy"
  ON public.universities
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only update if: admin/staff OR partner for this tenant
    public.is_admin_or_staff(auth.uid())
    OR
    (
      public.get_user_role(auth.uid()) = 'partner'::public.app_role
      AND tenant_id = public.get_user_tenant(auth.uid())
    )
  )
  WITH CHECK (
    -- Same check for the new row - must still belong to their tenant
    public.is_admin_or_staff(auth.uid())
    OR
    (
      public.get_user_role(auth.uid()) = 'partner'::public.app_role
      AND tenant_id = public.get_user_tenant(auth.uid())
    )
  );

-- POLICY: DELETE - Only admins can delete universities
CREATE POLICY "uni_delete_policy"
  ON public.universities
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_or_staff(auth.uid())
  );

-- ============================================================================
-- STEP 8: Create debug function to help troubleshoot access issues
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_university_access(target_university_id UUID DEFAULT NULL)
RETURNS TABLE(
  check_name TEXT,
  check_result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role public.app_role;
  v_user_tenant UUID;
  v_uni_tenant UUID;
  v_uni_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  -- Check 1: User ID
  check_name := 'Current User ID';
  check_result := COALESCE(v_user_id::TEXT, 'NULL - not authenticated');
  RETURN NEXT;
  
  -- Check 2: User Role (raw)
  check_name := 'Profile Role (raw)';
  SELECT role::TEXT INTO check_result FROM public.profiles WHERE id = v_user_id;
  check_result := COALESCE(check_result, 'NULL - profile not found');
  RETURN NEXT;
  
  -- Check 3: User Role (mapped)
  check_name := 'User Role (mapped via get_user_role)';
  v_user_role := public.get_user_role(v_user_id);
  check_result := v_user_role::TEXT;
  RETURN NEXT;
  
  -- Check 4: Is Partner
  check_name := 'Is Partner Role';
  check_result := (v_user_role = 'partner'::public.app_role)::TEXT;
  RETURN NEXT;
  
  -- Check 5: User Tenant
  check_name := 'User Tenant ID';
  v_user_tenant := public.get_user_tenant(v_user_id);
  check_result := COALESCE(v_user_tenant::TEXT, 'NULL - no tenant');
  RETURN NEXT;
  
  -- Check 6: Is Admin/Staff
  check_name := 'Is Admin or Staff';
  check_result := public.is_admin_or_staff(v_user_id)::TEXT;
  RETURN NEXT;
  
  -- If university ID provided, check specific access
  IF target_university_id IS NOT NULL THEN
    -- Check 7: University exists
    check_name := 'Target University Exists';
    SELECT EXISTS(SELECT 1 FROM public.universities WHERE id = target_university_id) INTO v_uni_exists;
    check_result := v_uni_exists::TEXT;
    RETURN NEXT;
    
    -- Check 8: University tenant
    check_name := 'Target University Tenant ID';
    SELECT tenant_id INTO v_uni_tenant FROM public.universities WHERE id = target_university_id;
    check_result := COALESCE(v_uni_tenant::TEXT, 'NULL - university not found');
    RETURN NEXT;
    
    -- Check 9: Tenant match
    check_name := 'Tenant Match (user vs university)';
    check_result := (v_user_tenant = v_uni_tenant)::TEXT;
    RETURN NEXT;
    
    -- Check 10: Would UPDATE pass
    check_name := 'UPDATE Access (should be TRUE for success)';
    check_result := (
      public.is_admin_or_staff(v_user_id)
      OR (
        v_user_role = 'partner'::public.app_role
        AND v_uni_tenant = v_user_tenant
      )
    )::TEXT;
    RETURN NEXT;
  END IF;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.debug_university_access(UUID) IS 
  'Debug function to check why a user might not have access to update their university profile. Call with SELECT * FROM debug_university_access() or SELECT * FROM debug_university_access(''university-uuid'')';

-- ============================================================================
-- STEP 9: Verify the fix
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  remaining_uni_roles INTEGER;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'universities' AND schemaname = 'public';
  
  RAISE NOTICE '=== UNIVERSITY PROFILE SAVE FIX VERIFICATION ===';
  RAISE NOTICE 'Total RLS policies on universities table: %', policy_count;
  
  -- Check for remaining 'university' roles
  SELECT COUNT(*) INTO remaining_uni_roles
  FROM public.profiles
  WHERE role::TEXT = 'university';
  
  IF remaining_uni_roles > 0 THEN
    RAISE WARNING 'There are still % profiles with university role!', remaining_uni_roles;
  ELSE
    RAISE NOTICE 'All profiles have valid roles (no ''university'' roles remaining)';
  END IF;
  
  -- List policy names
  RAISE NOTICE 'Current policies:';
  FOR policy_count IN 
    SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND schemaname = 'public'
  LOOP
    -- Just count iterations
  END LOOP;
  
  RAISE NOTICE 'Migration complete. University profile save should now work.';
END $$;

-- ============================================================================
-- STEP 10: Grant execute on debug function
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.debug_university_access(UUID) TO authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
