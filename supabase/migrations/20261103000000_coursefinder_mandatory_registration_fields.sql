-- CourseFinder (KC Overseas) mandatory registration and onboarding fields.
--
-- Adds the remaining fields CourseFinder asks for and enforces the rules on the
-- server for NEW student records only. Existing students are flagged as legacy
-- (coursefinder_fields_required = false) so none of their saves can start
-- failing; the app prompts them to complete the missing fields instead.
--
-- Why not an insert-time "NOT NULL" check: handle_new_user() inserts an empty
-- students row at sign-up, before the student has typed anything, so required
-- values can only be enforced as the student fills the profile in. The trigger
-- below therefore (a) validates every conditional rule whenever the related
-- columns change and (b) stops a student clearing a required answer once given.
--
-- The coursefinder_fields_required flag itself is protected: any insert that
-- does not come from the service role is forced to true, and a signed-in user
-- (student or staff, through the app) cannot change it on update. Only the
-- service role or a direct database session (no signed-in user) can change it.
--
-- Visa refusals are stored as structured answers only (country, year, visa type
-- and an optional reason from a fixed list). There is deliberately no free-text
-- field, and the reason list has no criminal or health options.
--
-- Section 4 adds the server-side complete-profile check for applications.
-- A commented rollback script is at the end of this file.

-- 1. New columns ------------------------------------------------------------

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS dependants_travelling integer,
  ADD COLUMN IF NOT EXISTS other_citizenship text,
  ADD COLUMN IF NOT EXISTS visa_refusal_country text,
  ADD COLUMN IF NOT EXISTS visa_refusal_year integer,
  ADD COLUMN IF NOT EXISTS visa_refusal_type text,
  ADD COLUMN IF NOT EXISTS visa_refusal_reason text,
  ADD COLUMN IF NOT EXISTS secondary_final_grade text,
  ADD COLUMN IF NOT EXISTS no_gap_since_study boolean;

-- Existing rows get false (legacy, prompt only). New rows default to true.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS coursefinder_fields_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.students
  ALTER COLUMN coursefinder_fields_required SET DEFAULT true;

