-- Enhance student application notifications
-- This migration ensures students receive proper notifications when:
-- 1. Application status changes
-- 2. Documents are requested
-- 3. Documents are reviewed/approved/rejected

-- ============================================
-- 1. IMPROVE APPLICATION STATUS NOTIFICATION
-- ============================================

-- Update the notify_application_status_change function to provide clearer messages
-- and handle edge cases (null profile_id, etc.)
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_profile_id UUID;
  v_agent_profile_id UUID;
  v_program_name TEXT;
  v_university_name TEXT;
  v_tenant_id UUID;
  v_status_message TEXT;
BEGIN
  -- Get student/agent profile IDs and application details
  SELECT
    s.profile_id,
    ag.profile_id,
    p.name,
    u.name,
    apps.tenant_id
  INTO
    v_student_profile_id,
    v_agent_profile_id,
    v_program_name,
    v_university_name,
    v_tenant_id
  FROM public.applications apps
  JOIN public.students s ON apps.student_id = s.id
  LEFT JOIN public.agents ag ON apps.agent_id = ag.id
  JOIN public.programs p ON apps.program_id = p.id
  JOIN public.universities u ON p.university_id = u.id
  WHERE apps.id = NEW.id;

  -- Only proceed if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Create a human-readable status message
    v_status_message := CASE NEW.status
      WHEN 'draft' THEN 'saved as a draft'
      WHEN 'submitted' THEN 'has been submitted successfully'
      WHEN 'under_review' THEN 'is now under review by the university'
      WHEN 'documents_required' THEN 'requires additional documents'
      WHEN 'conditional_offer' THEN 'has received a conditional offer!'
      WHEN 'unconditional_offer' THEN 'has received an unconditional offer!'
      WHEN 'offer_accepted' THEN 'offer has been accepted'
      WHEN 'cas_issued' THEN 'CAS has been issued'
      WHEN 'visa_applied' THEN 'visa application submitted'
      WHEN 'visa_granted' THEN 'visa has been granted!'
      WHEN 'enrolled' THEN 'enrollment is complete!'
      WHEN 'rejected' THEN 'was not successful this time'
      WHEN 'withdrawn' THEN 'has been withdrawn'
      ELSE 'status has been updated to ' || NEW.status
    END;

    -- Notify student (only if profile_id exists)
    IF v_student_profile_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_tenant_id,
        v_student_profile_id,
        'application_status',
        CASE NEW.status
          WHEN 'conditional_offer' THEN '🎉 Congratulations! Offer Received'
          WHEN 'unconditional_offer' THEN '🎉 Congratulations! Offer Received'
          WHEN 'cas_issued' THEN '📄 CAS Issued'
          WHEN 'visa_granted' THEN '🎉 Visa Granted!'
          WHEN 'enrolled' THEN '🎓 Enrolled Successfully!'
          WHEN 'rejected' THEN 'Application Update'
          WHEN 'documents_required' THEN '📋 Documents Required'
          ELSE 'Application Status Updated'
        END,
        'Your application to ' || v_program_name || ' at ' || v_university_name || ' ' || v_status_message || '.',
        jsonb_build_object(
          'application_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'program_name', v_program_name,
          'university_name', v_university_name,
          'updated_at', NOW()
        ),
        '/student/applications/' || NEW.id
      );
    END IF;

    -- Notify agent if assigned
    IF v_agent_profile_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_tenant_id,
        v_agent_profile_id,
        'application_status',
        'Application Status Updated',
        'Application to ' || v_program_name || ' at ' || v_university_name || ' ' || v_status_message || '.',
        jsonb_build_object(
          'application_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'program_name', v_program_name,
          'university_name', v_university_name,
          'updated_at', NOW()
        ),
        '/dashboard/applications'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is properly attached
DROP TRIGGER IF EXISTS trg_application_status_change ON public.applications;
CREATE TRIGGER trg_application_status_change
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();

-- ============================================
-- 2. IMPROVE DOCUMENT REQUEST NOTIFICATION
-- ============================================

-- Update the document request notification function for clearer messages
CREATE OR REPLACE FUNCTION notify_document_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_profile_id UUID;
  v_request_type TEXT;
  v_tenant_id UUID;
  v_document_type_display TEXT;
