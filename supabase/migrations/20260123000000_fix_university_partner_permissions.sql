-- ============================================================================
-- FIX: University Partner Permissions for Status Update, Document Requests, and Messaging
-- ============================================================================
-- This migration addresses three permission issues for university partners:
-- 1. Application status updates - ensure partners can update applications via RLS
-- 2. Document requests - ensure partners can INSERT document requests
-- 3. Messages - ensure partners can send messages via conversation system
--
-- Note: The application has existing RPC functions (university_update_application_status, 
-- update_application_review_text) that use SECURITY DEFINER to bypass RLS. These are
-- the preferred methods. This migration adds belt-and-suspenders RLS policies.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: FIX - Application Updates (The "Status" issue)
-- ============================================================================
-- Drop old restrictive policies to avoid conflicts

DROP POLICY IF EXISTS "University update applications" ON public.applications;
DROP POLICY IF EXISTS "university_update_applications_direct" ON public.applications;

-- Create a permissive UPDATE policy for university partners
-- This allows university partners to update applications to their university's programs
CREATE POLICY "University update applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is an admin, staff, or university partner/school_rep
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      -- Admin/staff can update any application
      profiles.role::text IN ('admin', 'staff')
      OR (
        -- University partners can update applications to their university
        profiles.role::text IN ('partner', 'school_rep', 'university_partner', 'university')
        AND profiles.tenant_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.programs p
          JOIN public.universities u ON u.id = p.university_id
          WHERE p.id = applications.program_id
          AND u.tenant_id = profiles.tenant_id
        )
      )
    )
  )
)
WITH CHECK (
  -- Same check for WITH CHECK
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role::text IN ('admin', 'staff')
      OR (
        profiles.role::text IN ('partner', 'school_rep', 'university_partner', 'university')
        AND profiles.tenant_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.programs p
          JOIN public.universities u ON u.id = p.university_id
          WHERE p.id = applications.program_id
          AND u.tenant_id = profiles.tenant_id
        )
      )
    )
  )
);

-- ============================================================================
-- STEP 2: FIX - Document Requests (The "Request" issue)
-- ============================================================================
-- Enable RLS on document_requests
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "University create doc requests" ON public.document_requests;
DROP POLICY IF EXISTS "document_requests_university_insert" ON public.document_requests;

-- Create INSERT policy for university staff
-- University partners need permission to CREATE (Insert) new requests for students
-- who have applications to their university's programs
CREATE POLICY "University create doc requests"
ON public.document_requests
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is admin, staff, or university partner
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      -- Admin/staff can create any request
      profiles.role::text IN ('admin', 'staff')
      OR (
        -- University partners can create requests for students with applications to their university
        profiles.role::text IN ('partner', 'school_rep', 'university_partner', 'university')
        AND (
          -- Option A: tenant_id matches
          (tenant_id IS NOT NULL AND tenant_id = profiles.tenant_id)
          OR
          -- Option B: student has an application to their university
          (
            profiles.tenant_id IS NOT NULL
            AND student_id IN (
              SELECT DISTINCT a.student_id 
              FROM public.applications a
              JOIN public.programs p ON p.id = a.program_id
              JOIN public.universities u ON u.id = p.university_id
              WHERE u.tenant_id = profiles.tenant_id
              AND a.submitted_at IS NOT NULL
            )
          )
        )
      )
    )
  )
);

-- Also ensure SELECT policy exists for university partners to view requests
DROP POLICY IF EXISTS "University view doc requests" ON public.document_requests;

CREATE POLICY "University view doc requests"
ON public.document_requests
FOR SELECT
TO authenticated
USING (
  -- Allow if user is admin, staff, or university partner
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role::text IN ('admin', 'staff')
      OR (
        profiles.role::text IN ('partner', 'school_rep', 'university_partner', 'university')
        AND profiles.tenant_id IS NOT NULL
        AND (
          tenant_id = profiles.tenant_id
          OR student_id IN (
            SELECT DISTINCT a.student_id 
            FROM public.applications a
            JOIN public.programs p ON p.id = a.program_id
            JOIN public.universities u ON u.id = p.university_id
            WHERE u.tenant_id = profiles.tenant_id
          )
        )
      )
    )
  )
  OR
  -- Students can view their own requests
  student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

-- Allow university partners to UPDATE document requests (e.g., mark as fulfilled)
DROP POLICY IF EXISTS "University update doc requests" ON public.document_requests;