COMMENT ON COLUMN public.students.dependants_travelling IS 'CourseFinder: number of dependant children travelling with the student (0 or more).';
COMMENT ON COLUMN public.students.other_citizenship IS 'CourseFinder: which other citizenship(s) the student holds, required when has_other_citizenship is true.';
COMMENT ON COLUMN public.students.visa_refusal_country IS 'CourseFinder: country that refused the most recent visa. Required when has_visa_refusals is true.';
COMMENT ON COLUMN public.students.visa_refusal_year IS 'CourseFinder: year of the most recent visa refusal. Required when has_visa_refusals is true.';
COMMENT ON COLUMN public.students.visa_refusal_type IS 'CourseFinder: type of visa refused, from a fixed list. Required when has_visa_refusals is true.';
COMMENT ON COLUMN public.students.visa_refusal_reason IS 'CourseFinder: optional main reason given, from a fixed list with no criminal or health options. No free text.';
COMMENT ON COLUMN public.students.secondary_final_grade IS 'CourseFinder: final secondary result, for example WASSCE aggregate or grades.';
COMMENT ON COLUMN public.students.no_gap_since_study IS 'CourseFinder: true when the student says there is no gap since their last study. Allowed only if the last study ended within 6 months.';
COMMENT ON COLUMN public.students.coursefinder_fields_required IS 'True for students created after the CourseFinder mandatory fields went live. False for legacy students, who are prompted but never blocked.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_dependants_travelling_range'
  ) THEN
    -- Safe on existing rows: the column is new, so every existing value is NULL.
    ALTER TABLE public.students
      ADD CONSTRAINT students_dependants_travelling_range
      CHECK (dependants_travelling IS NULL OR dependants_travelling BETWEEN 0 AND 20);
  END IF;
  -- Visa refusal answers: fixed lists only (the columns are new, so existing values are NULL).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_visa_refusal_year_range') THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_visa_refusal_year_range
      CHECK (visa_refusal_year IS NULL OR visa_refusal_year BETWEEN 1950 AND 2100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_visa_refusal_type_list') THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_visa_refusal_type_list
      CHECK (visa_refusal_type IS NULL OR visa_refusal_type IN (
        'Student', 'Visitor or tourist', 'Work', 'Family or dependant', 'Transit', 'Other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_visa_refusal_reason_list') THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_visa_refusal_reason_list
      CHECK (visa_refusal_reason IS NULL OR visa_refusal_reason IN (
        'Financial evidence', 'Missing or incomplete documents', 'Course or study plans',
        'Intention to return home', 'Previous immigration history', 'Other', 'Prefer not to say'));
  END IF;
END $$;

ALTER TABLE public.education_records
  ADD COLUMN IF NOT EXISTS final_grade text;

COMMENT ON COLUMN public.education_records.final_grade IS 'CourseFinder: final grade or degree class, for example Second Class Upper or CGPA 3.4.';

-- 2. Students: server-side rules for new records ------------------------------

CREATE OR REPLACE FUNCTION public.enforce_coursefinder_required_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_insert boolean := TG_OP = 'INSERT';
  acting_student boolean := auth.uid() IS NOT NULL AND auth.uid() = NEW.profile_id;
  required_column text;
  old_row jsonb;
  new_row jsonb;
  entry jsonb;
  entry_number integer := 0;
  secondary_end date;
  last_study_end date;
  still_studying boolean;
  secondary_dates_changed boolean;
  no_gap_ok boolean;
  privileged boolean := COALESCE(auth.role(), '') = 'service_role' OR auth.uid() IS NULL;
BEGIN
  -- The flag is not the student's to set. Runs before the legacy early return.
  IF is_insert THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
      NEW.coursefinder_fields_required := true;
    END IF;
  ELSIF NEW.coursefinder_fields_required IS DISTINCT FROM OLD.coursefinder_fields_required
        AND NOT privileged THEN
    NEW.coursefinder_fields_required := OLD.coursefinder_fields_required;
  END IF;

  IF NEW.coursefinder_fields_required IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Other citizenship: say which one.
  IF NEW.has_other_citizenship IS TRUE
     AND COALESCE(btrim(NEW.other_citizenship), '') = ''
     AND (is_insert
          OR NEW.has_other_citizenship IS DISTINCT FROM OLD.has_other_citizenship
          OR NEW.other_citizenship IS DISTINCT FROM OLD.other_citizenship) THEN
    RAISE EXCEPTION 'Please say which other citizenship you hold.' USING ERRCODE = 'check_violation';
  END IF;

  -- Visa refusals: country, year and visa type required (structured, no free text).
  IF NEW.has_visa_refusals IS TRUE
     AND (is_insert
          OR NEW.has_visa_refusals IS DISTINCT FROM OLD.has_visa_refusals
          OR NEW.visa_refusal_country IS DISTINCT FROM OLD.visa_refusal_country
          OR NEW.visa_refusal_year IS DISTINCT FROM OLD.visa_refusal_year
          OR NEW.visa_refusal_type IS DISTINCT FROM OLD.visa_refusal_type) THEN
    IF COALESCE(btrim(NEW.visa_refusal_country), '') = '' OR NEW.visa_refusal_year IS NULL
       OR COALESCE(btrim(NEW.visa_refusal_type), '') = '' THEN
      RAISE EXCEPTION 'Please give the country, year and type of visa for your previous visa refusal.' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.visa_refusal_year > EXTRACT(YEAR FROM now())::integer THEN
      RAISE EXCEPTION 'The visa refusal year must not be in the future.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Emergency contact email must look like an email address.
  IF COALESCE(btrim(NEW.emergency_contact_email), '') <> ''
     AND NEW.emergency_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     AND (is_insert OR NEW.emergency_contact_email IS DISTINCT FROM OLD.emergency_contact_email) THEN
    RAISE EXCEPTION 'Please enter a valid email address for your emergency contact.' USING ERRCODE = 'check_violation';
  END IF;

  -- Secondary education: end must not be before start.
  IF NEW.secondary_start_year IS NOT NULL AND NEW.secondary_start_month IS NOT NULL
     AND NEW.secondary_end_year IS NOT NULL AND NEW.secondary_end_month IS NOT NULL
     AND (is_insert
          OR NEW.secondary_start_year IS DISTINCT FROM OLD.secondary_start_year
          OR NEW.secondary_start_month IS DISTINCT FROM OLD.secondary_start_month
          OR NEW.secondary_end_year IS DISTINCT FROM OLD.secondary_end_year
          OR NEW.secondary_end_month IS DISTINCT FROM OLD.secondary_end_month) THEN
    IF NEW.secondary_end_month NOT BETWEEN 1 AND 12 OR NEW.secondary_start_month NOT BETWEEN 1 AND 12 THEN
      RAISE EXCEPTION 'Secondary school months must be from 1 to 12.' USING ERRCODE = 'check_violation';
    END IF;
    IF (NEW.secondary_end_year * 12 + NEW.secondary_end_month) < (NEW.secondary_start_year * 12 + NEW.secondary_start_month) THEN
      RAISE EXCEPTION 'Your secondary school end date must not be before the start date.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Gap or work history entries: activity, from date, and to date or "still doing this".
  IF NEW.work_experience IS NOT NULL
     AND jsonb_typeof(NEW.work_experience) = 'array'
     AND (is_insert OR NEW.work_experience IS DISTINCT FROM OLD.work_experience) THEN
    FOR entry IN SELECT value FROM jsonb_array_elements(NEW.work_experience) LOOP
      entry_number := entry_number + 1;
      IF COALESCE(btrim(entry ->> 'employer'), '') = '' THEN
        RAISE EXCEPTION 'History entry %: please add the activity or employer.', entry_number USING ERRCODE = 'check_violation';
      END IF;
      IF COALESCE(btrim(entry ->> 'start_date'), '') = '' THEN
        RAISE EXCEPTION 'History entry %: please add the from date.', entry_number USING ERRCODE = 'check_violation';
      END IF;
      IF COALESCE(btrim(entry ->> 'end_date'), '') = '' AND (entry -> 'is_current') IS DISTINCT FROM 'true'::jsonb THEN
        RAISE EXCEPTION 'History entry %: please add the to date, or say you are still doing this.', entry_number USING ERRCODE = 'check_violation';
      END IF;
      IF COALESCE(btrim(entry ->> 'end_date'), '') <> '' AND (entry ->> 'end_date') < (entry ->> 'start_date') THEN
        RAISE EXCEPTION 'History entry %: the to date must not be before the from date.', entry_number USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;

  -- "No gap since last study" is allowed only if the last study ended in the past
  -- 6 months, or a college or university entry has no end date (still studying).
  -- Checked when the answer is given, and again when the secondary dates change.
  secondary_dates_changed := NOT is_insert
    AND (NEW.secondary_end_year IS DISTINCT FROM OLD.secondary_end_year
         OR NEW.secondary_end_month IS DISTINCT FROM OLD.secondary_end_month);
  IF NEW.no_gap_since_study IS TRUE
     AND (is_insert OR OLD.no_gap_since_study IS DISTINCT FROM TRUE OR secondary_dates_changed) THEN
    IF NEW.secondary_end_year IS NOT NULL AND NEW.secondary_end_month BETWEEN 1 AND 12 THEN
      secondary_end := make_date(NEW.secondary_end_year, NEW.secondary_end_month, 1);
    END IF;
    SELECT max(er.end_date), bool_or(er.end_date IS NULL AND er.start_date IS NOT NULL)
      INTO last_study_end, still_studying
    FROM public.education_records er
    WHERE er.student_id = NEW.id AND er.level IS DISTINCT FROM 'high_school';
    last_study_end := GREATEST(last_study_end, secondary_end);
    no_gap_ok := COALESCE(still_studying, false)
      OR (last_study_end IS NOT NULL AND last_study_end >= (date_trunc('month', now()) - interval '6 months')::date);
    IF NOT no_gap_ok THEN
      IF NOT is_insert AND OLD.no_gap_since_study IS TRUE THEN
        -- Earlier answer no longer applies after a date change: clear it rather than block the save.
        NEW.no_gap_since_study := false;
      ELSIF last_study_end IS NULL THEN
        RAISE EXCEPTION 'Add your education dates first, then choose "no gap".' USING ERRCODE = 'check_violation';
      ELSE
        RAISE EXCEPTION 'You can only choose "no gap" if your last study ended in the past 6 months. Please add what you have done since.' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  -- A student cannot clear a required answer once it has been given.
  -- Staff and admins (and system jobs) are not restricted, so corrections still work.
  IF NOT is_insert AND acting_student THEN
    old_row := to_jsonb(OLD);
    new_row := to_jsonb(NEW);
    FOREACH required_column IN ARRAY ARRAY[
      'first_name', 'last_name', 'contact_phone', 'contact_email', 'date_of_birth', 'gender',
      'marital_status', 'dependants_travelling', 'nationality', 'citizenship', 'city_of_birth', 'country_of_birth',
      'passport_number', 'passport_issue_date', 'passport_expiry', 'passport_issue_country',
      'address_line_1', 'country_of_residence', 'state_region', 'city', 'postal_code',
      'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone', 'emergency_contact_email',
      'has_other_citizenship', 'lived_or_studied_abroad', 'previous_immigration_applications', 'has_visa_refusals',
      'country_of_education', 'highest_education_level', 'secondary_school_name',
      'secondary_start_month', 'secondary_start_year', 'secondary_end_month', 'secondary_end_year',
      'secondary_final_grade'
    ] LOOP
      IF COALESCE(btrim(old_row ->> required_column), '') <> ''
         AND COALESCE(btrim(new_row ->> required_column), '') = '' THEN
        RAISE EXCEPTION 'The % field is required and cannot be left blank.', replace(required_column, '_', ' ')
          USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_coursefinder_required_fields() IS
  'Server-side CourseFinder field rules for students with coursefinder_fields_required = true. Legacy students are skipped.';

DROP TRIGGER IF EXISTS enforce_coursefinder_required_fields ON public.students;
CREATE TRIGGER enforce_coursefinder_required_fields
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_coursefinder_required_fields();

-- 3. Education records: end must not be before start ------------------------
-- The final grade is required in the form. It is not forced here because other
-- screens (for example the application wizard) also insert education records.
-- Applies to new or changed entries for new students only. Existing rows are
-- left untouched, and editing an unrelated column of an old row still works.

CREATE OR REPLACE FUNCTION public.enforce_coursefinder_education_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  required boolean;
BEGIN
  SELECT s.coursefinder_fields_required INTO required
  FROM public.students s
  WHERE s.id = NEW.student_id;

  IF required IS NOT TRUE OR NEW.level = 'high_school' THEN
    RETURN NEW;
  END IF;

  IF NEW.end_date IS NOT NULL AND NEW.start_date IS NOT NULL AND NEW.end_date < NEW.start_date
     AND (TG_OP = 'INSERT' OR NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date) THEN
    RAISE EXCEPTION 'The end date must not be before the start date.' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_coursefinder_education_record ON public.education_records;
CREATE TRIGGER enforce_coursefinder_education_record
  BEFORE INSERT OR UPDATE ON public.education_records
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_coursefinder_education_record();

-- 4. Applications: complete profile before sending on to CourseFinder ---------
-- Sending an application on (into screening, any offer, CAS or LOA, visa or
-- enrolled) needs a complete CourseFinder profile. Only these gated statuses
-- are checked; the list matches COURSEFINDER_SUBMISSION_STATUSES in
-- src/lib/coursefinderProfile.ts. Any move INTO a gated status from a status
-- outside the list is checked, including from draft, submitted, withdrawn,
-- deferred, rejected, under review, pending documents or interview, so leaving
-- and re-entering cannot get round it. Moves into non-gated statuses (for
-- example rejecting, withdrawing, deferring, asking for documents or an
-- interview) and moves between gated statuses are not profile-checked. Moves
-- between gated statuses and submitting an existing application still need a
-- current sharing authorisation (see the trigger below).
-- This is enforced here for every route (staff screens, the university review
-- dialog, RPCs) and the app asks application_profile_gate_status() so the
-- screens give the same answer.
--
-- Exceptions:
--   * Applications that already exist when this migration runs are grandfathered
--     (coursefinder_gate_exempt = true). New applications default to false.
--   * An admin can override the profile check for one application with a logged
--     reason (application_profile_gate_overrides, through
--     override_application_profile_gate()). The override does not cover the
--     sharing authorisation (see below), which non-exempt applications always need.
-- There is no service-role bypass: backend jobs moving incomplete applications on
-- are blocked too, unless the application is exempt or overridden.

-- Existing rows get true (grandfathered) without an UPDATE, so no triggers fire.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS coursefinder_gate_exempt boolean NOT NULL DEFAULT true;
ALTER TABLE public.applications
  ALTER COLUMN coursefinder_gate_exempt SET DEFAULT false;

COMMENT ON COLUMN public.applications.coursefinder_gate_exempt IS
  'True for applications that existed when the CourseFinder profile check went live. They can move on without a complete profile.';

CREATE TABLE IF NOT EXISTS public.application_profile_gate_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(btrim(reason)) >= 10),
  overridden_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_profile_gate_overrides_application_idx
  ON public.application_profile_gate_overrides (application_id);

COMMENT ON TABLE public.application_profile_gate_overrides IS
  'Audit log of admin overrides of the CourseFinder complete-profile check. Written only by override_application_profile_gate().';

ALTER TABLE public.application_profile_gate_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and staff can read profile gate overrides" ON public.application_profile_gate_overrides;
CREATE POLICY "Admins and staff can read profile gate overrides"
  ON public.application_profile_gate_overrides
  FOR SELECT
  USING (public.is_admin_or_staff(auth.uid()));
-- No insert, update or delete policies: rows are added by the function below only.

-- Every missing CourseFinder item for a student (empty when complete).
-- Mirrors getCourseFinderSubmissionBlockers() in src/lib/coursefinderProfile.ts.
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

  -- Match the explicit awarding body/qualification, never the country.
  -- NECO/NABTEB and generic SSCE/GCE are not proof of a WAEC award.
  waec := lower(concat_ws(' ', s ->> 'secondary_board', s ->> 'secondary_qualification')) ~ '\m(waec|wassce|west african examinations? council)\M';
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

-- Sharing authorisation. Before an application moves into a gated status the
-- student must have authorised, in their own account, sharing their details
-- with KC Overseas Education (India) and the universities they apply to.
-- Append-only log: rows are added only by record_sharing_authorisation() when
-- auth.uid() is the student's own user, so staff, agents, universities and the
-- service role cannot record it for a student. A withdrawal (by email) is
-- recorded by staff or admins as withdrawn_at; nothing else can change and rows
-- cannot be deleted, except by the cascade when the student row itself is
-- hard-deleted (erasure). The admin profile override does NOT bypass this.
-- Grandfathered (exempt) applications are not blocked; the app prompts those
-- students to give it.
CREATE TABLE IF NOT EXISTS public.application_sharing_authorisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  authorised_by uuid NOT NULL,
  wording_version text NOT NULL,
  authorised_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  withdrawn_by uuid
);