BEGIN
  -- Get student profile ID
  SELECT s.profile_id, dr.tenant_id
  INTO v_student_profile_id, v_tenant_id
  FROM document_requests dr
  JOIN students s ON dr.student_id = s.id
  WHERE dr.id = NEW.id;

  -- Skip if student has no profile_id
  IF v_student_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get request type and format it nicely
  v_request_type := COALESCE(NEW.request_type, NEW.document_type, 'Document');
  v_document_type_display := REPLACE(REPLACE(INITCAP(v_request_type), '_', ' '), '-', ' ');

  -- Notify on new request
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      v_tenant_id,
      v_student_profile_id,
      'document',
      '📋 Document Requested',
      'A ' || v_document_type_display || ' has been requested. Please upload it at your earliest convenience.',
      jsonb_build_object(
        'request_id', NEW.id,
        'request_type', v_request_type,
        'status', NEW.status,
        'notes', NEW.notes,
        'created_at', NOW()
      ),
      '/student/documents'
    );
  -- Notify on status change
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- Approved/Verified status
    IF NEW.status IN ('approved', 'verified', 'received') THEN
      PERFORM create_notification(
        v_tenant_id,
        v_student_profile_id,
        'document',
        '✅ Document ' || INITCAP(NEW.status),
        'Your ' || v_document_type_display || ' has been ' || NEW.status || '.',
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
        '⚠️ Document Needs Attention',
        'Your ' || v_document_type_display || ' requires attention. Please review and resubmit.',
        jsonb_build_object(
          'request_id', NEW.id,
          'request_type', v_request_type,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'notes', NEW.notes
        ),
        '/student/documents'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is properly attached
DROP TRIGGER IF EXISTS trg_document_request_change ON document_requests;
CREATE TRIGGER trg_document_request_change
  AFTER INSERT OR UPDATE ON document_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_request_change();

-- ============================================
-- 3. ADD DOCUMENT REVIEW STATUS NOTIFICATION
-- ============================================

-- Create notification for document review status changes (student_documents table)
CREATE OR REPLACE FUNCTION notify_document_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_profile_id UUID;
  v_tenant_id UUID;
  v_document_type_display TEXT;
BEGIN
  -- Only trigger on status change
  IF NEW.verified_status IS NOT DISTINCT FROM OLD.verified_status THEN
    RETURN NEW;
  END IF;

  -- Get student profile ID
  SELECT s.profile_id, s.tenant_id
  INTO v_student_profile_id, v_tenant_id
  FROM students s
  WHERE s.id = NEW.student_id;

  -- Skip if no profile
  IF v_student_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Format document type
  v_document_type_display := REPLACE(REPLACE(INITCAP(COALESCE(NEW.document_type, 'Document')), '_', ' '), '-', ' ');

  -- Notify based on new status
  IF NEW.verified_status = 'verified' THEN
    PERFORM create_notification(
      v_tenant_id,
      v_student_profile_id,
      'document',
      '✅ Document Verified',
      'Your ' || v_document_type_display || ' has been verified successfully.',
      jsonb_build_object(
        'document_id', NEW.id,
        'document_type', NEW.document_type,
        'old_status', OLD.verified_status,
        'new_status', NEW.verified_status
      ),
      '/student/documents'
    );
  ELSIF NEW.verified_status = 'rejected' THEN
    PERFORM create_notification(
      v_tenant_id,
      v_student_profile_id,
      'document',
      '⚠️ Document Rejected',
      'Your ' || v_document_type_display || ' needs to be resubmitted. ' || 
      COALESCE('Reason: ' || NEW.verification_notes, 'Please check the requirements and try again.'),
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

  RETURN NEW;
END;
$$;

-- Create trigger for student document review changes
DROP TRIGGER IF EXISTS trg_document_review_change ON student_documents;
CREATE TRIGGER trg_document_review_change
  AFTER UPDATE OF verified_status ON student_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_review_change();

-- ============================================
-- Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION notify_application_status_change() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_document_request_change() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_document_review_change() TO authenticated;

-- ============================================
-- Add comment for documentation
-- ============================================

COMMENT ON FUNCTION notify_application_status_change() IS 
  'Sends notifications to students and agents when application status changes. Includes human-readable status messages and action URLs.';

COMMENT ON FUNCTION notify_document_request_change() IS 
  'Sends notifications to students when documents are requested or when request status changes.';

COMMENT ON FUNCTION notify_document_review_change() IS 
  'Sends notifications to students when their uploaded documents are verified or rejected.';
