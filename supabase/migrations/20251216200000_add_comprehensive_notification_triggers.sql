-- Add comprehensive notification triggers for real-time updates
-- This migration adds notifications for:
-- 1. New application submissions (notify university)
-- 2. Document uploads (notify university for applications)
-- 3. Internal notes updates (notify student/agent)
-- 4. Document request status changes (notify student)

-- ============================================
-- 1. NEW APPLICATION SUBMISSION NOTIFICATION
-- ============================================

CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_program_name TEXT;
  v_university_name TEXT;
  v_university_tenant_id UUID;
  v_student_name TEXT;
  v_university_partner_ids UUID[];
  v_partner_id UUID;
BEGIN
  -- Get application details
  SELECT
    p.name,
    u.name,
    u.tenant_id
  INTO
    v_program_name,
    v_university_name,
    v_university_tenant_id
  FROM programs p
  JOIN universities u ON p.university_id = u.id
  WHERE p.id = NEW.program_id;

  -- Get student name
  SELECT COALESCE(s.legal_name, s.preferred_name, prof.full_name, 'A student')
  INTO v_student_name
  FROM students s
  LEFT JOIN profiles prof ON s.profile_id = prof.id
  WHERE s.id = NEW.student_id;

  -- Get university partner profile IDs (users with role 'partner' in that tenant)
  SELECT ARRAY_AGG(p.id)
  INTO v_university_partner_ids
  FROM profiles p
  WHERE p.tenant_id = v_university_tenant_id
    AND p.role = 'partner';

  -- Notify each university partner
  IF v_university_partner_ids IS NOT NULL THEN
    FOREACH v_partner_id IN ARRAY v_university_partner_ids
    LOOP
      PERFORM create_notification(
        v_university_tenant_id,
        v_partner_id,
        'application_status',
        'New Application Received',
        v_student_name || ' has submitted an application to ' || v_program_name || '.',
        jsonb_build_object(
          'application_id', NEW.id,
          'program_name', v_program_name,
          'university_name', v_university_name,
          'student_name', v_student_name,
          'status', NEW.status
        ),
        '/university/applications'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new applications
DROP TRIGGER IF EXISTS trg_new_application ON applications;
CREATE TRIGGER trg_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_application();

-- ============================================
-- 2. DOCUMENT UPLOAD NOTIFICATION
-- ============================================

CREATE OR REPLACE FUNCTION notify_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application_id UUID;
  v_program_name TEXT;
  v_university_name TEXT;
  v_university_tenant_id UUID;
  v_student_name TEXT;
  v_document_type TEXT;
  v_university_partner_ids UUID[];
  v_partner_id UUID;
BEGIN
  -- Get application ID
  v_application_id := NEW.application_id;

  -- Get application and program details
  SELECT
    p.name,
    u.name,
    u.tenant_id
  INTO
    v_program_name,
    v_university_name,
    v_university_tenant_id
  FROM applications a
  JOIN programs p ON a.program_id = p.id
  JOIN universities u ON p.university_id = u.id
  WHERE a.id = v_application_id;

  -- Get student name
  SELECT COALESCE(s.legal_name, s.preferred_name, prof.full_name, 'A student')
  INTO v_student_name
  FROM applications a
  JOIN students s ON a.student_id = s.id
  LEFT JOIN profiles prof ON s.profile_id = prof.id
  WHERE a.id = v_application_id;

  -- Get document type (cast enum to text if needed)
  v_document_type := COALESCE(NEW.document_type::TEXT, 'Document');

  -- Get university partner profile IDs
  SELECT ARRAY_AGG(p.id)
  INTO v_university_partner_ids
  FROM profiles p
  WHERE p.tenant_id = v_university_tenant_id
    AND p.role = 'partner';

  -- Notify each university partner
  IF v_university_partner_ids IS NOT NULL THEN
    FOREACH v_partner_id IN ARRAY v_university_partner_ids
    LOOP
      PERFORM create_notification(
        v_university_tenant_id,
        v_partner_id,
        'document',
        'New Document Uploaded',
        v_student_name || ' has uploaded a ' || v_document_type || ' for their application to ' || v_program_name || '.',
        jsonb_build_object(
          'application_id', v_application_id,
          'document_id', NEW.id,
          'document_type', v_document_type,
          'program_name', v_program_name,
          'university_name', v_university_name,
          'student_name', v_student_name
        ),
        '/university/documents'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for document uploads
DROP TRIGGER IF EXISTS trg_document_upload ON application_documents;
CREATE TRIGGER trg_document_upload
  AFTER INSERT ON application_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_upload();

-- ============================================
-- 3. INTERNAL NOTES UPDATE NOTIFICATION
-- ============================================

CREATE OR REPLACE FUNCTION notify_internal_notes_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_profile_id UUID;
  v_agent_profile_id UUID;
  v_program_name TEXT;
  v_university_name TEXT;
  v_tenant_id UUID;
BEGIN
  -- Only notify if internal_notes actually changed
  IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes AND NEW.internal_notes IS NOT NULL THEN
    -- Get application details
    SELECT
      s.profile_id,
      ag.profile_id,
      p.name,
      u.name,
      a.tenant_id
    INTO
      v_student_profile_id,
      v_agent_profile_id,
      v_program_name,
      v_university_name,
      v_tenant_id
    FROM applications a
    JOIN students s ON a.student_id = s.id
    LEFT JOIN agents ag ON a.agent_id = ag.id
    JOIN programs p ON a.program_id = p.id
    JOIN universities u ON p.university_id = u.id
    WHERE a.id = NEW.id;

    -- Notify student
    IF v_student_profile_id IS NOT NULL THEN
      PERFORM create_notification(
        v_tenant_id,
        v_student_profile_id,
        'application_status',
        'University Added Notes',
        v_university_name || ' has added notes to your application for ' || v_program_name || '.',
        jsonb_build_object(
          'application_id', NEW.id,
          'program_name', v_program_name,
          'university_name', v_university_name
        ),
        '/student/applications/' || NEW.id
      );
    END IF;

    -- Notify agent if assigned
    IF v_agent_profile_id IS NOT NULL THEN
      PERFORM create_notification(
        v_tenant_id,
        v_agent_profile_id,
        'application_status',
        'University Added Notes',
        v_university_name || ' has added notes to the application for ' || v_program_name || '.',
        jsonb_build_object(
          'application_id', NEW.id,
          'program_name', v_program_name,
          'university_name', v_university_name
        ),
        '/dashboard/applications'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for internal notes updates
DROP TRIGGER IF EXISTS trg_internal_notes_update ON applications;
CREATE TRIGGER trg_internal_notes_update
  AFTER UPDATE OF internal_notes ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_internal_notes_update();

-- ============================================
-- 4. DOCUMENT REQUEST STATUS NOTIFICATION
-- ============================================

CREATE OR REPLACE FUNCTION notify_document_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_profile_id UUID;
  v_request_type TEXT;
  v_tenant_id UUID;
BEGIN
  -- Get student profile ID
  SELECT s.profile_id, dr.tenant_id
  INTO v_student_profile_id, v_tenant_id
  FROM document_requests dr
  JOIN students s ON dr.student_id = s.id
  WHERE dr.id = NEW.id;

  v_request_type := COALESCE(NEW.request_type, 'Document');

  -- Notify on new request
  IF TG_OP = 'INSERT' THEN
    IF v_student_profile_id IS NOT NULL THEN
      PERFORM create_notification(
        v_tenant_id,
        v_student_profile_id,
        'document',
        'Document Requested',
        'A ' || v_request_type || ' document has been requested. Please upload it at your earliest convenience.',
        jsonb_build_object(
          'request_id', NEW.id,
          'request_type', v_request_type,
          'status', NEW.status
        ),
        '/student/documents'
      );
    END IF;
  -- Notify on status change
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_student_profile_id IS NOT NULL THEN
      -- Approved/Verified status
      IF NEW.status IN ('approved', 'verified', 'received') THEN
        PERFORM create_notification(
          v_tenant_id,
          v_student_profile_id,
          'document',
          'Document ' || INITCAP(NEW.status),
          'Your ' || v_request_type || ' document has been ' || NEW.status || '.',
          jsonb_build_object(
            'request_id', NEW.id,
            'request_type', v_request_type,
            'old_status', OLD.status,
            'new_status', NEW.status
          ),
          '/student/documents'
        );
      -- Rejected status
      ELSIF NEW.status = 'rejected' THEN
        PERFORM create_notification(
          v_tenant_id,
          v_student_profile_id,
          'document',
          'Document Needs Attention',
          'Your ' || v_request_type || ' document requires attention. Please review and resubmit.',
          jsonb_build_object(
            'request_id', NEW.id,
            'request_type', v_request_type,
            'old_status', OLD.status,
            'new_status', NEW.status
          ),
          '/student/documents'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for document request changes
DROP TRIGGER IF EXISTS trg_document_request_change ON document_requests;
CREATE TRIGGER trg_document_request_change
  AFTER INSERT OR UPDATE ON document_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_request_change();

-- ============================================
-- 5. ADD 'document' TYPE TO ALLOWED TYPES
-- ============================================

-- Update the comment on notifications table to reflect all types
COMMENT ON TABLE notifications IS
  'In-app notifications. Types: application_status, message, commission, course_recommendation, document, system';

-- ============================================
-- Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION notify_new_application() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_document_upload() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_internal_notes_update() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_document_request_change() TO authenticated;
