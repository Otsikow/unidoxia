-- Enable submission notifications
CREATE OR REPLACE FUNCTION public.notify_application_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_name TEXT;
  v_university_name TEXT;
  v_student_profile_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Only trigger on insert
  IF TG_OP = 'INSERT' THEN
    -- Get application details
    SELECT
      p.name,
      u.name,
      s.profile_id,
      apps.tenant_id
    INTO
      v_program_name,
      v_university_name,
      v_student_profile_id,
      v_tenant_id
    FROM public.applications apps
    JOIN public.students s ON apps.student_id = s.id
    JOIN public.programs p ON apps.program_id = p.id
    JOIN public.universities u ON p.university_id = u.id
    WHERE apps.id = NEW.id;

    -- Notify student (confirmation)
    IF v_student_profile_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_tenant_id,
        v_student_profile_id,
        'application_status',
        'Application Submitted',
        'Your application to ' || v_program_name || ' at ' || v_university_name || ' has been submitted successfully.',
        jsonb_build_object(
          'application_id', NEW.id,
          'status', 'submitted',
          'program_name', v_program_name,
          'university_name', v_university_name,
          'created_at', NOW()
        ),
        '/student/applications/' || NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_application_submission ON public.applications;
CREATE TRIGGER trg_application_submission
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_submission();

GRANT EXECUTE ON FUNCTION notify_application_submission() TO authenticated;
COMMENT ON FUNCTION notify_application_submission() IS 'Sends in-app notification to student when application is submitted.';
