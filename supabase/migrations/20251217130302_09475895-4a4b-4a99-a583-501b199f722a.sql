-- Allow university partners to review student-submitted documents for applications to their university
-- (No broad UPDATE policy; we expose a safe SECURITY DEFINER RPC that only updates review fields.)

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

-- Allow authenticated users to call it (RLS/permission checks happen inside)
GRANT EXECUTE ON FUNCTION public.partner_review_student_document(uuid, text, text) TO authenticated;