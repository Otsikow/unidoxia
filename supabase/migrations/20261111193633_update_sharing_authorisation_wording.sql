-- Preserve prior authorisation records while recording the new wording separately.
CREATE OR REPLACE FUNCTION public.record_sharing_authorisation(p_wording_version text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_version text := p_wording_version;
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
  IF p_wording_version IS NULL OR p_wording_version NOT IN ('kc-share-v1-2026-10-23', 'partner-share-v3-2026-11-11') THEN
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
