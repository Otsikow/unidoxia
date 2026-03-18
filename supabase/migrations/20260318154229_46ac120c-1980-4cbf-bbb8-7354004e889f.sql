
-- Function to send profile completion reminders to students with incomplete profiles
-- Only sends one reminder per student per 3-day window to avoid spamming
CREATE OR REPLACE FUNCTION public.send_profile_completion_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
  v_student RECORD;
  v_missing_fields TEXT[];
  v_content TEXT;
BEGIN
  FOR v_student IN
    SELECT
      s.id AS student_id,
      s.profile_id,
      s.tenant_id,
      s.legal_name,
      s.contact_email,
      s.contact_phone,
      s.date_of_birth,
      s.nationality,
      s.current_country,
      p.email AS profile_email,
      p.phone AS profile_phone
    FROM public.students s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE p.active = true
      AND (
        s.legal_name IS NULL OR btrim(s.legal_name) = ''
        OR (s.contact_email IS NULL OR btrim(s.contact_email) = '') AND (p.email IS NULL OR btrim(p.email) = '')
        OR (s.contact_phone IS NULL OR btrim(s.contact_phone) = '') AND (p.phone IS NULL OR btrim(p.phone) = '')
        OR s.date_of_birth IS NULL
        OR s.nationality IS NULL OR btrim(s.nationality) = ''
        OR s.current_country IS NULL OR btrim(s.current_country) = ''
      )
      -- No reminder sent in the last 3 days
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = s.profile_id
          AND n.type = 'profile_reminder'
          AND n.created_at > now() - interval '3 days'
      )
  LOOP
    v_missing_fields := ARRAY[]::TEXT[];

    IF v_student.legal_name IS NULL OR btrim(v_student.legal_name) = '' THEN
      v_missing_fields := v_missing_fields || 'Full Name';
    END IF;
    IF (v_student.contact_email IS NULL OR btrim(v_student.contact_email) = '')
       AND (v_student.profile_email IS NULL OR btrim(v_student.profile_email) = '') THEN
      v_missing_fields := v_missing_fields || 'Email Address';
    END IF;
    IF (v_student.contact_phone IS NULL OR btrim(v_student.contact_phone) = '')
       AND (v_student.profile_phone IS NULL OR btrim(v_student.profile_phone) = '') THEN
      v_missing_fields := v_missing_fields || 'Phone Number';
    END IF;
    IF v_student.date_of_birth IS NULL THEN
      v_missing_fields := v_missing_fields || 'Date of Birth';
    END IF;
    IF v_student.nationality IS NULL OR btrim(v_student.nationality) = '' THEN
      v_missing_fields := v_missing_fields || 'Nationality';
    END IF;
    IF v_student.current_country IS NULL OR btrim(v_student.current_country) = '' THEN
      v_missing_fields := v_missing_fields || 'Current Country';
    END IF;

    v_content := 'Please complete your profile to unlock document uploads and applications. Missing: ' || array_to_string(v_missing_fields, ', ') || '.';

    PERFORM public.create_notification(
      v_student.tenant_id,
      v_student.profile_id,
      'profile_reminder',
      'Complete Your Profile',
      v_content,
      jsonb_build_object('missing_fields', to_jsonb(v_missing_fields)),
      '/student/profile'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
