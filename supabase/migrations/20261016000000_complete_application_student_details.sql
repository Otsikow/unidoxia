-- Required in the application form, nullable for existing student records.
BEGIN;
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS mailing_postcode text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS permanent_postcode text,
  ADD COLUMN IF NOT EXISTS same_as_mailing_address boolean,
  ADD COLUMN IF NOT EXISTS other_citizenship text,
  ADD COLUMN IF NOT EXISTS other_citizenship_country text,
  ADD COLUMN IF NOT EXISTS previous_study_abroad text,
  ADD COLUMN IF NOT EXISTS previous_study_abroad_details text,
  ADD COLUMN IF NOT EXISTS previous_residence_abroad text,
  ADD COLUMN IF NOT EXISTS previous_residence_abroad_details text,
  ADD COLUMN IF NOT EXISTS visa_refusals text,
  ADD COLUMN IF NOT EXISTS visa_refusals_details text,
  ADD COLUMN IF NOT EXISTS city_of_birth text,
  ADD COLUMN IF NOT EXISTS country_of_birth text,
  ADD COLUMN IF NOT EXISTS passport_issue_date date,
  ADD COLUMN IF NOT EXISTS passport_place_of_issue text,
  ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.education_records
  ADD COLUMN IF NOT EXISTS board text,
  ADD COLUMN IF NOT EXISTS language_of_instruction text,
  ADD COLUMN IF NOT EXISTS grades text;

-- Save particulars atomically, including for students managed by linked agents.
CREATE OR REPLACE FUNCTION public.save_application_student_details(p_student_id uuid, p_details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_personal jsonb := p_details->'personalInfo';
  v_emergency jsonb := p_details->'emergencyContact';
  v_record jsonb;
  v_education_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF NOT (
    public.is_admin_or_staff(v_user_id)
    OR EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id AND profile_id = v_user_id)
    OR EXISTS (
      SELECT 1 FROM public.agent_student_links asl
      JOIN public.agents ag ON ag.id = asl.agent_id
      WHERE asl.student_id = p_student_id AND ag.profile_id = v_user_id
        AND COALESCE(asl.status, 'active') = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.students SET
    legal_name = v_personal->>'fullName',
    contact_email = v_personal->>'email',
    contact_phone = v_personal->>'phone',
    whatsapp_number = v_personal->>'whatsappNumber',
    date_of_birth = NULLIF(v_personal->>'dateOfBirth', '')::date,
    nationality = v_personal->>'nationality',
    passport_number = NULLIF(v_personal->>'passportNumber', ''),
    current_country = v_personal->>'currentCountry',
    address = COALESCE(address, '{}'::jsonb) || jsonb_build_object(
      'home_address', v_personal->>'homeAddress',
      'street', v_personal->>'homeAddress',
      'phone', v_personal->>'phone',
      'correspondent_address', v_personal->>'correspondentAddress',
      'whatsapp', v_personal->>'whatsappNumber'
    ),
    emergency_contact_name = v_emergency->>'fullName',
    emergency_contact_relationship = v_emergency->>'relationship',
    emergency_contact_phone = v_emergency->>'phone',
    emergency_contact_email = v_emergency->>'email',
    emergency_contact_country = v_emergency->>'country',
    marital_status = v_personal->>'maritalStatus',
    mailing_postcode = v_personal->>'mailingPostcode',
    permanent_address = CASE WHEN (v_personal->>'sameAsMailingAddress')::boolean THEN v_personal->>'correspondentAddress' ELSE v_personal->>'permanentAddress' END,
    permanent_postcode = CASE WHEN (v_personal->>'sameAsMailingAddress')::boolean THEN v_personal->>'mailingPostcode' ELSE v_personal->>'permanentPostcode' END,
    same_as_mailing_address = (v_personal->>'sameAsMailingAddress')::boolean,
    other_citizenship = v_personal->>'otherCitizenship',
    other_citizenship_country = CASE WHEN v_personal->>'otherCitizenship' = 'yes' THEN v_personal->>'otherCitizenshipCountry' ELSE NULL END,
    previous_study_abroad = v_personal->>'previousStudyAbroad',
    previous_study_abroad_details = CASE WHEN v_personal->>'previousStudyAbroad' = 'yes' THEN v_personal->>'previousStudyAbroadDetails' ELSE NULL END,
    previous_residence_abroad = v_personal->>'previousResidenceAbroad',
    previous_residence_abroad_details = CASE WHEN v_personal->>'previousResidenceAbroad' = 'yes' THEN v_personal->>'previousResidenceAbroadDetails' ELSE NULL END,
    visa_refusals = v_personal->>'visaRefusals',
    visa_refusals_details = CASE WHEN v_personal->>'visaRefusals' = 'yes' THEN v_personal->>'visaRefusalsDetails' ELSE NULL END,
    city_of_birth = v_personal->>'cityOfBirth',
    country_of_birth = v_personal->>'countryOfBirth',
    passport_issue_date = NULLIF(v_personal->>'passportIssueDate', '')::date,
    passport_place_of_issue = v_personal->>'passportPlaceOfIssue',
    gender = v_personal->>'gender',
    updated_at = now()
  WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  UPDATE public.profiles SET full_name = v_personal->>'fullName', updated_at = now()
  WHERE id = (SELECT profile_id FROM public.students WHERE id = p_student_id);

  FOR v_record IN SELECT value FROM jsonb_array_elements(p_details->'educationHistory') LOOP
    IF (v_record->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      v_education_id := (v_record->>'id')::uuid;
    ELSE
      v_education_id := gen_random_uuid();
    END IF;
    IF EXISTS (SELECT 1 FROM public.education_records WHERE id = v_education_id AND student_id <> p_student_id) THEN
      RAISE EXCEPTION 'Education record belongs to another student' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.education_records (
      id, student_id, level, institution_name, country, start_date, end_date,
      gpa, grade_scale, grades, board, language_of_instruction
    ) VALUES (
      v_education_id, p_student_id, v_record->>'level', v_record->>'institutionName',
      v_record->>'country', (v_record->>'startDate')::date, (v_record->>'endDate')::date,
      CASE WHEN v_record->>'gpa' ~ '^[0-9]+(\.[0-9]+)?$' THEN (v_record->>'gpa')::numeric ELSE NULL END,
      v_record->>'gradeScale', v_record->>'gpa', NULLIF(v_record->>'board', ''), v_record->>'languageOfInstruction'
    ) ON CONFLICT (id) DO UPDATE SET
      level = EXCLUDED.level, institution_name = EXCLUDED.institution_name,
      country = EXCLUDED.country, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
      gpa = EXCLUDED.gpa, grade_scale = EXCLUDED.grade_scale, grades = EXCLUDED.grades,
      board = EXCLUDED.board, language_of_instruction = EXCLUDED.language_of_instruction,
      updated_at = now()
    WHERE education_records.student_id = p_student_id;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.save_application_student_details(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_application_student_details(uuid, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