CREATE INDEX IF NOT EXISTS application_sharing_authorisations_student_idx
  ON public.application_sharing_authorisations (student_id);

COMMENT ON TABLE public.application_sharing_authorisations IS
  'Append-only log of students authorising UniDoxia to share their application details with KC Overseas Education (India) and their chosen universities. Written only by record_sharing_authorisation() for the signed-in student.';

ALTER TABLE public.application_sharing_authorisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read their own sharing authorisations" ON public.application_sharing_authorisations;
CREATE POLICY "Students can read their own sharing authorisations"
  ON public.application_sharing_authorisations
  FOR SELECT
  USING (authorised_by = auth.uid());
-- No insert, update or delete policies. Staff and agents see only whether it
-- has been given, through application_profile_gate_status().

-- Guards that also apply to the service role (which bypasses RLS).
CREATE OR REPLACE FUNCTION public.guard_application_sharing_authorisations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NEW.authorised_by IS DISTINCT FROM auth.uid() OR NOT EXISTS (
      SELECT 1 FROM public.students st WHERE st.id = NEW.student_id AND st.profile_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only the student can give this authorisation, from their own account.' USING ERRCODE = '42501';
    END IF;
    NEW.authorised_at := now();
    NEW.withdrawn_at := NULL;
    NEW.withdrawn_by := NULL;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.withdrawn_at IS NULL AND NEW.withdrawn_at IS NOT NULL
       AND (NEW.id, NEW.student_id, NEW.authorised_by, NEW.wording_version, NEW.authorised_at)
           IS NOT DISTINCT FROM (OLD.id, OLD.student_id, OLD.authorised_by, OLD.wording_version, OLD.authorised_at) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Sharing authorisations cannot be changed, only withdrawn.' USING ERRCODE = '42501';
  END IF;
  -- Erasure: when the student row itself is hard-deleted, the cascade may remove
  -- their log rows. Any other delete is refused.
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = OLD.student_id) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Sharing authorisations cannot be deleted.' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS guard_application_sharing_authorisations ON public.application_sharing_authorisations;
CREATE TRIGGER guard_application_sharing_authorisations
  BEFORE INSERT OR UPDATE OR DELETE ON public.application_sharing_authorisations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_application_sharing_authorisations();

