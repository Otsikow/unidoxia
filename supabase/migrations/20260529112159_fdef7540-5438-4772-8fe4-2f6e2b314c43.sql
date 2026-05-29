
CREATE OR REPLACE FUNCTION public.check_signup_availability(
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := NULLIF(lower(btrim(coalesce(p_email, ''))), '');
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email_taken boolean := false;
  v_phone_taken boolean := false;
BEGIN
  IF v_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE lower(email) = v_email
    ) INTO v_email_taken;

    IF NOT v_email_taken THEN
      SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE lower(email) = v_email
      ) INTO v_email_taken;
    END IF;
  END IF;

  IF v_phone IS NOT NULL AND length(v_phone) >= 7 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g') = v_phone
    ) INTO v_phone_taken;
  END IF;

  RETURN jsonb_build_object(
    'email_taken', v_email_taken,
    'phone_taken', v_phone_taken
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_signup_availability(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_signup_availability(text, text) TO anon, authenticated, service_role;
