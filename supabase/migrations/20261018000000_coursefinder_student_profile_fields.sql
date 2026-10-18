-- Add the fields required by the CourseFinder application form without
-- removing any existing student data.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS citizenship text,
  ADD COLUMN IF NOT EXISTS city_of_birth text,
  ADD COLUMN IF NOT EXISTS country_of_birth text,
  ADD COLUMN IF NOT EXISTS passport_issue_date date,
  ADD COLUMN IF NOT EXISTS passport_issue_country text,
  ADD COLUMN IF NOT EXISTS permanent_address_line_1 text,
  ADD COLUMN IF NOT EXISTS permanent_country text,
  ADD COLUMN IF NOT EXISTS permanent_state_region text,
  ADD COLUMN IF NOT EXISTS permanent_city text,
  ADD COLUMN IF NOT EXISTS permanent_postal_code text,
  ADD COLUMN IF NOT EXISTS permanent_same_as_mailing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_other_citizenship boolean,
  ADD COLUMN IF NOT EXISTS lived_or_studied_abroad boolean,
  ADD COLUMN IF NOT EXISTS previous_immigration_applications boolean,
  ADD COLUMN IF NOT EXISTS has_visa_refusals boolean,
  ADD COLUMN IF NOT EXISTS country_of_education text,
  ADD COLUMN IF NOT EXISTS highest_education_level text,
  ADD COLUMN IF NOT EXISTS secondary_board text,
  ADD COLUMN IF NOT EXISTS secondary_qualification text,
  ADD COLUMN IF NOT EXISTS secondary_school_name text,
  ADD COLUMN IF NOT EXISTS secondary_school_country text,
  ADD COLUMN IF NOT EXISTS secondary_school_state text,
  ADD COLUMN IF NOT EXISTS secondary_school_city text,
  ADD COLUMN IF NOT EXISTS secondary_start_month integer,
  ADD COLUMN IF NOT EXISTS secondary_start_year integer,
  ADD COLUMN IF NOT EXISTS secondary_end_month integer,
  ADD COLUMN IF NOT EXISTS secondary_end_year integer,
  ADD COLUMN IF NOT EXISTS secondary_language_of_instruction text,
  ADD COLUMN IF NOT EXISTS secondary_grades_band text,
  ADD COLUMN IF NOT EXISTS waec_scratch_card_pin text,
  ADD COLUMN IF NOT EXISTS waec_scratch_card_serial text,
  ADD COLUMN IF NOT EXISTS work_experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_university text;

ALTER TABLE public.education_records
  ADD COLUMN IF NOT EXISTS state_region text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS degree_title text,
  ADD COLUMN IF NOT EXISTS language_of_instruction text;

COMMENT ON COLUMN public.students.preferred_name IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.current_country IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.preferred_study_area IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.preferred_country IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.address_line_2 IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.address IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.education_history IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.test_scores IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.guardian IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.visa_history_json IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.finances_json IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.referral_source IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.whatsapp_number IS 'DEPRECATED: not used by CourseFinder form';
COMMENT ON COLUMN public.students.emergency_contact_country IS 'DEPRECATED: not used by CourseFinder form';

-- Store the student registration fields supplied to Supabase Auth. The existing
-- user-creation trigger creates the student row first, and PostgreSQL runs
-- same-event triggers alphabetically.
CREATE OR REPLACE FUNCTION public.sync_coursefinder_registration_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student' THEN
    UPDATE public.students
    SET first_name = COALESCE(
          NULLIF(btrim(NEW.raw_user_meta_data->>'first_name'), ''),
          NULLIF(split_part(btrim(NEW.raw_user_meta_data->>'full_name'), ' ', 1), '')
        ),
        middle_name = NULLIF(btrim(NEW.raw_user_meta_data->>'middle_name'), ''),
        last_name = COALESCE(
          NULLIF(btrim(NEW.raw_user_meta_data->>'last_name'), ''),
          NULLIF(btrim(regexp_replace(btrim(NEW.raw_user_meta_data->>'full_name'), '^\S+\s*', '')), '')
        ),
        legal_name = NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
        contact_email = NEW.email,
        contact_phone = NULLIF(btrim(NEW.raw_user_meta_data->>'phone'), '')
    WHERE profile_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS z_sync_coursefinder_registration_fields ON auth.users;
CREATE TRIGGER z_sync_coursefinder_registration_fields
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_coursefinder_registration_fields();

NOTIFY pgrst, 'reload schema';