-- Neither log may be wiped in one go.
CREATE OR REPLACE FUNCTION public.refuse_log_truncate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION '% is a log and cannot be truncated.', TG_TABLE_NAME USING ERRCODE = '42501';
END;
$$;

-- Explicit access for both new tables, as other migrations do for new tables
-- (the project does not rely on default privileges). Signed-in users may only
-- read, and RLS decides which rows. Writes go through the SECURITY DEFINER
-- functions in this migration. The service role gets what it needs to read,
-- export and maintain the rows, still subject to the guard triggers, but never
-- TRUNCATE.
REVOKE ALL ON public.application_sharing_authorisations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.application_profile_gate_overrides FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.application_sharing_authorisations TO authenticated;
GRANT SELECT ON public.application_profile_gate_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_sharing_authorisations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_profile_gate_overrides TO service_role;
REVOKE TRUNCATE ON public.application_sharing_authorisations FROM PUBLIC, anon, authenticated, service_role;
REVOKE TRUNCATE ON public.application_profile_gate_overrides FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS refuse_truncate ON public.application_sharing_authorisations;
CREATE TRIGGER refuse_truncate
  BEFORE TRUNCATE ON public.application_sharing_authorisations
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refuse_log_truncate();

DROP TRIGGER IF EXISTS refuse_truncate ON public.application_profile_gate_overrides;
CREATE TRIGGER refuse_truncate
  BEFORE TRUNCATE ON public.application_profile_gate_overrides
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refuse_log_truncate();

