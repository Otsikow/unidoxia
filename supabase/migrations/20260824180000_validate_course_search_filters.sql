-- Validate every public course-search parameter on the server before catalogue
-- queries run. The JSON response is stable for the web UI and other clients.
CREATE OR REPLACE FUNCTION public.validate_course_search_filters(p_filters JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  errors JSONB := '{}'::jsonb;
  item RECORD;
  key_name TEXT;
  allowed_keys CONSTANT TEXT[] := ARRAY[
    'q','query','university','country','level','discipline','tuitionMax','depositMax',
    'noApplicationFee','englishAlternative','scholarshipOnly','intake','sort','page'
  ];
  boolean_keys CONSTANT TEXT[] := ARRAY['noApplicationFee','englishAlternative','scholarshipOnly'];
  numeric_keys CONSTANT TEXT[] := ARRAY['tuitionMax','depositMax'];
BEGIN
  IF p_filters IS NULL OR jsonb_typeof(p_filters) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_FILTERS',
      'message', 'Some selected filters are invalid or conflicting.',
      'fields', jsonb_build_object('filters', 'Filters must be supplied as an object.'));
  END IF;

  FOR item IN SELECT key, value FROM jsonb_each(p_filters) LOOP
    IF NOT (item.key = ANY(allowed_keys)) THEN
      errors := errors || jsonb_build_object(item.key, 'This filter is not supported.');
    END IF;
  END LOOP;

  FOREACH key_name IN ARRAY numeric_keys LOOP
    IF p_filters ? key_name AND nullif(p_filters->>key_name, '') IS NOT NULL THEN
      BEGIN
        IF (p_filters->>key_name)::numeric < 0 THEN
          errors := errors || jsonb_build_object(key_name, 'Value cannot be negative.');
        END IF;
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        errors := errors || jsonb_build_object(key_name, 'Value must be a valid number.');
      END;
    END IF;
  END LOOP;

  FOREACH key_name IN ARRAY boolean_keys LOOP
    IF p_filters ? key_name AND jsonb_typeof(p_filters->key_name) <> 'boolean' THEN
      errors := errors || jsonb_build_object(key_name, 'Value must be true or false.');
    END IF;
  END LOOP;

  IF coalesce(p_filters->>'country', 'all') <> 'all' AND NOT EXISTS (
    SELECT 1 FROM public.universities u WHERE u.active AND lower(u.country) = lower(p_filters->>'country')
  ) THEN errors := errors || jsonb_build_object('country', 'Select a supported destination country.'); END IF;

  IF coalesce(p_filters->>'level', 'all') <> 'all' AND NOT EXISTS (
    SELECT 1 FROM public.programs p WHERE p.active AND lower(p.level) = lower(p_filters->>'level')
  ) THEN errors := errors || jsonb_build_object('level', 'Select a supported study level.'); END IF;

  IF coalesce(p_filters->>'university', 'all') <> 'all' AND NOT EXISTS (
    SELECT 1 FROM public.universities u WHERE u.active AND u.id::text = p_filters->>'university'
  ) THEN errors := errors || jsonb_build_object('university', 'Select a valid university.'); END IF;

  IF coalesce(p_filters->>'intake', 'all') <> 'all' AND (p_filters->>'intake') !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' THEN
    errors := errors || jsonb_build_object('intake', 'Select a valid intake month.');
  END IF;
  IF coalesce(p_filters->>'sort', 'recommended') NOT IN ('recommended','tuition','deposit','scholarship','intake') THEN
    errors := errors || jsonb_build_object('sort', 'Select a supported sorting option.');
  END IF;

  IF errors <> '{}'::jsonb THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_FILTERS',
      'message', 'Some selected filters are invalid or conflicting.', 'fields', errors);
  END IF;
  RETURN jsonb_build_object('success', true, 'fields', '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_course_search_filters(JSONB) TO anon, authenticated;
