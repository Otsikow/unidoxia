-- ============================================================================
-- FIX: University profile saving issues (with cascade handling)
-- Problem: Multiple duplicate universities per tenant, data not persisting
-- Solution: 
--   1. For each tenant with duplicates, keep the most complete university
--   2. Reassign all related records (programs, scholarships, etc.) to keeper
--   3. Delete duplicate universities
--   4. Add unique constraint to prevent future duplicates
--   5. Create helper function for safe university creation
-- ============================================================================

-- Step 1: Create a function to determine which university record to keep
CREATE OR REPLACE FUNCTION public.get_university_completeness(u universities)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    (CASE WHEN u.name IS NOT NULL AND u.name != '' THEN 1 ELSE 0 END) +
    (CASE WHEN u.city IS NOT NULL AND u.city != '' THEN 2 ELSE 0 END) +
    (CASE WHEN u.website IS NOT NULL AND u.website != '' THEN 2 ELSE 0 END) +
    (CASE WHEN u.logo_url IS NOT NULL AND u.logo_url != '' THEN 3 ELSE 0 END) +
    (CASE WHEN u.featured_image_url IS NOT NULL AND u.featured_image_url != '' THEN 3 ELSE 0 END) +
    (CASE WHEN u.description IS NOT NULL AND LENGTH(u.description) > 100 THEN 2 ELSE 0 END) +
    (CASE WHEN u.submission_config_json IS NOT NULL 
          AND u.submission_config_json->>'tagline' IS NOT NULL THEN 2 ELSE 0 END) +
    (CASE WHEN u.submission_config_json IS NOT NULL 
          AND jsonb_array_length(COALESCE(u.submission_config_json->'highlights', '[]'::jsonb)) > 0 THEN 2 ELSE 0 END);
$$;

-- Step 2: Create a temporary table to store the keeper university for each tenant
CREATE TEMP TABLE university_keepers AS
SELECT DISTINCT ON (tenant_id)
  tenant_id,
  id as keeper_id
FROM universities u
ORDER BY tenant_id, public.get_university_completeness(u) DESC, updated_at DESC NULLS LAST;

-- Step 3: Reassign all programs to the keeper university
UPDATE programs p
SET university_id = uk.keeper_id
FROM university_keepers uk
WHERE p.university_id IN (
  SELECT id FROM universities WHERE tenant_id = uk.tenant_id AND id != uk.keeper_id
);

-- Step 4: Reassign all scholarships to the keeper university  
UPDATE scholarships s
SET university_id = uk.keeper_id
FROM university_keepers uk
WHERE s.university_id IN (
  SELECT id FROM universities WHERE tenant_id = uk.tenant_id AND id != uk.keeper_id
);

-- Step 5: Reassign all intake_calendars to the keeper university
UPDATE intake_calendars ic
SET university_id = uk.keeper_id
FROM university_keepers uk
WHERE ic.university_id IN (
  SELECT id FROM universities WHERE tenant_id = uk.tenant_id AND id != uk.keeper_id
);

-- Step 6: Now safe to delete duplicate universities
DELETE FROM universities u
USING university_keepers uk
WHERE u.tenant_id = uk.tenant_id
  AND u.id != uk.keeper_id;

-- Step 7: Drop the temp table
DROP TABLE university_keepers;

-- Step 8: Add unique constraint to prevent future duplicates
ALTER TABLE universities 
ADD CONSTRAINT universities_tenant_id_unique UNIQUE (tenant_id);

-- Step 9: Create a helper function to safely get or create a university for a tenant
CREATE OR REPLACE FUNCTION public.get_or_create_university(
  p_tenant_id UUID,
  p_name TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'Unknown',
  p_contact_name TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_university_id UUID;
  v_initial_config JSONB;
BEGIN
  -- Try to get existing university for this tenant
  SELECT id INTO v_university_id
  FROM universities
  WHERE tenant_id = p_tenant_id
  LIMIT 1;
  
  -- If found, return it
  IF v_university_id IS NOT NULL THEN
    RETURN v_university_id;
  END IF;
  
  -- Create initial config with contact info if provided
  v_initial_config := jsonb_build_object(
    'contacts', jsonb_build_object(
      'primary', jsonb_build_object(
        'name', COALESCE(p_contact_name, ''),
        'email', COALESCE(p_contact_email, ''),
        'phone', NULL,
        'title', NULL
      )
    ),
    'highlights', '[]'::jsonb,
    'social', '{}'::jsonb,
    'media', '{}'::jsonb,
    'tagline', NULL
  );
  
  -- Create new university with ON CONFLICT to handle race conditions
  INSERT INTO universities (
    tenant_id,
    name,
    country,
    city,
    website,
    logo_url,
    description,
    active,
    submission_config_json
  )
  VALUES (
    p_tenant_id,
    COALESCE(p_name, 'University'),
    p_country,
    NULL,
    NULL,
    NULL,
    'Welcome to ' || COALESCE(p_name, 'your university') || '. Please update your profile to showcase your institution.',
    true,
    v_initial_config
  )
  ON CONFLICT (tenant_id) DO NOTHING
  RETURNING id INTO v_university_id;
  
  -- If insert failed due to race condition, fetch the existing one
  IF v_university_id IS NULL THEN
    SELECT id INTO v_university_id
    FROM universities
    WHERE tenant_id = p_tenant_id
    LIMIT 1;
  END IF;
  
  RETURN v_university_id;
END;
$$;

-- Grant execute to authenticated users (needed for the login flow)
GRANT EXECUTE ON FUNCTION public.get_or_create_university(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_or_create_university IS 
  'Safely gets or creates the single university for a tenant. Uses ON CONFLICT to handle race conditions.';

-- Step 10: Clean up the helper function
DROP FUNCTION IF EXISTS public.get_university_completeness(universities);