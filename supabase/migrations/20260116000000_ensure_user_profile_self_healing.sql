-- ============================================================================
-- SELF-HEALING PROFILE SYSTEM
-- ============================================================================
-- 
-- This migration adds a robust `ensure_user_profile` RPC that can be called
-- to repair malformed accounts where:
--   1. auth.users exists but profiles row is missing
--   2. Profile exists but user_roles is missing
--   3. Partner/university role exists but tenant is shared (needs isolation)
--   4. Partner exists but university record is missing
--
-- This prevents "Profile not found" dead-end states after successful login.
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the main self-healing function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_user_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_auth_user RECORD;
  v_profile RECORD;
  v_tenant_id UUID;
  v_role public.app_role;
  v_created BOOLEAN := FALSE;
  v_repaired JSONB := '[]'::JSONB;
  v_result JSONB;
  v_default_tenant_id UUID;
  v_university_id UUID;
BEGIN
  -- Use provided user_id or fall back to authenticated user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No user ID provided and not authenticated',
      'user_id', NULL
    );
  END IF;
  
  -- Check if this is the authenticated user or if caller is admin/staff
  IF v_user_id != auth.uid() AND NOT public.is_admin_or_staff(auth.uid()) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Not authorized to repair other users profiles',
      'user_id', v_user_id
    );
  END IF;
  
  -- =========================================================================
  -- STEP 1: Get auth user info
  -- =========================================================================
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found in auth.users',
      'user_id', v_user_id
    );
  END IF;
  
  -- =========================================================================
  -- STEP 2: Check if profile exists
  -- =========================================================================
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- =========================================================================
  -- STEP 3: Create profile if missing
  -- =========================================================================
  IF NOT FOUND THEN
    -- Determine role from parameters or metadata
    v_role := COALESCE(
      p_role::public.app_role,
      (v_auth_user.raw_user_meta_data->>'role')::public.app_role,
      'student'::public.app_role
    );
    
    -- Normalize 'university' to 'partner' for consistency
    IF v_role::TEXT = 'university' THEN
      v_role := 'partner'::public.app_role;
    END IF;
    
    -- Get or create tenant
    IF v_role IN ('partner'::public.app_role) THEN
      -- Partners need their own isolated tenant
      INSERT INTO public.tenants (name, slug, email_from, active, created_at, updated_at)
      VALUES (
        COALESCE(p_full_name, v_auth_user.raw_user_meta_data->>'full_name', 'University Partner') || ' Organization',
        'university-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8) || '-' || SUBSTRING(v_user_id::TEXT, 1, 8),
        COALESCE(p_email, v_auth_user.email, 'noreply@unidoxia.com'),
        TRUE,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_tenant_id;
      
      v_repaired := v_repaired || jsonb_build_array('created_isolated_tenant');
    ELSE
      -- Other roles use the default tenant
      SELECT id INTO v_default_tenant_id
      FROM public.tenants
      WHERE slug = 'unidoxia'
      LIMIT 1;
      
      IF v_default_tenant_id IS NULL THEN
        -- Create default tenant if missing
        INSERT INTO public.tenants (name, slug, email_from, active)
        VALUES ('UniDoxia', 'unidoxia', 'noreply@unidoxia.com', TRUE)
        RETURNING id INTO v_default_tenant_id;
        
        v_repaired := v_repaired || jsonb_build_array('created_default_tenant');
      END IF;
      
      v_tenant_id := v_default_tenant_id;
    END IF;
    
    -- Create the profile
    INSERT INTO public.profiles (
      id,
      tenant_id,
      email,
      full_name,
      role,
      phone,
      country,
      onboarded,
      active,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_tenant_id,
      COALESCE(p_email, v_auth_user.email, ''),
      COALESCE(p_full_name, v_auth_user.raw_user_meta_data->>'full_name', 'User'),
      v_role,
      COALESCE(p_phone, v_auth_user.raw_user_meta_data->>'phone', ''),
      COALESCE(p_country, v_auth_user.raw_user_meta_data->>'country', ''),
      FALSE,
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_profile;
    
    v_created := TRUE;
    v_repaired := v_repaired || jsonb_build_array('created_profile');
    
    RAISE NOTICE 'Created profile for user % with role %', v_user_id, v_role;
  ELSE
    v_role := v_profile.role;
    v_tenant_id := v_profile.tenant_id;
  END IF;
  
  -- =========================================================================
  -- STEP 4: Ensure user_roles entry exists
  -- =========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id AND role = v_profile.role
  ) THEN
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (v_user_id, v_profile.role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    v_repaired := v_repaired || jsonb_build_array('created_user_role');
    RAISE NOTICE 'Created user_role for user % with role %', v_user_id, v_profile.role;
  END IF;
  
  -- =========================================================================
  -- STEP 5: Handle partner-specific repairs
  -- =========================================================================
  IF v_profile.role IN ('partner'::public.app_role, 'university'::public.app_role) THEN
    -- Check if partner is on a shared tenant (needs isolation)
    IF public.is_shared_tenant(v_profile.tenant_id) THEN
      -- Isolate this partner to their own tenant
      v_tenant_id := public.isolate_partner_tenant(v_user_id);
      
      IF v_tenant_id IS NOT NULL AND v_tenant_id != v_profile.tenant_id THEN
        v_repaired := v_repaired || jsonb_build_array('isolated_partner_tenant');
        
        -- Re-fetch profile with new tenant
        SELECT * INTO v_profile
        FROM public.profiles
        WHERE id = v_user_id;
      END IF;
    END IF;
    
    -- Ensure university exists for partner's tenant
    IF NOT EXISTS (
      SELECT 1 FROM public.universities
      WHERE tenant_id = v_profile.tenant_id
    ) THEN
      -- Create university for this tenant
      v_university_id := public.get_or_create_university(
        v_profile.tenant_id,
        COALESCE(v_auth_user.raw_user_meta_data->>'university_name', v_profile.full_name || '''s University'),
        COALESCE(v_profile.country, 'Unknown'),
        v_profile.full_name,
        v_profile.email
      );
      
      IF v_university_id IS NOT NULL THEN
        v_repaired := v_repaired || jsonb_build_array('created_university');
        RAISE NOTICE 'Created university % for partner %', v_university_id, v_user_id;
      END IF;
    END IF;
  END IF;
  
  -- =========================================================================
  -- STEP 6: Handle student-specific repairs
  -- =========================================================================
  IF v_profile.role = 'student'::public.app_role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.students
      WHERE profile_id = v_user_id
    ) THEN
      INSERT INTO public.students (tenant_id, profile_id, created_at, updated_at)
      VALUES (v_profile.tenant_id, v_user_id, NOW(), NOW())
      ON CONFLICT (profile_id) DO NOTHING;
      
      v_repaired := v_repaired || jsonb_build_array('created_student_record');
      RAISE NOTICE 'Created student record for user %', v_user_id;
    END IF;
  END IF;
  
  -- =========================================================================
  -- STEP 7: Handle agent-specific repairs
  -- =========================================================================
  IF v_profile.role = 'agent'::public.app_role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.agents
      WHERE profile_id = v_user_id
    ) THEN
      INSERT INTO public.agents (tenant_id, profile_id, verification_status, active, created_at, updated_at)
      VALUES (v_profile.tenant_id, v_user_id, 'pending', TRUE, NOW(), NOW())
      ON CONFLICT (profile_id) DO NOTHING;
      
      v_repaired := v_repaired || jsonb_build_array('created_agent_record');
      RAISE NOTICE 'Created agent record for user %', v_user_id;
    END IF;
  END IF;
  
  -- =========================================================================
  -- STEP 8: Build result
  -- =========================================================================
  
  -- Re-fetch the final profile state
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;
  
  v_result := jsonb_build_object(
    'success', TRUE,
    'user_id', v_user_id,
    'profile_created', v_created,
    'repairs_applied', v_repaired,
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'tenant_id', v_profile.tenant_id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'role', v_profile.role,
      'onboarded', v_profile.onboarded,
      'active', v_profile.active
    )
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'error_detail', SQLSTATE,
    'user_id', v_user_id
  );
END;
$$;

COMMENT ON FUNCTION public.ensure_user_profile IS 
  'Self-healing function that ensures a user has a valid profile, user_roles entry, and role-specific records. Can repair malformed accounts.';

GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- STEP 2: Create diagnostic function for admin use
-- ============================================================================

CREATE OR REPLACE FUNCTION public.diagnose_user_account(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user RECORD;
  v_profile RECORD;
  v_user_roles JSONB;
  v_tenant RECORD;
  v_university RECORD;
  v_student RECORD;
  v_agent RECORD;
  v_issues JSONB := '[]'::JSONB;
  v_result JSONB;
BEGIN
  -- Only admins/staff can diagnose accounts
  IF NOT public.is_admin_or_staff(auth.uid()) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Only admins and staff can diagnose user accounts'
    );
  END IF;
  
  -- Find auth user
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE email = p_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No user found with email: ' || p_email,
      'auth_user', NULL
    );
  END IF;
  
  -- Find profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_auth_user.id;
  
  IF NOT FOUND THEN
    v_issues := v_issues || jsonb_build_array('CRITICAL: Profile missing - auth.users.id not in profiles');
  END IF;
  
  -- Find user_roles
  SELECT jsonb_agg(jsonb_build_object('role', role, 'created_at', created_at))
  INTO v_user_roles
  FROM public.user_roles
  WHERE user_id = v_auth_user.id;
  
  IF v_user_roles IS NULL THEN
    v_issues := v_issues || jsonb_build_array('WARNING: No entries in user_roles table');
  END IF;
  
  -- Check tenant if profile exists
  IF v_profile.id IS NOT NULL THEN
    SELECT * INTO v_tenant
    FROM public.tenants
    WHERE id = v_profile.tenant_id;
    
    IF NOT FOUND THEN
      v_issues := v_issues || jsonb_build_array('CRITICAL: Profile references non-existent tenant');
    ELSIF public.is_shared_tenant(v_profile.tenant_id) AND v_profile.role IN ('partner', 'university') THEN
      v_issues := v_issues || jsonb_build_array('CRITICAL: Partner is on shared tenant - needs isolation');
    END IF;
    
    -- Check role-specific records
    IF v_profile.role = 'student' THEN
      SELECT * INTO v_student
      FROM public.students
      WHERE profile_id = v_auth_user.id;
      
      IF NOT FOUND THEN
        v_issues := v_issues || jsonb_build_array('WARNING: Student profile missing students table record');
      END IF;
    ELSIF v_profile.role = 'agent' THEN
      SELECT * INTO v_agent
      FROM public.agents
      WHERE profile_id = v_auth_user.id;
      
      IF NOT FOUND THEN
        v_issues := v_issues || jsonb_build_array('WARNING: Agent profile missing agents table record');
      END IF;
    ELSIF v_profile.role IN ('partner', 'university') THEN
      SELECT * INTO v_university
      FROM public.universities
      WHERE tenant_id = v_profile.tenant_id;
      
      IF NOT FOUND THEN
        v_issues := v_issues || jsonb_build_array('CRITICAL: Partner has no university record for their tenant');
      END IF;
    END IF;
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', TRUE,
    'email', p_email,
    'auth_user', jsonb_build_object(
      'id', v_auth_user.id,
      'email', v_auth_user.email,
      'created_at', v_auth_user.created_at,
      'email_confirmed_at', v_auth_user.email_confirmed_at,
      'last_sign_in_at', v_auth_user.last_sign_in_at,
      'metadata_role', v_auth_user.raw_user_meta_data->>'role',
      'metadata_full_name', v_auth_user.raw_user_meta_data->>'full_name'
    ),
    'profile', CASE WHEN v_profile.id IS NOT NULL THEN jsonb_build_object(
      'id', v_profile.id,
      'tenant_id', v_profile.tenant_id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'role', v_profile.role,
      'onboarded', v_profile.onboarded,
      'active', v_profile.active,
      'created_at', v_profile.created_at
    ) ELSE NULL END,
    'user_roles', COALESCE(v_user_roles, '[]'::JSONB),
    'tenant', CASE WHEN v_tenant.id IS NOT NULL THEN jsonb_build_object(
      'id', v_tenant.id,
      'name', v_tenant.name,
      'slug', v_tenant.slug,
      'is_shared', public.is_shared_tenant(v_tenant.id)
    ) ELSE NULL END,
    'university', CASE WHEN v_university.id IS NOT NULL THEN jsonb_build_object(
      'id', v_university.id,
      'name', v_university.name,
      'tenant_id', v_university.tenant_id
    ) ELSE NULL END,
    'issues', v_issues,
    'issue_count', jsonb_array_length(v_issues),
    'can_repair', jsonb_array_length(v_issues) > 0
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.diagnose_user_account IS 
  'Diagnostic function for admins to inspect user account health by email.';

GRANT EXECUTE ON FUNCTION public.diagnose_user_account(TEXT) TO authenticated;

-- ============================================================================
-- STEP 3: Create admin repair function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.repair_user_account(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user RECORD;
  v_diagnosis JSONB;
  v_repair_result JSONB;
BEGIN
  -- Only admins/staff can repair accounts
  IF NOT public.is_admin_or_staff(auth.uid()) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Only admins and staff can repair user accounts'
    );
  END IF;
  
  -- First diagnose
  v_diagnosis := public.diagnose_user_account(p_email);
  
  IF NOT (v_diagnosis->>'success')::BOOLEAN THEN
    RETURN v_diagnosis;
  END IF;
  
  -- Get auth user ID
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE email = p_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;
  
  -- Run the self-healing function
  v_repair_result := public.ensure_user_profile(
    v_auth_user.id,
    v_auth_user.raw_user_meta_data->>'role',
    v_auth_user.raw_user_meta_data->>'full_name',
    v_auth_user.email,
    v_auth_user.raw_user_meta_data->>'phone',
    v_auth_user.raw_user_meta_data->>'country'
  );
  
  -- Re-diagnose after repair
  RETURN jsonb_build_object(
    'success', (v_repair_result->>'success')::BOOLEAN,
    'before', v_diagnosis,
    'repair_result', v_repair_result,
    'after', public.diagnose_user_account(p_email)
  );
END;
$$;

COMMENT ON FUNCTION public.repair_user_account IS 
  'Admin function to repair a malformed user account by email.';

GRANT EXECUTE ON FUNCTION public.repair_user_account(TEXT) TO authenticated;

-- ============================================================================
-- STEP 4: Update handle_new_user trigger to be more robust
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_new_role public.app_role;
  v_tenant_slug TEXT;
  v_university_id UUID;
BEGIN
  -- Determine role
  v_new_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.app_role,
    'student'::public.app_role
  );
  
  -- Normalize 'university' to 'partner'
  IF v_new_role::TEXT = 'university' THEN
    v_new_role := 'partner'::public.app_role;
  END IF;
  
  -- Handle tenant assignment
  IF v_new_role IN ('partner'::public.app_role) THEN
    -- Partners get their own isolated tenant
    v_tenant_slug := 'university-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
    
    INSERT INTO public.tenants (name, slug, email_from, active, created_at, updated_at)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'University Partner') || ' Organization',
      v_tenant_slug,
      NEW.email,
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_tenant_id;
    
    RAISE LOG 'Created isolated tenant % for partner user %', v_tenant_id, NEW.id;
  ELSE
    -- Other roles use the default tenant
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE slug = 'unidoxia'
    LIMIT 1;
    
    -- Create default tenant if missing
    IF v_tenant_id IS NULL THEN
      INSERT INTO public.tenants (name, slug, email_from, active)
      VALUES ('UniDoxia', 'unidoxia', 'noreply@unidoxia.com', TRUE)
      RETURNING id INTO v_tenant_id;
      
      RAISE LOG 'Created default tenant %', v_tenant_id;
    END IF;
  END IF;
  
  -- Create the profile
  INSERT INTO public.profiles (
    id,
    tenant_id,
    email,
    full_name,
    role,
    phone,
    country,
    onboarded,
    active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    v_new_role,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    FALSE,
    TRUE,
    NOW(),
    NOW()
  );
  
  -- Create user_roles entry
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (NEW.id, v_new_role, NOW())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create role-specific records
  IF v_new_role = 'student'::public.app_role THEN
    INSERT INTO public.students (tenant_id, profile_id, created_at, updated_at)
    VALUES (v_tenant_id, NEW.id, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
    
  ELSIF v_new_role = 'agent'::public.app_role THEN
    INSERT INTO public.agents (tenant_id, profile_id, verification_status, active, created_at, updated_at)
    VALUES (v_tenant_id, NEW.id, 'pending', TRUE, NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
    
  ELSIF v_new_role = 'partner'::public.app_role THEN
    -- Create university for the partner's isolated tenant
    v_university_id := public.get_or_create_university(
      v_tenant_id,
      COALESCE(NEW.raw_user_meta_data->>'university_name', NEW.raw_user_meta_data->>'full_name' || '''s University'),
      COALESCE(NEW.raw_user_meta_data->>'country', 'Unknown'),
      NEW.raw_user_meta_data->>'full_name',
      NEW.email
    );
    
    RAISE LOG 'Created university % for partner %', v_university_id, NEW.id;
  END IF;
  
  RAISE LOG 'Successfully created profile for user % with role %', NEW.id, v_new_role;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail auth user creation
  RAISE LOG 'Error in handle_new_user for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 5: Add policy for authenticated users to call ensure_user_profile
-- ============================================================================

-- Ensure INSERT policy exists for profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_self_insert'
  ) THEN
    CREATE POLICY "profiles_self_insert"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Self-healing profile system enabled - malformed accounts can now be automatically repaired.';
