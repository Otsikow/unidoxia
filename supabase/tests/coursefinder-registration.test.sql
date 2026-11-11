-- Exercise the actual migration's function, including restricted access.
DO $$
DECLARE
  qualification_case record;
  student_id uuid := gen_random_uuid();
  missing text[];
  cases integer := 0;
BEGIN
  IF has_function_privilege('anon', 'public.coursefinder_profile_missing(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.coursefinder_profile_missing(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'The internal CourseFinder function must not be callable by students or anonymous visitors';
  END IF;

  INSERT INTO public.students (id) VALUES (student_id);
  FOR qualification_case IN
    SELECT * FROM (VALUES
      ('Ghana', 'Cambridge', 'GCE A Levels', false),
      ('Ghana', 'International Baccalaureate', 'IB Diploma', false),
      ('Nigeria', 'NECO', 'SSCE', false),
      ('Nigeria', 'NABTEB', 'National Business Certificate', false),
      ('The Gambia', 'Cambridge', 'IGCSE', false),
      ('Ghana', 'WAEC', 'WASSCE', true),
      ('Ghana', 'WAEC', 'BECE', true),
      ('United Kingdom', 'West African Examinations Council', 'GCE', true),
      ('United Kingdom', 'Secondary school', 'WASSCE', true)
    ) AS data(country, board, qualification, requires_card)
  LOOP
    UPDATE public.students SET
      country_of_education = qualification_case.country,
      secondary_school_country = qualification_case.country,
      secondary_board = qualification_case.board,
      secondary_qualification = qualification_case.qualification
    WHERE id = student_id;

    missing := public.coursefinder_profile_missing(student_id);
    IF ('waec_scratch_card_pin' = ANY(missing)) <> qualification_case.requires_card
       OR ('waec_scratch_card_serial' = ANY(missing)) <> qualification_case.requires_card
       OR NOT ('emergency_contact_email' = ANY(missing)) THEN
      RAISE EXCEPTION 'Wrong required fields for % / % / %', qualification_case.country, qualification_case.board, qualification_case.qualification;
    END IF;
    cases := cases + 1;
  END LOOP;

  UPDATE public.students SET waec_scratch_card_pin = 'TEST-PIN', waec_scratch_card_serial = 'TEST-SERIAL'
  WHERE id = student_id;
  missing := public.coursefinder_profile_missing(student_id);
  IF missing && ARRAY['waec_scratch_card_pin', 'waec_scratch_card_serial'] THEN
    RAISE EXCEPTION 'Saved credentials should satisfy the WAEC requirement';
  END IF;
  RAISE NOTICE 'PASS: % qualification cases, saved WAEC credentials, and restricted function access', cases;
END;
$$;
