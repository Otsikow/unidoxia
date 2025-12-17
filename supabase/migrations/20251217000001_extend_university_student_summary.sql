-- ============================================================================
-- Extend university student summary function (dashboard list view)
-- ============================================================================
-- Adds date_of_birth + current_country so the university applications queue
-- can show richer student context without loading the full review payload.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_students_for_university_applications(
  p_student_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  legal_name TEXT,
  preferred_name TEXT,
  nationality TEXT,
  date_of_birth DATE,
  current_country TEXT,
  profile_name TEXT,
  profile_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role public.app_role;
  v_user_tenant UUID;
  v_university_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  v_user_role := public.get_user_role(v_user_id);

  -- Admin/staff can see all
  IF public.is_admin_or_staff(v_user_id) THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.legal_name,
      s.preferred_name,
      s.nationality,
      s.date_of_birth,
      s.current_country,
      p.full_name AS profile_name,
      p.email AS profile_email
    FROM public.students s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = ANY(p_student_ids);
    RETURN;
  END IF;

  -- University partners (partner or school_rep)
  IF v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role) THEN
    v_user_tenant := public.get_user_tenant(v_user_id);

    IF v_user_tenant IS NULL THEN
      RETURN;
    END IF;

    SELECT u.id INTO v_university_id
    FROM public.universities u
    WHERE u.tenant_id = v_user_tenant
    LIMIT 1;

    IF v_university_id IS NULL THEN
      RETURN;
    END IF;

    RETURN QUERY
    SELECT DISTINCT
      s.id,
      s.legal_name,
      s.preferred_name,
      s.nationality,
      s.date_of_birth,
      s.current_country,
      p.full_name AS profile_name,
      p.email AS profile_email
    FROM public.students s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = ANY(p_student_ids)
      AND EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.programs prog ON prog.id = a.program_id
        WHERE a.student_id = s.id
          AND prog.university_id = v_university_id
      );
    RETURN;
  END IF;

  -- Agents can see their linked students
  IF v_user_role = 'agent'::public.app_role THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.legal_name,
      s.preferred_name,
      s.nationality,
      s.date_of_birth,
      s.current_country,
      p.full_name AS profile_name,
      p.email AS profile_email
    FROM public.students s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = ANY(p_student_ids)
      AND EXISTS (
        SELECT 1 FROM public.agent_student_links asl
        WHERE asl.student_id = s.id
          AND asl.agent_profile_id = v_user_id
      );
    RETURN;
  END IF;

  -- Students can see their own record
  IF v_user_role = 'student'::public.app_role THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.legal_name,
      s.preferred_name,
      s.nationality,
      s.date_of_birth,
      s.current_country,
      p.full_name AS profile_name,
      p.email AS profile_email
    FROM public.students s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = ANY(p_student_ids)
      AND s.profile_id = v_user_id;
    RETURN;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_for_university_applications(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_students_for_university_applications(UUID[]) IS
  'Security definer function to get student summary data for dashboards, including DOB and current country.';

NOTIFY pgrst, 'reload config';

COMMIT;