-- Whether a student has a current (not withdrawn) authorisation.
CREATE OR REPLACE FUNCTION public.has_sharing_authorisation(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.application_sharing_authorisations sa
    WHERE sa.student_id = p_student_id AND sa.withdrawn_at IS NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_sharing_authorisation(uuid) FROM PUBLIC, anon, authenticated;

-- The signed-in student records their own authorisation. There is no student
-- ID argument: it is always the caller's own student record. Must match
-- SHARING_AUTHORISATION_VERSION in src/lib/sharingAuthorisation.ts.
CREATE OR REPLACE FUNCTION public.record_sharing_authorisation(p_wording_version text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_version constant text := 'kc-share-v1-2026-10-23';
  caller uuid := auth.uid();
  own_student uuid;
  row_id uuid;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Only the student can give this authorisation, from their own account.' USING ERRCODE = '42501';
  END IF;
  SELECT st.id INTO own_student FROM public.students st WHERE st.profile_id = caller ORDER BY st.created_at LIMIT 1;
  IF own_student IS NULL THEN
    RAISE EXCEPTION 'Only the student can give this authorisation, from their own account.' USING ERRCODE = '42501';
  END IF;
  IF p_wording_version IS DISTINCT FROM current_version THEN
    RAISE EXCEPTION 'This authorisation wording is out of date. Please reload the page.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT sa.id INTO row_id FROM public.application_sharing_authorisations sa
  WHERE sa.student_id = own_student AND sa.withdrawn_at IS NULL AND sa.wording_version = current_version
  ORDER BY sa.authorised_at DESC LIMIT 1;
  IF row_id IS NOT NULL THEN
    RETURN row_id;
  END IF;
  INSERT INTO public.application_sharing_authorisations (student_id, authorised_by, wording_version)
  VALUES (own_student, caller, current_version)
  RETURNING id INTO row_id;
  RETURN row_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_sharing_authorisation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_sharing_authorisation(text) TO authenticated;

-- Staff or admins record a withdrawal the student asked for by email.
CREATE OR REPLACE FUNCTION public.withdraw_sharing_authorisation(p_student_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can record a withdrawal.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.application_sharing_authorisations
  SET withdrawn_at = now(), withdrawn_by = auth.uid()
  WHERE student_id = p_student_id AND withdrawn_at IS NULL;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.withdraw_sharing_authorisation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_sharing_authorisation(uuid) TO authenticated;

-- What the app shows before a status change. Students and universities get the
-- count only; admins and staff also get the list of missing items. Everyone
-- allowed to ask sees only whether the sharing authorisation has been given.
CREATE OR REPLACE FUNCTION public.application_profile_gate_status(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app record;
  missing text[];
  overridden boolean;
  result jsonb;
  caller uuid := auth.uid();
BEGIN
  SELECT a.id, a.student_id, a.agent_id, a.program_id, a.coursefinder_gate_exempt INTO app
  FROM public.applications a WHERE a.id = p_application_id;
  -- Only the student, admins and staff, or the agent or university linked to
  -- the application may ask. Others get the same answer as a missing row.
  IF NOT FOUND OR caller IS NULL OR NOT (
    public.is_admin_or_staff(caller)
    OR EXISTS (SELECT 1 FROM public.students st WHERE st.id = app.student_id AND st.profile_id = caller)
    OR EXISTS (SELECT 1 FROM public.agents ag WHERE ag.id = app.agent_id AND ag.profile_id = caller)
    OR EXISTS (
      SELECT 1 FROM public.programs pr
      WHERE pr.id = app.program_id
        AND pr.university_id = public.get_university_id_for_user(caller)
    )
  ) THEN
    RAISE EXCEPTION 'Application not found.' USING ERRCODE = 'no_data_found';
  END IF;
  overridden := EXISTS (SELECT 1 FROM public.application_profile_gate_overrides o WHERE o.application_id = app.id);
  missing := public.coursefinder_profile_missing(app.student_id);
  result := jsonb_build_object(
    'exempt', app.coursefinder_gate_exempt,
    'overridden', overridden,
    'missing_count', COALESCE(cardinality(missing), 0),
    'sharing_authorised', public.has_sharing_authorisation(app.student_id)
  );
  IF public.is_admin_or_staff(auth.uid()) THEN
    result := result || jsonb_build_object('missing', to_jsonb(missing));
  END IF;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.application_profile_gate_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.application_profile_gate_status(uuid) TO authenticated;

-- Admin override with a required reason, logged against the application.
CREATE OR REPLACE FUNCTION public.override_application_profile_gate(p_application_id uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can override the profile check.' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Please give a reason of at least 10 characters.' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.applications a WHERE a.id = p_application_id) THEN
    RAISE EXCEPTION 'Application not found.' USING ERRCODE = 'no_data_found';
  END IF;
  INSERT INTO public.application_profile_gate_overrides (application_id, reason, overridden_by)
  VALUES (p_application_id, btrim(p_reason), auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.override_application_profile_gate(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.override_application_profile_gate(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_application_profile_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_status text := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::text END;
  new_status text := NEW.status::text;
  -- Must match COURSEFINDER_SUBMISSION_STATUSES in src/lib/coursefinderProfile.ts.
  gated_statuses constant text[] := ARRAY['screening', 'conditional_offer', 'unconditional_offer', 'cas_loa', 'visa', 'enrolled'];
  missing text[];
  status_changed boolean := TG_OP = 'INSERT' OR old_status IS DISTINCT FROM NEW.status::text;
  enters_gate boolean;
  needs_authorisation boolean;
BEGIN
  -- The exempt flag is not the app's to set: new rows from signed-in users are
  -- never exempt, and only the service role or a direct session can change it.
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
      NEW.coursefinder_gate_exempt := false;
    END IF;
  ELSIF NEW.coursefinder_gate_exempt IS DISTINCT FROM OLD.coursefinder_gate_exempt
        AND NOT (COALESCE(auth.role(), '') = 'service_role' OR auth.uid() IS NULL) THEN
    NEW.coursefinder_gate_exempt := OLD.coursefinder_gate_exempt;
  END IF;

  IF NEW.coursefinder_gate_exempt IS TRUE OR NOT status_changed OR new_status IS NULL THEN
    RETURN NEW;
  END IF;

  -- The profile check applies only to moves INTO a gated status from outside it.
  enters_gate := new_status = ANY (gated_statuses)
    AND (old_status IS NULL OR NOT (old_status = ANY (gated_statuses)));

  -- The sharing authorisation is needed for every move into or between gated
  -- statuses (so a withdrawal stops further moves), and for submitting an
  -- existing application (for example draft to submitted). A new application
  -- created as submitted by staff or an agent for the student is allowed; the
  -- student is then prompted, and it cannot reach screening without it.
  needs_authorisation := new_status = ANY (gated_statuses)
    OR (new_status = 'submitted' AND (
      TG_OP = 'UPDATE'
      OR EXISTS (SELECT 1 FROM public.students st WHERE st.id = NEW.student_id AND st.profile_id = auth.uid())
    ));

  -- Checked before the admin override, which must not bypass it.
  IF needs_authorisation AND NOT public.has_sharing_authorisation(NEW.student_id) THEN
    RAISE EXCEPTION 'Sharing authorisation not given. The student must authorise sharing with KC Overseas in their own UniDoxia account first.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT enters_gate THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND EXISTS (
    SELECT 1 FROM public.application_profile_gate_overrides o WHERE o.application_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  missing := public.coursefinder_profile_missing(NEW.student_id);
  IF COALESCE(cardinality(missing), 0) > 0 THEN
    RAISE EXCEPTION 'Profile not complete for CourseFinder: % items missing. Please complete the student profile first.', cardinality(missing)
      USING ERRCODE = 'check_violation', DETAIL = array_to_string(missing, ', ');
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_application_profile_gate() IS
  'Blocks moving an application into a sent-on status (screening, offers, CAS or LOA, visa, enrolled) from any other status until the student has given their sharing authorisation and their profile is complete for CourseFinder. Moves between sent-on statuses, and submitting an existing application, also need a current authorisation. Grandfathered applications are not checked; an admin override covers the profile only, never the authorisation.';

DROP TRIGGER IF EXISTS enforce_application_profile_gate ON public.applications;
CREATE TRIGGER enforce_application_profile_gate
  BEFORE INSERT OR UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_application_profile_gate();

-- Trigger functions are never called directly. Triggers still fire for every
-- role without EXECUTE, so nobody needs it.
REVOKE EXECUTE ON FUNCTION public.enforce_application_profile_gate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_application_sharing_authorisations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refuse_log_truncate() FROM PUBLIC, anon, authenticated;

-- 5. Rollback (not run). To undo this migration, run the following by hand.
-- Note: this deletes any answers students have saved in these columns, and the
-- log of profile check overrides and the log of sharing authorisations.
-- Before rolling back, export public.application_sharing_authorisations (for
-- example COPY ... TO a CSV kept securely). Rollback deletes it, and it is the
-- only record of each student's consent to sharing with KC Overseas.
-- Re-applying after a rollback: every student who signed up after launch becomes
-- an existing (legacy) student again (coursefinder_fields_required = false), and
-- every application created after launch becomes grandfathered
-- (coursefinder_gate_exempt = true). Fix those flags by hand if you re-apply.
--
-- Dropping the two tables also removes the grants above, so there is nothing
-- extra to revoke. The function grants go with the functions.
--
-- DROP TRIGGER IF EXISTS enforce_application_profile_gate ON public.applications;
-- DROP FUNCTION IF EXISTS public.enforce_application_profile_gate();
-- DROP FUNCTION IF EXISTS public.override_application_profile_gate(uuid, text);
-- DROP FUNCTION IF EXISTS public.withdraw_sharing_authorisation(uuid);
-- DROP FUNCTION IF EXISTS public.record_sharing_authorisation(text);
-- DROP FUNCTION IF EXISTS public.application_profile_gate_status(uuid);
-- DROP FUNCTION IF EXISTS public.coursefinder_profile_missing(uuid);
-- DROP TABLE IF EXISTS public.application_profile_gate_overrides;
-- DROP TABLE IF EXISTS public.application_sharing_authorisations;
-- DROP FUNCTION IF EXISTS public.has_sharing_authorisation(uuid);
-- DROP FUNCTION IF EXISTS public.guard_application_sharing_authorisations();
-- DROP FUNCTION IF EXISTS public.refuse_log_truncate();
-- ALTER TABLE public.applications DROP COLUMN IF EXISTS coursefinder_gate_exempt;
-- DROP TRIGGER IF EXISTS enforce_coursefinder_required_fields ON public.students;
-- DROP FUNCTION IF EXISTS public.enforce_coursefinder_required_fields();
-- DROP TRIGGER IF EXISTS enforce_coursefinder_education_record ON public.education_records;
-- DROP FUNCTION IF EXISTS public.enforce_coursefinder_education_record();
-- ALTER TABLE public.students
--   DROP CONSTRAINT IF EXISTS students_dependants_travelling_range,
--   DROP CONSTRAINT IF EXISTS students_visa_refusal_year_range,
--   DROP CONSTRAINT IF EXISTS students_visa_refusal_type_list,
--   DROP CONSTRAINT IF EXISTS students_visa_refusal_reason_list,
--   DROP COLUMN IF EXISTS dependants_travelling,
--   DROP COLUMN IF EXISTS other_citizenship,
--   DROP COLUMN IF EXISTS visa_refusal_country,
--   DROP COLUMN IF EXISTS visa_refusal_year,
--   DROP COLUMN IF EXISTS visa_refusal_type,
--   DROP COLUMN IF EXISTS visa_refusal_reason,
--   DROP COLUMN IF EXISTS secondary_final_grade,
--   DROP COLUMN IF EXISTS no_gap_since_study,
--   DROP COLUMN IF EXISTS coursefinder_fields_required;
-- ALTER TABLE public.education_records DROP COLUMN IF EXISTS final_grade;
