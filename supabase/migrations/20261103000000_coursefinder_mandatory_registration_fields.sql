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

-- 1. New columns ------------------------------------------------------------

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS dependants_travelling integer,
  ADD COLUMN IF NOT EXISTS other_citizenship text,
  ADD COLUMN IF NOT EXISTS visa_refusal_details text,
  ADD COLUMN IF NOT EXISTS secondary_final_grade text,
  ADD COLUMN IF NOT EXISTS no_gap_since_study boolean;

-- Existing rows get false (legacy, prompt only). New rows default to true.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS coursefinder_fields_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.students
  ALTER COLUMN coursefinder_fields_required SET DEFAULT true;

COMMENT ON COLUMN public.students.dependants_travelling IS 'CourseFinder: number of dependant children travelling with the student (0 or more).';
COMMENT ON COLUMN public.students.other_citizenship IS 'CourseFinder: which other citizenship(s) the student holds, required when has_other_citizenship is true.';
COMMENT ON COLUMN public.students.visa_refusal_details IS 'CourseFinder: details of previous visa refusals, required when has_visa_refusals is true.';
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
BEGIN
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

  -- Visa refusals: details required.
  IF NEW.has_visa_refusals IS TRUE
     AND COALESCE(btrim(NEW.visa_refusal_details), '') = ''
     AND (is_insert
          OR NEW.has_visa_refusals IS DISTINCT FROM OLD.has_visa_refusals
          OR NEW.visa_refusal_details IS DISTINCT FROM OLD.visa_refusal_details) THEN
    RAISE EXCEPTION 'Please give details of your previous visa refusal.' USING ERRCODE = 'check_violation';
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

  -- "No gap since last study" is allowed only if the last study ended in the past 6 months.
  IF NEW.no_gap_since_study IS TRUE
     AND (is_insert OR OLD.no_gap_since_study IS DISTINCT FROM TRUE) THEN
    IF NEW.secondary_end_year IS NOT NULL AND NEW.secondary_end_month BETWEEN 1 AND 12 THEN
      secondary_end := make_date(NEW.secondary_end_year, NEW.secondary_end_month, 1);
    END IF;
    SELECT max(er.end_date) INTO last_study_end
    FROM public.education_records er
    WHERE er.student_id = NEW.id AND er.level IS DISTINCT FROM 'high_school';
    last_study_end := GREATEST(last_study_end, secondary_end);
    IF last_study_end IS NULL OR last_study_end < (date_trunc('month', now()) - interval '6 months')::date THEN
      RAISE EXCEPTION 'You can only choose "no gap" if your last study ended in the past 6 months. Please add what you have done since.' USING ERRCODE = 'check_violation';
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
