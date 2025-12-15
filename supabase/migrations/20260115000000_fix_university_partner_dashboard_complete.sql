-- ============================================================================
-- Comprehensive fix for University Partner Dashboard
-- ============================================================================
-- This migration addresses multiple issues that prevent universities from:
-- 1. Opening/viewing application details
-- 2. Updating application status
-- 3. Viewing student details and documents
-- 4. Messaging students and requesting documents
--
-- Root causes addressed:
-- - Missing RLS policies for school_rep role
-- - Missing storage access for application-documents bucket
-- - Missing document_requests policies for university users
-- - Missing application_id column in document_requests
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure get_user_university_id() function exists (no-argument version)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_university_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_university_id UUID;
BEGIN
  -- Get the user's tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get the university for this tenant
  SELECT id INTO v_university_id
  FROM public.universities
  WHERE tenant_id = v_tenant_id
  LIMIT 1;

  RETURN v_university_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_university_id() TO authenticated;

COMMENT ON FUNCTION public.get_user_university_id() IS 
  'Returns the university ID for the current authenticated user based on their tenant_id.';

-- ============================================================================
-- STEP 2: Add application_id column to document_requests if missing
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'document_requests'
      AND column_name = 'application_id'
  ) THEN
    ALTER TABLE public.document_requests
    ADD COLUMN application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_document_requests_application_id
    ON public.document_requests(application_id);

    RAISE NOTICE 'Added application_id column to document_requests';
  ELSE
    RAISE NOTICE 'application_id column already exists in document_requests';
  END IF;
END$$;

-- ============================================================================
-- STEP 3: Ensure comprehensive RLS policies for applications table
-- ============================================================================

-- Drop and recreate to ensure school_rep is included
DROP POLICY IF EXISTS "applications_partner_select" ON public.applications;
DROP POLICY IF EXISTS "applications_partner_update" ON public.applications;
DROP POLICY IF EXISTS "applications_school_rep_select" ON public.applications;
DROP POLICY IF EXISTS "applications_school_rep_update" ON public.applications;
DROP POLICY IF EXISTS "Partners can view applications to their university programs" ON public.applications;
DROP POLICY IF EXISTS "Partners can update applications to their university programs" ON public.applications;

-- SELECT: University partner roles (partner + school_rep) can see applications to their programs
CREATE POLICY "university_partner_applications_select"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    -- Admin/staff can see all
    public.is_admin_or_staff(auth.uid())
    OR
    -- Student can see their own applications
    student_id IN (
      SELECT id FROM public.students
      WHERE profile_id = auth.uid()
    )
    OR
    -- Agent can see applications they submitted
    agent_id IN (
      SELECT id FROM public.agents
      WHERE profile_id = auth.uid()
    )
    OR
    -- University partner (partner or school_rep) can see applications to their programs
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.programs p
        JOIN public.universities u ON u.id = p.university_id
        WHERE p.id = program_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
  );

-- UPDATE: University partner roles can update applications to their programs
CREATE POLICY "university_partner_applications_update"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.programs p
      JOIN public.universities u ON u.id = p.university_id
      WHERE p.id = program_id
        AND u.tenant_id = public.get_user_tenant(auth.uid())
    )
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.programs p
      JOIN public.universities u ON u.id = p.university_id
      WHERE p.id = program_id
        AND u.tenant_id = public.get_user_tenant(auth.uid())
    )
  );

-- ============================================================================
-- STEP 4: Ensure comprehensive RLS policies for students table
-- ============================================================================

DROP POLICY IF EXISTS "Partners can view students with applications to their university" ON public.students;
DROP POLICY IF EXISTS "university_partner_students_select" ON public.students;

-- University partners can view students who have applications to their programs
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
    -- University partner can see students with applications to their programs
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND id IN (
        SELECT DISTINCT a.student_id 
        FROM public.applications a
        JOIN public.programs p ON p.id = a.program_id
        JOIN public.universities u ON u.id = p.university_id
        WHERE u.tenant_id = public.get_user_tenant(auth.uid())
          AND a.submitted_at IS NOT NULL
      )
    )
  );

-- ============================================================================
-- STEP 5: Ensure comprehensive RLS policies for application_documents table
-- ============================================================================

DROP POLICY IF EXISTS "Partners can view application documents for their university" ON public.application_documents;
DROP POLICY IF EXISTS "Partners can update application documents for their university" ON public.application_documents;
DROP POLICY IF EXISTS "university_partner_application_documents_select" ON public.application_documents;
DROP POLICY IF EXISTS "university_partner_application_documents_update" ON public.application_documents;