CREATE POLICY "University update doc requests"
ON public.document_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role::text IN ('admin', 'staff')
      OR (
        profiles.role::text IN ('partner', 'school_rep', 'university_partner', 'university')
        AND profiles.tenant_id IS NOT NULL
        AND (
          tenant_id = profiles.tenant_id
          OR student_id IN (
            SELECT DISTINCT a.student_id 
            FROM public.applications a
            JOIN public.programs p ON p.id = a.program_id
            JOIN public.universities u ON u.id = p.university_id
            WHERE u.tenant_id = profiles.tenant_id
          )
        )
      )
    )
  )
);

-- ============================================================================
-- STEP 3: FIX - Conversation Messages (The "Chat" issue)
-- ============================================================================
-- The messaging system uses conversation_messages table, not a direct messages table.
-- Ensure university partners can send messages to students with applications.

-- Drop old policy if exists
DROP POLICY IF EXISTS "University send messages" ON public.conversation_messages;
DROP POLICY IF EXISTS "University partners can send messages" ON public.conversation_messages;

-- Create INSERT policy for university partners to send messages
-- This supplements the existing "Send messages to joined conversations" policy
CREATE POLICY "University partners can send messages"
ON public.conversation_messages
FOR INSERT
TO authenticated
WITH CHECK (
  -- Sender must be the authenticated user
  sender_id = auth.uid()
  AND (
    -- Existing check: user is a participant in the conversation
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_messages.conversation_id
      AND cp.user_id = auth.uid()
    )
    OR
    -- Additional: admin/staff/university partner can send if they have access
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('admin', 'staff', 'partner', 'school_rep', 'university_partner', 'university')
    )
  )
);

-- ============================================================================
-- STEP 4: Create helper function to check if user can request documents
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_request_documents_for_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_user_tenant UUID;
  v_can_request BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL OR p_student_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user info
  SELECT role::text, tenant_id INTO v_user_role, v_user_tenant
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Admin/staff can always request
  IF v_user_role IN ('admin', 'staff') THEN
    RETURN TRUE;
  END IF;
  
  -- University partners can request if student has application to their university
  IF v_user_role IN ('partner', 'school_rep', 'university_partner', 'university') AND v_user_tenant IS NOT NULL THEN
    SELECT TRUE INTO v_can_request
    FROM public.applications a
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE a.student_id = p_student_id
    AND u.tenant_id = v_user_tenant
    AND a.submitted_at IS NOT NULL
    LIMIT 1;
    
    RETURN COALESCE(v_can_request, FALSE);
  END IF;
  
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_request_documents_for_student(UUID) TO authenticated;

COMMENT ON FUNCTION public.can_request_documents_for_student(UUID) IS
  'Check if current user can request documents from a student. '
  'Returns true for admin/staff (always), or university partners if student has application to their university.';

-- ============================================================================
-- STEP 5: Ensure existing conversation access works for university partners
-- ============================================================================
-- The get_or_create_conversation function in 20260114000000 already handles
-- cross-tenant messaging for university partners. This just ensures the
-- conversation policies don't block viewing.

DROP POLICY IF EXISTS "University view conversations" ON public.conversations;

CREATE POLICY "University view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  -- User is a participant
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
  OR
  -- Admin/staff can view all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text IN ('admin', 'staff')
  )
);

-- ============================================================================
-- STEP 6: Ensure messages table has correct policies if it exists
-- ============================================================================
-- Some older code might use a 'messages' table instead of 'conversation_messages'

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    -- Enable RLS
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    
    -- Drop old policy if exists
    EXECUTE 'DROP POLICY IF EXISTS "University send messages" ON public.messages';
    
    -- Create INSERT policy
    EXECUTE $policy$
    CREATE POLICY "University send messages"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role::text IN ('admin', 'staff', 'partner', 'school_rep', 'university_partner', 'university')
      )
    )
    $policy$;
  END IF;
END$$;

-- ============================================================================
-- STEP 7: Force PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- USAGE NOTES:
-- 
-- 1. To update application status (preferred method):
--    supabase.rpc('university_update_application_status', {
--      p_application_id: appId,
--      p_status: 'under_review',
--      p_notes: 'Reviewed documents'
--    })
--
-- 2. To request a document:
--    supabase.from('document_requests').insert({
--      tenant_id: yourTenantId,
--      student_id: studentId,
--      application_id: applicationId,
--      requested_by: yourUserId,
--      document_type: 'passport',
--      status: 'pending',
--      notes: 'Please upload your passport'
--    })
--
-- 3. To diagnose permission issues:
--    SELECT * FROM diagnose_app_update_issue('application-uuid');
--
-- 4. If "Missing information" error persists when selecting document type,
--    check frontend: the dropdown value should be 'passport' (lowercase),
--    not 'Passport'. Verify documentRequestType state is being set.
-- ============================================================================
