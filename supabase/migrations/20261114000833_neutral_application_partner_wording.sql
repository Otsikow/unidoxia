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
  IF p_wording_version IS NULL OR p_wording_version NOT IN ('kc-share-v1-2026-10-23', 'partner-share-v2-2026-11-11', 'partner-share-v3-2026-11-14') THEN
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
    RAISE EXCEPTION 'Sharing authorisation not given. The student must give sharing authorisation in their own UniDoxia account first.'
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
    RAISE EXCEPTION 'Student profile incomplete: % items missing. Please complete the student profile first.', cardinality(missing)
      USING ERRCODE = 'check_violation', DETAIL = array_to_string(missing, ', ');
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_application_profile_gate() IS
  'Blocks moving an application into a sent-on status (screening, offers, CAS or LOA, visa, enrolled) from any other status until the student has given their sharing authorisation and their profile is complete. Moves between sent-on statuses, and submitting an existing application, also need a current authorisation. Grandfathered applications are not checked; an admin override covers the profile only, never the authorisation.';

REVOKE EXECUTE ON FUNCTION public.enforce_application_profile_gate() FROM PUBLIC, anon, authenticated;