-- SELECT: University partners can view documents for applications to their programs
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
          AND a.submitted_at IS NOT NULL
      )
    )
  );

-- UPDATE: University partners can update document verification status
CREATE POLICY "university_partner_application_documents_update"
  ON public.application_documents FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    AND application_id IN (
      SELECT a.id 
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE u.tenant_id = public.get_user_tenant(auth.uid())
        AND a.submitted_at IS NOT NULL
    )
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    AND application_id IN (
      SELECT a.id 
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE u.tenant_id = public.get_user_tenant(auth.uid())
        AND a.submitted_at IS NOT NULL
    )
  );

-- ============================================================================
-- STEP 6: Ensure comprehensive RLS policies for document_requests table
-- ============================================================================

DROP POLICY IF EXISTS "document_requests_university_manage" ON public.document_requests;
DROP POLICY IF EXISTS "university_partner_document_requests_all" ON public.document_requests;

-- University partners can manage document requests
CREATE POLICY "university_partner_document_requests_all"
  ON public.document_requests FOR ALL
  TO authenticated
  USING (
    -- Admin/staff can manage all
    public.is_admin_or_staff(auth.uid())
    OR
    -- Student can view their own requests
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
    OR
    -- University partners can manage requests in their tenant
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND (
        -- Same tenant
        tenant_id = public.get_user_tenant(auth.uid())
        OR
        -- Or student has application to their university
        student_id IN (
          SELECT DISTINCT a.student_id 
          FROM public.applications a
          JOIN public.programs p ON p.id = a.program_id
          JOIN public.universities u ON u.id = p.university_id
          WHERE u.tenant_id = public.get_user_tenant(auth.uid())
            AND a.submitted_at IS NOT NULL
        )
      )
    )
  )
  WITH CHECK (
    -- Admin/staff can manage all
    public.is_admin_or_staff(auth.uid())
    OR
    -- University partners can create/update requests
    (
      public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
      AND (
        tenant_id = public.get_user_tenant(auth.uid())
        OR
        student_id IN (
          SELECT DISTINCT a.student_id 
          FROM public.applications a
          JOIN public.programs p ON p.id = a.program_id
          JOIN public.universities u ON u.id = p.university_id
          WHERE u.tenant_id = public.get_user_tenant(auth.uid())
            AND a.submitted_at IS NOT NULL
        )
      )
    )
  );

-- ============================================================================
-- STEP 7: Ensure comprehensive RLS policies for profiles table
-- ============================================================================

DROP POLICY IF EXISTS "Partners can view profiles for their applicants" ON public.profiles;
DROP POLICY IF EXISTS "university_partner_profiles_select" ON public.profiles;

-- University partners can view profiles for students with applications to their programs
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
            AND a.submitted_at IS NOT NULL
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
            AND a.submitted_at IS NOT NULL
        )
      )
    )
  );

-- ============================================================================
-- STEP 8: Ensure storage bucket access for university partners
-- ============================================================================

-- Create application-documents bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents',
  'application-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to recreate them
DROP POLICY IF EXISTS "Users can read their application documents" ON storage.objects;
DROP POLICY IF EXISTS "university_partner_storage_read" ON storage.objects;

-- University partners can read documents from application-documents bucket
CREATE POLICY "university_partner_storage_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents' AND
  (
    -- Admin/staff can read all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'staff', 'counselor', 'verifier')
    )
    OR
    -- Students can read their own documents (folder structure: {application_id}/...)
    (storage.foldername(name))[1] IN (
      SELECT a.id::text FROM public.applications a
      JOIN public.students s ON s.id = a.student_id
      WHERE s.profile_id = auth.uid()
    )
    OR
    -- University partners can read documents for applications to their programs
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.applications a ON a.id::text = (storage.foldername(name))[1]
      JOIN public.programs prog ON prog.id = a.program_id
      JOIN public.universities u ON u.id = prog.university_id
      WHERE p.id = auth.uid()
        AND p.role IN ('partner', 'school_rep')
        AND u.tenant_id = p.tenant_id
        AND a.submitted_at IS NOT NULL
    )
  )
);

-- Also ensure access to student-documents bucket for legacy data
DROP POLICY IF EXISTS "university_partner_student_docs_read" ON storage.objects;

