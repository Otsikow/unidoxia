-- ============================================================================
-- Sync student particulars on application submission
-- ============================================================================
-- Ensures the student information entered during an application is persisted
-- to students + education_records so university reviewers always see it.
--
-- Security:
-- - SECURITY DEFINER with explicit authorization checks.
-- - Allows: admin/staff, owning student, or linked agent (via agent_student_links).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_student_profile_from_application_submit(
  p_student_id UUID,
  p_legal_name TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_date_of_birth DATE,
  p_nationality TEXT,
  p_passport_number TEXT,
  p_current_country TEXT,
  p_address JSONB,
  p_education_records JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role public.app_role;
  v_can_access BOOLEAN := FALSE;
  v_student_profile_id UUID;
  v_id_text TEXT;
  v_edu_id UUID;
  v_rec JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  v_user_role := public.get_user_role(v_user_id);

  -- Determine access
  IF public.is_admin_or_staff(v_user_id) THEN
    v_can_access := TRUE;
  ELSIF v_user_role = 'student'::public.app_role THEN
    SELECT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_student_id AND s.profile_id = v_user_id
    ) INTO v_can_access;
  ELSIF v_user_role = 'agent'::public.app_role THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.agent_student_links asl
      JOIN public.agents ag ON ag.id = asl.agent_id
      WHERE asl.student_id = p_student_id
        AND ag.profile_id = v_user_id
        AND COALESCE(asl.status, 'active') = 'active'
    ) INTO v_can_access;
  END IF;

  IF NOT v_can_access THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  -- Update students (only overwrite when new values are provided)
  UPDATE public.students s
  SET
    legal_name = COALESCE(NULLIF(p_legal_name, ''), s.legal_name),
    contact_email = COALESCE(NULLIF(p_contact_email, ''), s.contact_email),
    contact_phone = COALESCE(NULLIF(p_contact_phone, ''), s.contact_phone),
    date_of_birth = COALESCE(p_date_of_birth, s.date_of_birth),
    nationality = COALESCE(NULLIF(p_nationality, ''), s.nationality),
    passport_number = COALESCE(NULLIF(p_passport_number, ''), s.passport_number),
    current_country = COALESCE(NULLIF(p_current_country, ''), s.current_country),
    address = COALESCE(p_address, s.address),
    updated_at = now()
  WHERE s.id = p_student_id
  RETURNING s.profile_id INTO v_student_profile_id;

  -- Keep profile full_name roughly in sync (best-effort)
  IF v_student_profile_id IS NOT NULL AND NULLIF(p_legal_name, '') IS NOT NULL THEN
    UPDATE public.profiles p
    SET full_name = COALESCE(NULLIF(p_legal_name, ''), p.full_name),
        updated_at = now()
    WHERE p.id = v_student_profile_id;
  END IF;

  -- Upsert education records from JSONB array
  IF p_education_records IS NOT NULL AND jsonb_typeof(p_education_records) = 'array' THEN
    FOR v_rec IN
      SELECT value FROM jsonb_array_elements(p_education_records)
    LOOP
      BEGIN
        -- Validate/generate UUID
        v_id_text := v_rec->>'id';
        IF v_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
          v_edu_id := v_id_text::uuid;
        ELSE
          v_edu_id := gen_random_uuid();
        END IF;

        -- Skip invalid records
        IF COALESCE(NULLIF(v_rec->>'institutionName', ''), '') = '' THEN
          CONTINUE;
        END IF;
        IF COALESCE(NULLIF(v_rec->>'country', ''), '') = '' THEN
          CONTINUE;
        END IF;
        IF COALESCE(NULLIF(v_rec->>'startDate', ''), '') = '' THEN
          CONTINUE;
        END IF;

        INSERT INTO public.education_records (
          id,
          student_id,
          level,
          institution_name,
          country,
          start_date,
          end_date,
          grade_scale,
          gpa
        )
        VALUES (
          v_edu_id,
          p_student_id,
          COALESCE(NULLIF(v_rec->>'level', ''), ''),
          COALESCE(NULLIF(v_rec->>'institutionName', ''), ''),
          COALESCE(NULLIF(v_rec->>'country', ''), ''),
          (v_rec->>'startDate')::date,
          NULLIF(v_rec->>'endDate', '')::date,
          NULLIF(v_rec->>'gradeScale', ''),
          NULLIF(v_rec->>'gpa', '')::numeric
        )
        ON CONFLICT (id) DO UPDATE SET
          level = EXCLUDED.level,
          institution_name = EXCLUDED.institution_name,
          country = EXCLUDED.country,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          grade_scale = EXCLUDED.grade_scale,
          gpa = EXCLUDED.gpa,
          updated_at = now();
      EXCEPTION
        WHEN others THEN
          -- Ignore individual bad rows (keep submission resilient)
          CONTINUE;
      END;
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_student_profile_from_application_submit(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  DATE,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  JSONB
) TO authenticated;

COMMENT ON FUNCTION public.sync_student_profile_from_application_submit(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  DATE,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  JSONB
) IS 'Persists student particulars captured during application submission, with explicit authorization (student owner, linked agent, or staff).';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload config';

COMMIT;
