-- ============================================================================
-- Fix University Partner Access to Student Data
-- ============================================================================
-- This migration addresses the "Unknown Student" issue by:
-- 1. Removing the submitted_at IS NOT NULL requirement from students RLS policy
--    (if a university can see an application, they should see the student)
-- 2. Creating a security definer function to reliably fetch student data
-- 3. Ensuring profiles are accessible for student data display
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create security definer function to get students for university applications
-- ============================================================================
-- This function bypasses RLS to return student data for applications that
-- belong to the university's programs. The authorization check is done within
-- the function to ensure security.

CREATE OR REPLACE FUNCTION public.get_students_for_university_applications(
  p_student_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  legal_name TEXT,
  preferred_name TEXT,
  nationality TEXT,
  profile_name TEXT,
  profile_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role public.app_role;
  v_user_tenant UUID;
  v_university_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN; -- Return empty set if not authenticated
  END IF;
  
  v_user_role := public.get_user_role(v_user_id);
  
  -- Admin/staff can see all students
  IF public.is_admin_or_staff(v_user_id) THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.legal_name,
      s.preferred_name,
      s.nationality,
      p.full_name AS profile_name,
      p.email AS profile_email
    FROM public.students s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = ANY(p_student_ids);
    RETURN;
  END IF;
  
  -- University partners (partner or school_rep)
  IF v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role) THEN
    v_user_tenant := public.get_user_tenant(v_user_id);
    
    IF v_user_tenant IS NULL THEN
      RETURN; -- Return empty if no tenant
    END IF;
    
    -- Get university ID for this tenant
    SELECT u.id INTO v_university_id
    FROM public.universities u
    WHERE u.tenant_id = v_user_tenant
    LIMIT 1;
    
    IF v_university_id IS NULL THEN
      RETURN; -- Return empty if no university found
    END IF;
    
    -- Return students who have applications to this university's programs
    RETURN QUERY
    SELECT DISTINCT
      s.id,
      s.legal_name,
      s.preferred_name,
      s.nationality,
      p.full_name AS profile_name,
      p.email AS profile_email
    FROM public.students s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = ANY(p_student_ids)
      AND EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.programs prog ON prog.id = a.program_id
        WHERE a.student_id = s.id
          AND prog.university_id = v_university_id
      );
    RETURN;
  END IF;
  
  -- Agents can see their linked students
  IF v_user_role = 'agent'::public.app_role THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.legal_name,
      s.preferred_name,
      s.nationality,
      p.full_name AS profile_name,
      p.email AS profile_email
    FROM public.students s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = ANY(p_student_ids)
      AND EXISTS (
        SELECT 1 FROM public.agent_student_links asl
        WHERE asl.student_id = s.id
          AND asl.agent_profile_id = v_user_id
      );
    RETURN;
  END IF;
  
  -- Students can see their own record
  IF v_user_role = 'student'::public.app_role THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.legal_name,
      s.preferred_name,
      s.nationality,
      p.full_name AS profile_name,
      p.email AS profile_email
    FROM public.students s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = ANY(p_student_ids)
      AND s.profile_id = v_user_id;
    RETURN;
  END IF;
  
  -- Default: return empty
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_for_university_applications(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_students_for_university_applications(UUID[]) IS 
  'Security definer function to get student data for university dashboard. Bypasses RLS but performs authorization checks internally.';

-- ============================================================================
-- STEP 2: Update the students RLS policy to be more permissive for partners
-- ============================================================================
-- Remove the submitted_at requirement - if a partner can see an application,
-- they should be able to see the student details

DROP POLICY IF EXISTS "university_partner_students_select" ON public.students;
DROP POLICY IF EXISTS "Partners can view students with applications to their university" ON public.students;

-- Create a more permissive policy for university partners
CREATE POLICY "university_partner_students_select"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    -- Admin/staff can see all
    public.is_admin_or_staff(auth.uid())
    OR
    -- Student can see their own record
    profile_id = auth.uid()
    OR
    -- Agent can see their linked students
    id IN (
      SELECT student_id FROM public.agent_student_links
      WHERE agent_profile_id = auth.uid()
    )
    OR
    -- University partner can see students with ANY applications to their programs
    -- (removed submitted_at requirement - if they can see the application, they can see the student)
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND id IN (
        SELECT DISTINCT a.student_id 
        FROM public.applications a
        JOIN public.programs p ON p.id = a.program_id
        JOIN public.universities u ON u.id = p.university_id
        WHERE u.tenant_id = public.get_user_tenant(auth.uid())
          AND a.student_id IS NOT NULL
      )
    )
  );