CREATE POLICY "university_partner_student_docs_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  (
    -- Admin/staff can read all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'staff', 'counselor', 'verifier')
    )
    OR
    -- Students can read their own documents
    (storage.foldername(name))[1] IN (
      SELECT s.id::text FROM public.students s
      WHERE s.profile_id = auth.uid()
    )
    OR
    -- University partners can read documents for students with applications
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.students s ON s.id::text = (storage.foldername(name))[1]
      JOIN public.applications a ON a.student_id = s.id
      JOIN public.programs prog ON prog.id = a.program_id
      JOIN public.universities u ON u.id = prog.university_id
      WHERE p.id = auth.uid()
        AND p.role IN ('partner', 'school_rep')
        AND u.tenant_id = p.tenant_id
        AND a.submitted_at IS NOT NULL
    )
  )
);

-- ============================================================================
-- STEP 9: Ensure update_application_review RPC exists and is properly granted
-- ============================================================================

-- Recreate the RPC to ensure it's up to date
CREATE OR REPLACE FUNCTION public.update_application_review(
  p_application_id UUID,
  p_new_status public.application_status DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_append_timeline_event JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  status public.application_status,
  internal_notes TEXT,
  timeline_json JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_tenant UUID;
  v_user_role public.app_role;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  v_user_role := public.get_user_role(v_user_id);

  -- Allow university partner roles (partner + school_rep) and staff/admin.
  IF NOT (
    v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    OR public.is_admin_or_staff(v_user_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to update applications. Your role: %', v_user_role USING ERRCODE = '42501';
  END IF;

  -- For university partner roles: ensure the application belongs to their tenant (via program->university).
  IF NOT public.is_admin_or_staff(v_user_id) THEN
    v_user_tenant := public.get_user_tenant(v_user_id);

    IF v_user_tenant IS NULL THEN
      RAISE EXCEPTION 'Partner tenant not found for user %', v_user_id USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.id = p_application_id
        AND u.tenant_id = v_user_tenant
    ) THEN
      RAISE EXCEPTION 'You do not have permission to update this application (app: %, tenant: %)', p_application_id, v_user_tenant USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.applications a
  SET
    status = COALESCE(p_new_status, a.status),
    internal_notes = COALESCE(p_internal_notes, a.internal_notes),
    timeline_json = CASE
      WHEN p_append_timeline_event IS NULL THEN a.timeline_json
      WHEN a.timeline_json IS NULL THEN jsonb_build_array(p_append_timeline_event)
      WHEN jsonb_typeof(a.timeline_json) = 'array' THEN a.timeline_json || jsonb_build_array(p_append_timeline_event)
      ELSE jsonb_build_array(p_append_timeline_event)
    END,
    updated_at = now()
  WHERE a.id = p_application_id
  RETURNING a.id, a.status, a.internal_notes, a.timeline_json, a.updated_at
  INTO id, status, internal_notes, timeline_json, updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id USING ERRCODE = 'P0002';
  END IF;

  RETURN NEXT;
END;
$$;

-- Grant execute to both authenticated and anon (anon will fail auth check in function)
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated, anon;

COMMENT ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) IS
  'Authorized application review update for university partners (partner + school_rep) and staff/admin. Updates status, internal notes, and appends timeline events.';

-- ============================================================================
-- STEP 10: Add indexes for performance
-- ============================================================================

-- Ensure common lookup indexes exist
CREATE INDEX IF NOT EXISTS idx_applications_program_id ON public.applications(program_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_agent_id ON public.applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON public.applications(submitted_at) WHERE submitted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_programs_university_id ON public.programs(university_id);
CREATE INDEX IF NOT EXISTS idx_universities_tenant_id ON public.universities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON public.application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students(profile_id);
CREATE INDEX IF NOT EXISTS idx_agents_profile_id ON public.agents(profile_id);

-- ============================================================================
-- STEP 11: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';

COMMIT;

-- ============================================================================
-- SUMMARY OF CHANGES:
-- 1. get_user_university_id() function ensured to exist
-- 2. application_id column added to document_requests
-- 3. Comprehensive RLS policies for applications (partner + school_rep)
-- 4. Comprehensive RLS policies for students (partner + school_rep)
-- 5. Comprehensive RLS policies for application_documents (partner + school_rep)
-- 6. Comprehensive RLS policies for document_requests (partner + school_rep)
-- 7. Comprehensive RLS policies for profiles (partner + school_rep)
-- 8. Storage bucket policies for application-documents and student-documents
-- 9. update_application_review RPC recreated with better error messages
-- 10. Performance indexes added
-- 11. PostgREST cache reloaded
-- ============================================================================
