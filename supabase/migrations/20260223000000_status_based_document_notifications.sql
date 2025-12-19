-- Add status-based notifications for document workflows
-- - Notify admins when students upload new documents
-- - Notify students when documents are approved or rejected
-- - Notify universities when documents are ready for university review
-- - Allow partner review RPC to use the new statuses

-- Update partner_review_student_document to allow new statuses
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
  -- Validate status values (expanded to support university review handoff)
  IF p_status NOT IN ('pending', 'verified', 'approved', 'ready_for_university_review', 'rejected') THEN
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
    verified_at = CASE WHEN p_status IN ('verified','approved','rejected') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'document not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.partner_review_student_document(uuid, text, text) TO authenticated;

-- Notification trigger for student_documents
CREATE OR REPLACE FUNCTION public.notify_document_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_profile_id UUID;
  v_student_tenant_id UUID;
  v_student_name TEXT;
  v_document_type_display TEXT;
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_partner_record RECORD;
BEGIN
  SELECT
    s.profile_id,
    s.tenant_id,
    COALESCE(s.legal_name, s.preferred_name, p.full_name, 'A student')
  INTO
    v_student_profile_id,
    v_student_tenant_id,
    v_student_name
  FROM students s
  LEFT JOIN profiles p ON s.profile_id = p.id
  WHERE s.id = NEW.student_id;

  v_document_type_display := REPLACE(REPLACE(INITCAP(COALESCE(NEW.document_type, 'Document')), '_', ' '), '-', ' ');

  -- Admin notification when a new document is uploaded
  IF TG_OP = 'INSERT' THEN
    SELECT ARRAY_AGG(p.id)
    INTO v_admin_ids
    FROM profiles p
    WHERE p.tenant_id = v_student_tenant_id
      AND p.role IN ('admin', 'staff');

    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
        PERFORM create_notification(
          v_student_tenant_id,
          v_admin_id,
          'document',
          '📥 New Document Uploaded',
          v_student_name || ' uploaded a ' || v_document_type_display || ' that needs review.',
          jsonb_build_object(
            'document_id', NEW.id,
            'student_id', NEW.student_id,
            'document_type', NEW.document_type,
            'status', NEW.verified_status,
            'uploaded_at', NEW.created_at
          ),
          '/dashboard/documents'
        );
      END LOOP;
    END IF;
  END IF;

  -- Status change notifications
  IF TG_OP = 'UPDATE' AND NEW.verified_status IS DISTINCT FROM OLD.verified_status THEN
    -- Notify student on approval/rejection
    IF v_student_profile_id IS NOT NULL THEN
      IF NEW.verified_status IN ('verified', 'approved') THEN
        PERFORM create_notification(
          v_student_tenant_id,
          v_student_profile_id,
          'document',
          '✅ Document Approved',
          'Your ' || v_document_type_display || ' has been approved by our team.',
          jsonb_build_object(
            'document_id', NEW.id,
            'document_type', NEW.document_type,
            'old_status', OLD.verified_status,
            'new_status', NEW.verified_status,
            'notes', NEW.verification_notes
          ),
          '/student/documents'
        );
      ELSIF NEW.verified_status = 'rejected' THEN
        PERFORM create_notification(
          v_student_tenant_id,
          v_student_profile_id,
          'document',
          '⚠️ Document Rejected',
          'Your ' || v_document_type_display || ' needs updates. Please review the notes and resubmit.',
          jsonb_build_object(
            'document_id', NEW.id,
            'document_type', NEW.document_type,
            'old_status', OLD.verified_status,
            'new_status', NEW.verified_status,
            'notes', NEW.verification_notes
          ),
          '/student/documents'
        );
      END IF;
    END IF;

    -- Notify university partners when ready for university review
    IF NEW.verified_status = 'ready_for_university_review' THEN
      FOR v_partner_record IN
        SELECT DISTINCT
          p.id AS partner_id,
          p.tenant_id AS partner_tenant_id,
          u.name AS university_name,
          pr.name AS program_name
        FROM applications a
        JOIN programs pr ON a.program_id = pr.id
        JOIN universities u ON pr.university_id = u.id
        JOIN profiles p ON p.tenant_id = u.tenant_id AND p.role = 'partner'
        WHERE a.student_id = NEW.student_id
      LOOP
        PERFORM create_notification(
          v_partner_record.partner_tenant_id,
          v_partner_record.partner_id,
          'document',
          '📑 Document Ready for Review',
          v_student_name || ' has a document ready for your review for ' || v_partner_record.program_name || '.',
          jsonb_build_object(
            'document_id', NEW.id,
            'document_type', NEW.document_type,
            'status', NEW.verified_status,
            'student_name', v_student_name,
            'program_name', v_partner_record.program_name,
            'university_name', v_partner_record.university_name
          ),
          '/university/documents'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger to include INSERT and UPDATE events
DROP TRIGGER IF EXISTS trg_document_review_change ON student_documents;
CREATE TRIGGER trg_document_review_change
  AFTER INSERT OR UPDATE OF verified_status ON student_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_review_change();