-- ============================================================================
-- STEP 3: Update the profiles RLS policy for partners
-- ============================================================================
-- Ensure partners can view profiles for students with applications

DROP POLICY IF EXISTS "university_partner_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "Partners can view profiles for their applicants" ON public.profiles;

CREATE POLICY "university_partner_profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own profile
    id = auth.uid()
    OR
    -- Admin/staff can see all
    public.is_admin_or_staff(auth.uid())
    OR
    -- University partners can see profiles for students/agents with applications
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND (
        -- Profile belongs to a student with application to their university
        id IN (
          SELECT s.profile_id 
          FROM public.students s
          JOIN public.applications a ON a.student_id = s.id
          JOIN public.programs p ON p.id = a.program_id
          JOIN public.universities u ON u.id = p.university_id
          WHERE u.tenant_id = public.get_user_tenant(auth.uid())
            AND s.profile_id IS NOT NULL
        )
        OR
        -- Profile belongs to an agent who referred an application to their university
        id IN (
          SELECT ag.profile_id 
          FROM public.agents ag
          JOIN public.applications a ON a.agent_id = ag.id
          JOIN public.programs p ON p.id = a.program_id
          JOIN public.universities u ON u.id = p.university_id
          WHERE u.tenant_id = public.get_user_tenant(auth.uid())
            AND ag.profile_id IS NOT NULL
        )
      )
    )
  );

