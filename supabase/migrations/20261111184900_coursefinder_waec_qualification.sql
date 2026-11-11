-- Keep the submission check aligned with the registration form.
-- The function remains internal; no rows or policies change.

CREATE OR REPLACE FUNCTION public.coursefinder_profile_missing(p_student_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s jsonb;
  missing text[] := ARRAY[]::text[];
  col text;
  er record;
  er_number integer := 0;
  entry jsonb;
  entry_number integer := 0;
  secondary_end date;
  last_study_end date;
  still_studying boolean;
  waec boolean;
BEGIN
  SELECT to_jsonb(st) INTO s FROM public.students st WHERE st.id = p_student_id;
  IF s IS NULL THEN
    RETURN ARRAY['student profile'];
  END IF;

  FOREACH col IN ARRAY ARRAY[
    'first_name', 'last_name', 'contact_phone', 'contact_email', 'date_of_birth', 'gender',
    'marital_status', 'dependants_travelling', 'nationality', 'citizenship', 'city_of_birth', 'country_of_birth',
    'passport_number', 'passport_issue_date', 'passport_expiry', 'passport_issue_country',
    'address_line_1', 'country_of_residence', 'state_region', 'city', 'postal_code',
    'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone', 'emergency_contact_email',
    'has_other_citizenship', 'lived_or_studied_abroad', 'previous_immigration_applications', 'has_visa_refusals',
    'country_of_education', 'highest_education_level', 'secondary_board', 'secondary_qualification',
    'secondary_school_name', 'secondary_school_country', 'secondary_school_state', 'secondary_school_city',
    'secondary_start_month', 'secondary_start_year', 'secondary_end_month', 'secondary_end_year',
    'secondary_language_of_instruction', 'secondary_grades_band', 'secondary_final_grade'
  ] LOOP
    IF COALESCE(btrim(s ->> col), '') = '' THEN
      missing := array_append(missing, col);
    END IF;
  END LOOP;

  IF COALESCE(btrim(s ->> 'emergency_contact_email'), '') <> ''
     AND (s ->> 'emergency_contact_email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    missing := array_append(missing, 'emergency_contact_email (valid email)');
  END IF;

  IF (s -> 'permanent_same_as_mailing') IS DISTINCT FROM 'true'::jsonb THEN
    FOREACH col IN ARRAY ARRAY['permanent_address_line_1', 'permanent_country', 'permanent_state_region',
                               'permanent_city', 'permanent_postal_code'] LOOP
      IF COALESCE(btrim(s ->> col), '') = '' THEN
        missing := array_append(missing, col);
      END IF;
    END LOOP;
  END IF;

  IF (s -> 'has_other_citizenship') = 'true'::jsonb AND COALESCE(btrim(s ->> 'other_citizenship'), '') = '' THEN
    missing := array_append(missing, 'other_citizenship');
  END IF;

  IF (s -> 'has_visa_refusals') = 'true'::jsonb THEN
    FOREACH col IN ARRAY ARRAY['visa_refusal_country', 'visa_refusal_year', 'visa_refusal_type'] LOOP
      IF COALESCE(btrim(s ->> col), '') = '' THEN
        missing := array_append(missing, col);
      END IF;
    END LOOP;
  END IF;

  -- Cambridge, IB, NECO and NABTEB do not require a WAEC card.
  waec := lower(concat_ws(' ', s ->> 'secondary_board', s ->> 'secondary_qualification'))
    ~ '\m(waec|wassce|west african examinations? council)\M';
  IF waec THEN
    IF COALESCE(btrim(s ->> 'waec_scratch_card_pin'), '') = '' THEN
      missing := array_append(missing, 'waec_scratch_card_pin');
    END IF;
    IF COALESCE(btrim(s ->> 'waec_scratch_card_serial'), '') = '' THEN
      missing := array_append(missing, 'waec_scratch_card_serial');
    END IF;
  END IF;

  FOR er IN
    SELECT to_jsonb(e) AS r FROM public.education_records e
    WHERE e.student_id = p_student_id AND e.level IS DISTINCT FROM 'high_school'
    ORDER BY e.start_date NULLS LAST
  LOOP
    er_number := er_number + 1;
    FOREACH col IN ARRAY ARRAY['institution_name', 'country', 'state_region', 'city', 'degree_title', 'final_grade',
                               'grade_scale', 'gpa', 'language_of_instruction', 'start_date', 'end_date'] LOOP
      IF COALESCE(btrim(er.r ->> col), '') = '' THEN
        missing := array_append(missing, format('degree %s: %s', er_number, col));
      END IF;
    END LOOP;
  END LOOP;

  -- Gap or work history since the last study.
  IF (s -> 'no_gap_since_study') = 'true'::jsonb THEN
    IF (s ->> 'secondary_end_year') ~ '^\d{4}$' AND (s ->> 'secondary_end_month') ~ '^\d{1,2}$'
       AND (s ->> 'secondary_end_month')::integer BETWEEN 1 AND 12 THEN
      secondary_end := make_date((s ->> 'secondary_end_year')::integer, (s ->> 'secondary_end_month')::integer, 1);
    END IF;
    SELECT max(e.end_date), bool_or(e.end_date IS NULL AND e.start_date IS NOT NULL)
      INTO last_study_end, still_studying
    FROM public.education_records e
    WHERE e.student_id = p_student_id AND e.level IS DISTINCT FROM 'high_school';
    last_study_end := GREATEST(last_study_end, secondary_end);
    IF NOT (COALESCE(still_studying, false)
            OR (last_study_end IS NOT NULL AND last_study_end >= (date_trunc('month', now()) - interval '6 months')::date)) THEN
      missing := array_append(missing, 'gap or work history ("no gap" no longer applies)');
    END IF;
  ELSIF jsonb_typeof(s -> 'work_experience') IS DISTINCT FROM 'array'
        OR jsonb_array_length(s -> 'work_experience') = 0 THEN
    missing := array_append(missing, 'gap or work history');
  END IF;

  IF jsonb_typeof(s -> 'work_experience') = 'array' THEN
    FOR entry IN SELECT value FROM jsonb_array_elements(s -> 'work_experience') LOOP
      entry_number := entry_number + 1;
      IF COALESCE(btrim(entry ->> 'employer'), '') = '' THEN
        missing := array_append(missing, format('history entry %s: activity or employer', entry_number));
      END IF;
      IF COALESCE(btrim(entry ->> 'start_date'), '') = '' THEN
        missing := array_append(missing, format('history entry %s: from date', entry_number));
      END IF;
      IF COALESCE(btrim(entry ->> 'end_date'), '') = '' AND (entry -> 'is_current') IS DISTINCT FROM 'true'::jsonb THEN
        missing := array_append(missing, format('history entry %s: to date', entry_number));
      END IF;
    END LOOP;
  END IF;

  RETURN missing;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.coursefinder_profile_missing(uuid) FROM PUBLIC, anon, authenticated;
