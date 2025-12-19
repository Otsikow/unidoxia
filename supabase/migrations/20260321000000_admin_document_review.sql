-- Add admin review fields to student_documents
ALTER TABLE public.student_documents
ADD COLUMN IF NOT EXISTS admin_review_status TEXT DEFAULT 'awaiting_admin_review',
ADD COLUMN IF NOT EXISTS admin_review_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_reviewed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMPTZ;

-- Backfill existing rows to keep them available to universities
UPDATE public.student_documents
SET admin_review_status = 'ready_for_university_review'
WHERE admin_review_status IS NULL;

-- Ensure faster filtering when querying by admin review status
CREATE INDEX IF NOT EXISTS idx_student_documents_admin_review_status
  ON public.student_documents(admin_review_status);

-- Enforce admin approval before university or partner review
CREATE OR REPLACE FUNCTION public.partner_review_student_document(
  p_document_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  -- Validate status values
  IF p_status NOT IN ('pending', 'verified', 'rejected') THEN
    RAISE EXCEPTION 'invalid status: %', p_status USING ERRCODE = '22P02';
  END IF;

  -- Permission check: staff OR partner with an application for this student to their tenant university
  SELECT (
    public.is_admin_or_staff(auth.uid())
    OR (
      public.has_role(auth.uid(), 'partner'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.student_documents sd
        JOIN public.applications a ON a.student_id = sd.student_id
        JOIN public.programs pr ON pr.id = a.program_id
        JOIN public.universities u ON u.id = pr.university_id
        WHERE sd.id = p_document_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
  ) INTO v_allowed;

  IF NOT COALESCE(v_allowed, false) THEN
    RAISE EXCEPTION 'permission denied: not authorized to review this document'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_documents WHERE id = p_document_id AND admin_review_status = 'ready_for_university_review'
  ) THEN
    RAISE EXCEPTION 'document not approved for university review'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.student_documents
  SET
    verified_status = p_status,
    verification_notes = p_notes,
    verified_by = auth.uid(),
    verified_at = CASE WHEN p_status IN ('verified','rejected') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'document not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$$;

-- Refresh signed URL function with admin visibility gates
CREATE OR REPLACE FUNCTION public.get_student_document_signed_url(
  p_document_id UUID,
  p_expires_in INT DEFAULT 3600
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_storage_path TEXT;
  v_student_id UUID;
  v_user_id UUID;
  v_user_role app_role;
  v_user_tenant UUID;
  v_has_access BOOLEAN := FALSE;
  v_admin_review_status TEXT;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user role and tenant
  SELECT role, tenant_id INTO v_user_role, v_user_tenant
  FROM profiles
  WHERE id = v_user_id;

  -- Get document info
  SELECT sd.storage_path, sd.student_id, sd.admin_review_status
  INTO v_storage_path, v_student_id, v_admin_review_status
  FROM student_documents sd
  WHERE sd.id = p_document_id;

  IF v_storage_path IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  IF v_admin_review_status IN ('awaiting_admin_review', 'admin_rejected') AND v_user_role <> 'admin' THEN
    RAISE EXCEPTION 'Access denied: document awaiting admin review';
  END IF;

  -- Check access based on role
  IF v_user_role IN ('admin', 'staff', 'counselor', 'verifier') THEN
    v_has_access := TRUE;
  ELSIF v_user_role IN ('partner', 'school_rep') THEN
    -- Check if the student has an application to a university in the partner's tenant
    SELECT EXISTS(
      SELECT 1
      FROM applications a
      JOIN programs p ON p.id = a.program_id
      JOIN universities u ON u.id = p.university_id
      WHERE a.student_id = v_student_id
        AND u.tenant_id = v_user_tenant
    ) INTO v_has_access;
  ELSIF v_user_role = 'student' THEN
    -- Students can access their own documents
    SELECT EXISTS(
      SELECT 1 FROM students WHERE id = v_student_id AND profile_id = v_user_id
    ) INTO v_has_access;
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Generate signed URL using storage admin functions
  RETURN v_storage_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_document_signed_url(UUID, INT) TO authenticated;