-- ============================================================================
-- STEP 4: Create function to get extended student details for application review
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_student_details_for_application(
  p_application_id UUID
)
RETURNS TABLE (
  student_id UUID,
  profile_id UUID,
  legal_name TEXT,
  preferred_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  nationality TEXT,
  date_of_birth DATE,
  passport_number TEXT,
  passport_expiry DATE,
  current_country TEXT,
  address JSONB,
  guardian JSONB,
  finances_json JSONB,
  visa_history_json JSONB,
  profile_full_name TEXT,
  profile_email TEXT,
  profile_phone TEXT,
  profile_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role public.app_role;
  v_user_tenant UUID;
  v_app_student_id UUID;
  v_app_program_id UUID;
  v_can_access BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  
  -- Get the application's student_id and program_id
  SELECT a.student_id, a.program_id 
  INTO v_app_student_id, v_app_program_id
  FROM public.applications a
  WHERE a.id = p_application_id;
  
  IF v_app_student_id IS NULL THEN
    -- Application not found or has no student
    RETURN;
  END IF;
  
  v_user_role := public.get_user_role(v_user_id);
  
  -- Admin/staff can access all
  IF public.is_admin_or_staff(v_user_id) THEN
    v_can_access := TRUE;
  -- University partner check
  ELSIF v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role) THEN
    v_user_tenant := public.get_user_tenant(v_user_id);
    
    -- Check if the application's program belongs to their university
    SELECT EXISTS (
      SELECT 1
      FROM public.programs p
      JOIN public.universities u ON u.id = p.university_id
      WHERE p.id = v_app_program_id
        AND u.tenant_id = v_user_tenant
    ) INTO v_can_access;
  -- Agent check
  ELSIF v_user_role = 'agent'::public.app_role THEN
    SELECT EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.agents ag ON ag.id = a.agent_id
      WHERE a.id = p_application_id
        AND ag.profile_id = v_user_id
    ) INTO v_can_access;
  -- Student check
  ELSIF v_user_role = 'student'::public.app_role THEN
    SELECT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = v_app_student_id
        AND s.profile_id = v_user_id
    ) INTO v_can_access;
  END IF;
  
  IF NOT v_can_access THEN
    RAISE EXCEPTION 'You do not have permission to view this student data' USING ERRCODE = '42501';
  END IF;
  
  -- Return the student details
  RETURN QUERY
  SELECT 
    s.id AS student_id,
    s.profile_id,
    s.legal_name,
    s.preferred_name,
    s.contact_email,
    s.contact_phone,
    s.nationality,
    s.date_of_birth,
    s.passport_number,
    s.passport_expiry,
    s.current_country,
    s.address,
    s.guardian,
    s.finances_json,
    s.visa_history_json,
    p.full_name AS profile_full_name,
    p.email AS profile_email,
    p.phone AS profile_phone,
    p.avatar_url AS profile_avatar_url
  FROM public.students s
  LEFT JOIN public.profiles p ON p.id = s.profile_id
  WHERE s.id = v_app_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_details_for_application(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_student_details_for_application(UUID) IS 
  'Security definer function to get full student details for an application. Performs authorization checks internally.';

-- ============================================================================
-- STEP 5: Ensure education_records and test_scores are accessible
-- ============================================================================
-- University partners need to see education history and test scores for students

DROP POLICY IF EXISTS "university_partner_education_records_select" ON public.education_records;

CREATE POLICY "university_partner_education_records_select"
  ON public.education_records FOR SELECT
  TO authenticated
  USING (
    -- Admin/staff can see all
    public.is_admin_or_staff(auth.uid())
    OR
    -- Student can see their own records
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
    OR
    -- University partner can see records for students with applications
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND student_id IN (
        SELECT DISTINCT a.student_id 
        FROM public.applications a
        JOIN public.programs p ON p.id = a.program_id
        JOIN public.universities u ON u.id = p.university_id
        WHERE u.tenant_id = public.get_user_tenant(auth.uid())
          AND a.student_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "university_partner_test_scores_select" ON public.test_scores;

CREATE POLICY "university_partner_test_scores_select"
  ON public.test_scores FOR SELECT
  TO authenticated
  USING (
    -- Admin/staff can see all
    public.is_admin_or_staff(auth.uid())
    OR
    -- Student can see their own scores
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
    OR
    -- University partner can see scores for students with applications
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND student_id IN (
        SELECT DISTINCT a.student_id 
        FROM public.applications a
        JOIN public.programs p ON p.id = a.program_id
        JOIN public.universities u ON u.id = p.university_id
        WHERE u.tenant_id = public.get_user_tenant(auth.uid())
          AND a.student_id IS NOT NULL
      )
    )
  );

-- ============================================================================
-- STEP 6: Ensure application_documents are accessible
-- ============================================================================

DROP POLICY IF EXISTS "university_partner_application_documents_select" ON public.application_documents;

CREATE POLICY "university_partner_application_documents_select"
  ON public.application_documents FOR SELECT
  TO authenticated
  USING (
    -- Admin/staff can see all
    public.is_admin_or_staff(auth.uid())
    OR
    -- Student can see their own documents
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.students s ON s.id = a.student_id
      WHERE s.profile_id = auth.uid()
    )
    OR
    -- Agent can see documents for applications they submitted
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.agents ag ON ag.id = a.agent_id
      WHERE ag.profile_id = auth.uid()
    )
    OR
    -- University partner can see documents for applications to their programs
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND application_id IN (
        SELECT a.id 
        FROM public.applications a
        JOIN public.programs p ON p.id = a.program_id
        JOIN public.universities u ON u.id = p.university_id
        WHERE u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
  );

-- ============================================================================
-- STEP 7: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';

COMMIT;

-- ============================================================================
-- SUMMARY OF CHANGES:
-- 1. Created get_students_for_university_applications() - security definer function
--    for fetching student data for the dashboard
-- 2. Updated university_partner_students_select policy - removed submitted_at requirement
-- 3. Updated university_partner_profiles_select policy - removed submitted_at requirement
-- 4. Created get_student_details_for_application() - security definer function
--    for fetching detailed student info in the application review dialog
-- 5. Added university_partner_education_records_select policy
-- 6. Added university_partner_test_scores_select policy
-- 7. Added university_partner_application_documents_select policy (without submitted_at)
-- ============================================================================
