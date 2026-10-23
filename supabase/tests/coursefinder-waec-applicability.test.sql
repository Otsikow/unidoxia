-- Run only in an isolated/local database containing the pending CourseFinder
-- function. Does not apply a migration, create students, or modify application data.
-- Exercises the actual function's WAEC predicate to catch frontend/server drift.
BEGIN;
DO $$
DECLARE
  definition text := pg_get_functiondef('public.coursefinder_profile_missing(uuid)'::regprocedure);
  predicate text;
  fixture record;
  actual boolean;
BEGIN
  predicate := substring(definition FROM 'waec := ([^;]+);');
  IF predicate IS NULL THEN RAISE EXCEPTION 'WAEC predicate not found'; END IF;
  FOR fixture IN SELECT * FROM (VALUES
    ('Ghana', 'Cambridge', 'A levels', false),
    ('Nigeria', 'IB', 'International Baccalaureate', false),
    ('Nigeria', 'NECO', 'SSCE', false),
    ('Nigeria', 'NECO', 'BECE', false),
    ('Nigeria', 'NABTEB', 'NTC', false),
    ('Kenya', 'KNEC', 'KCSE', false),
    ('UK', 'AQA', 'GCE', false),
    ('Ghana', 'Cambridge', 'IGCSE', false),
    ('Ghana', 'WAEC', 'WASSCE', true),
    ('UK', 'WAEC', 'GCE', true),
    ('Ghana', 'WAEC', 'BECE', true),
    ('India', 'West African Examinations Council', 'SSCE', true),
    ('India', '', 'WASSCE', true),
    ('Ghana', '', '', false)
  ) AS cases(country, board, qualification, expected) LOOP
    EXECUTE 'SELECT ' || predicate || ' FROM (SELECT $1::jsonb AS s) fixture'
      INTO actual
      USING jsonb_build_object('country_of_education', fixture.country,
        'secondary_school_country', fixture.country, 'secondary_board', fixture.board,
        'secondary_qualification', fixture.qualification);
    IF actual IS DISTINCT FROM fixture.expected THEN
      RAISE EXCEPTION 'Wrong WAEC applicability for % / % / %: got %, expected %',
        fixture.country, fixture.board, fixture.qualification, actual, fixture.expected;
    END IF;
  END LOOP;
END;
$$;
ROLLBACK;
