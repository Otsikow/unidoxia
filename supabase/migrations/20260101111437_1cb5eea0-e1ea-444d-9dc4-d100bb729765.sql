-- Admin-only bundle for student document review (avoids RLS blocks for the admin dashboard)
CREATE OR REPLACE FUNCTION public.get_admin_student_review_bundle(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_student record;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_staff(v_user_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT
    s.id,
    s.profile_id,
    s.tenant_id,
    s.legal_name,
    s.preferred_name,
    s.contact_email,
    s.contact_phone,
    s.current_country,
    s.nationality,
    s.date_of_birth,
    s.passport_number,
    s.passport_expiry,
    s.visa_history_json,
    s.education_history,
    s.address,
    s.created_at
  INTO v_student
  FROM public.students s
  WHERE s.id = p_student_id
    AND s.tenant_id = v_tenant_id
  LIMIT 1;

  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = 'P0002';
  END IF;

  v_result := jsonb_build_object(
    'student', jsonb_build_object(
      'id', v_student.id,
      'profile_id', v_student.profile_id,
      'legal_name', v_student.legal_name,
      'preferred_name', v_student.preferred_name,
      'contact_email', v_student.contact_email,
      'contact_phone', v_student.contact_phone,
      'current_country', v_student.current_country,
      'nationality', v_student.nationality,
      'date_of_birth', v_student.date_of_birth,
      'passport_number', v_student.passport_number,
      'passport_expiry', v_student.passport_expiry,
      'visa_history_json', v_student.visa_history_json,
      'education_history', v_student.education_history,
      'address', v_student.address,
      'created_at', v_student.created_at,
      'profile', (
        SELECT jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'avatar_url', p.avatar_url
        )
        FROM public.profiles p
        WHERE p.id = v_student.profile_id
        LIMIT 1
      ),
      'applications', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'status', a.status,
            'app_number', a.app_number,
            'submitted_at', a.submitted_at,
            'program', (
              SELECT jsonb_build_object(
                'id', pr.id,
                'name', pr.name,
                'level', pr.level,
                'university', (
                  SELECT jsonb_build_object(
                    'id', u.id,
                    'name', u.name,
                    'country', u.country
                  )
                  FROM public.universities u
                  WHERE u.id = pr.university_id
                  LIMIT 1
                )
              )
              FROM public.programs pr
              WHERE pr.id = a.program_id
              LIMIT 1
            )
          )
          ORDER BY a.created_at DESC
        )
        FROM public.applications a
        WHERE a.student_id = v_student.id
      ), '[]'::jsonb)
    ),
    'documents', COALESCE((
      SELECT jsonb_agg(to_jsonb(sd) ORDER BY sd.created_at DESC)
      FROM public.student_documents sd
      WHERE sd.student_id = v_student.id
    ), '[]'::jsonb),
    'education_records', COALESCE((
      SELECT jsonb_agg(to_jsonb(er) ORDER BY er.start_date DESC)
      FROM public.education_records er
      WHERE er.student_id = v_student.id
    ), '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;