-- ============================================================================
-- Fix University Tenant Unique Constraint
-- ============================================================================
-- This migration ensures the unique constraint on universities.tenant_id exists.
-- Without this constraint, upsert operations using ON CONFLICT (tenant_id) fail.
--
-- This migration is idempotent and safe to run multiple times.
-- ============================================================================

-- Step 1: Clean up any duplicate universities per tenant (keep most recently updated)
-- This must be done BEFORE adding the unique constraint
DO $$
DECLARE
  duplicate_tenant RECORD;
  university_to_keep UUID;
  unis_to_delete UUID[];
BEGIN
  -- Find and resolve any tenants with multiple universities
  FOR duplicate_tenant IN
    SELECT tenant_id, COUNT(*) as uni_count
    FROM public.universities
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the most recently updated active university
    SELECT id INTO university_to_keep
    FROM public.universities
    WHERE tenant_id = duplicate_tenant.tenant_id
    ORDER BY 
      CASE WHEN active = true THEN 0 ELSE 1 END,
      updated_at DESC NULLS LAST, 
      created_at DESC NULLS LAST
    LIMIT 1;

    -- Get IDs of universities to delete
    SELECT ARRAY_AGG(id) INTO unis_to_delete
    FROM public.universities
    WHERE tenant_id = duplicate_tenant.tenant_id
      AND id != university_to_keep;

    -- Reassign foreign key references before deleting
    IF unis_to_delete IS NOT NULL AND array_length(unis_to_delete, 1) > 0 THEN
      -- Update programs to point to the kept university
      UPDATE public.programs
      SET university_id = university_to_keep
      WHERE university_id = ANY(unis_to_delete);

      -- Delete the duplicate universities
      DELETE FROM public.universities
      WHERE id = ANY(unis_to_delete);

      RAISE NOTICE 'Resolved % duplicate universities for tenant %, kept %',
        array_length(unis_to_delete, 1), duplicate_tenant.tenant_id, university_to_keep;
    END IF;
  END LOOP;
END$$;

-- Step 2: Add the unique constraint if it doesn't exist
DO $$
BEGIN
  -- Check if any unique constraint on tenant_id exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.universities'::regclass 
    AND conname IN ('universities_tenant_id_key', 'universities_tenant_id_unique')
    AND contype = 'u'
  ) THEN
    RAISE NOTICE 'Unique constraint on universities.tenant_id already exists';
    RETURN;
  END IF;

  -- Create the unique constraint
  ALTER TABLE public.universities
  ADD CONSTRAINT universities_tenant_id_unique UNIQUE (tenant_id);
  
  RAISE NOTICE 'Successfully added unique constraint universities_tenant_id_unique';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint already exists (caught exception)';
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Cannot add unique constraint: duplicate tenant_id values still exist. Please resolve duplicates first.';
END$$;

-- Step 3: Add index for performance (if not already created by constraint)
CREATE INDEX IF NOT EXISTS idx_universities_tenant_id 
  ON public.universities(tenant_id);

-- Step 4: Verify the constraint exists
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.universities'::regclass 
    AND contype = 'u'
    AND conname IN ('universities_tenant_id_unique', 'universities_tenant_id_key')
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE 'Verification passed: Unique constraint on universities.tenant_id exists';
  ELSE
    RAISE WARNING 'Verification WARNING: No unique constraint found on universities.tenant_id';
  END IF;
END$$;

COMMENT ON CONSTRAINT universities_tenant_id_unique ON public.universities IS
  'Ensures each tenant can only have one university profile for data isolation';
