-- Improved duplicate detection for student signups and admin tools
-- This migration creates functions to find potential duplicate student accounts

-- Drop existing function if it exists (to allow modifications)
DROP FUNCTION IF EXISTS public.check_signup_availability(text, text);

-- Improved signup availability check with better normalisation
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
  v_email text;
  v_normalised_email text;
  v_phone text;
  v_email_taken boolean := false;
  v_phone_taken boolean := false;
BEGIN
  -- Normalise email: trim, lowercase, remove dots before @ (Gmail treats them as identical)
  -- Also handle plus-addressing (e.g., user+tag@example.com becomes user@example.com)
  IF p_email IS NOT NULL AND btrim(p_email) <> '' THEN
    v_email := lower(btrim(p_email));
    
    -- Extract local part and domain
    IF position('@' in v_email) > 0 THEN
      DECLARE
        v_local text := split_part(v_email, '@', 1);
        v_domain text := substring(v_email from position('@' in v_email));
      BEGIN
        -- Remove dots from local part for Gmail-style providers
        -- Remove plus-addressing
        IF position('+' in v_local) > 0 THEN
          v_local := split_part(v_local, '+', 1);
        END IF;
        
        -- For common providers that ignore dots in local part
        IF v_domain IN ('@gmail.com', '@googlemail.com') THEN
          v_local := replace(v_local, '.', '');
        END IF;
        
        v_normalised_email := v_local || v_domain;
      END;
    ELSE
      v_normalised_email := v_email;
    END IF;

    -- Check if email is already registered in auth.users
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE lower(email) = v_email
    ) INTO v_email_taken;

    IF NOT v_email_taken THEN
      -- Check profiles table with normalisation
      SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE lower(email) = v_email
           OR (
             -- Normalised comparison
             regexp_replace(
               split_part(lower(email), '@', 1), 
               '[.+].*', 
               '', 
               'g'
             ) || substring(lower(email) from position('@' in lower(email)))
             = v_normalised_email
           )
      ) INTO v_email_taken;
    END IF;
  END IF;

  -- Normalise phone: remove all non-numeric characters except leading +
  IF p_phone IS NOT NULL AND btrim(p_phone) <> '' THEN
    v_phone := regexp_replace(p_phone, '[^0-9+]', '', 'g');
    
    -- Ensure phone has minimum length
    IF length(v_phone) >= 7 THEN
      SELECT EXISTS (
        SELECT 1 
        FROM public.profiles
        WHERE regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g') = v_phone
      ) INTO v_phone_taken;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'email_taken', v_email_taken,
    'phone_taken', v_phone_taken
  );
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.check_signup_availability(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_signup_availability(text, text) TO anon, authenticated, service_role;

-- Function to find potential duplicate student accounts (admin tool)
CREATE OR REPLACE FUNCTION public.find_duplicate_students(
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  student_id uuid,
  profile_id uuid,
  full_name text,
  email text,
  phone text,
  created_at timestamptz,
  duplicate_type text,
  duplicate_match_ids uuid[],
  match_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH email_duplicates AS (
    SELECT 
      s.id AS student_id,
      s.profile_id,
      p.full_name,
      p.email,
      p.phone,
      s.created_at,
      'email' AS duplicate_type,
      array_agg(DISTINCT s2.id) FILTER (WHERE s2.id != s.id) AS duplicate_match_ids,
      count(DISTINCT s2.id) FILTER (WHERE s2.id != s.id) AS match_count
    FROM students s
    INNER JOIN profiles p ON s.profile_id = p.id
    INNER JOIN profiles p2 ON (
      lower(p.email) = lower(p2.email)
      OR (
        -- Normalised email comparison
        regexp_replace(split_part(lower(p.email), '@', 1), '[.+].*', '', 'g') || 
        substring(lower(p.email) from position('@' in lower(p.email))) =
        regexp_replace(split_part(lower(p2.email), '@', 1), '[.+].*', '', 'g') || 
        substring(lower(p2.email) from position('@' in lower(p2.email)))
      )
    )
    INNER JOIN students s2 ON s2.profile_id = p2.id
    WHERE p.email IS NOT NULL
      AND p2.email IS NOT NULL
      AND s.archived_at IS NULL
      AND s2.archived_at IS NULL
      AND s.id != s2.id
    GROUP BY s.id, s.profile_id, p.full_name, p.email, p.phone, s.created_at
    HAVING count(DISTINCT s2.id) > 0
  ),
  phone_duplicates AS (
    SELECT 
      s.id AS student_id,
      s.profile_id,
      p.full_name,
      p.email,
      p.phone,
      s.created_at,
      'phone' AS duplicate_type,
      array_agg(DISTINCT s2.id) FILTER (WHERE s2.id != s.id) AS duplicate_match_ids,
      count(DISTINCT s2.id) FILTER (WHERE s2.id != s.id) AS match_count
    FROM students s
    INNER JOIN profiles p ON s.profile_id = p.id
    INNER JOIN profiles p2 ON (
      regexp_replace(coalesce(p.phone, ''), '[^0-9+]', '', 'g') = 
      regexp_replace(coalesce(p2.phone, ''), '[^0-9+]', '', 'g')
      AND length(regexp_replace(coalesce(p.phone, ''), '[^0-9+]', '', 'g')) >= 7
    )
    INNER JOIN students s2 ON s2.profile_id = p2.id
    WHERE p.phone IS NOT NULL
      AND p2.phone IS NOT NULL
      AND s.archived_at IS NULL
      AND s2.archived_at IS NULL
      AND s.id != s2.id
    GROUP BY s.id, s.profile_id, p.full_name, p.email, p.phone, s.created_at
    HAVING count(DISTINCT s2.id) > 0
  ),
  combined AS (
    SELECT * FROM email_duplicates
    UNION
    SELECT * FROM phone_duplicates
  )
  SELECT DISTINCT ON (combined.student_id)
    combined.student_id,
    combined.profile_id,
    combined.full_name,
    combined.email,
    combined.phone,
    combined.created_at,
    combined.duplicate_type,
    combined.duplicate_match_ids,
    combined.match_count
  FROM combined
  ORDER BY combined.student_id, combined.match_count DESC
  LIMIT p_limit;
END;
$$;

-- Grant permissions to admin and staff roles
REVOKE ALL ON FUNCTION public.find_duplicate_students(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_duplicate_students(integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.check_signup_availability IS 'Checks if an email or phone number is already registered, with normalisation for common variations (Gmail dots, plus-addressing).';
COMMENT ON FUNCTION public.find_duplicate_students IS 'Finds potential duplicate student accounts based on normalised email and phone number matching. For admin use only.';
