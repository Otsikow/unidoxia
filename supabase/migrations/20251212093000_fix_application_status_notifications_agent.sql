-- Fix agent notifications on application status changes
-- The previous trigger function incorrectly selected profiles.profile_id (does not exist),
-- causing agent notifications to never be created.

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

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Notify student
    PERFORM public.create_notification(
      v_tenant_id,
      v_student_profile_id,
      'application_status',
      'Application Status Updated',
      'Your application to ' || v_program_name || ' at ' || v_university_name || ' is now ' || NEW.status || '.',
      jsonb_build_object(
        'application_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'program_name', v_program_name,
        'university_name', v_university_name
      ),
      '/student/applications'
    );

    -- Notify agent if assigned
    IF v_agent_profile_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_tenant_id,
        v_agent_profile_id,
        'application_status',
        'Application Status Updated',
        'Application to ' || v_program_name || ' at ' || v_university_name || ' is now ' || NEW.status || '.',
        jsonb_build_object(
          'application_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status,
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

-- Ensure the trigger is present and points to the corrected function
DROP TRIGGER IF EXISTS trg_application_status_change ON public.applications;
CREATE TRIGGER trg_application_status_change
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();

