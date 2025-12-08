-- ============================================================================
-- MAKE ALL UNIVERSITIES VISIBLE TO STUDENTS AND AGENTS
-- ============================================================================
-- This migration ensures all existing universities are visible in the directory.
-- The `active` field controls visibility - when true, the university appears
-- in search results and the university directory for students and agents.
-- ============================================================================

-- Update all universities to be active/visible
-- This includes:
-- 1. Universities with active = false (explicitly hidden)
-- 2. Universities with active IS NULL (missing value)
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.universities
  SET active = true,
      updated_at = NOW()
  WHERE active IS NOT true;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'Made % universities visible to students and agents', updated_count;
  ELSE
    RAISE NOTICE 'All universities were already visible - no changes needed';
  END IF;
END$$;

-- Ensure the default value for active is true (it should already be, but just in case)
ALTER TABLE public.universities 
ALTER COLUMN active SET DEFAULT true;

-- Add a comment explaining the purpose of the active column
COMMENT ON COLUMN public.universities.active IS 
  'Controls visibility to students and agents. When true, the university appears in the public directory and search results. Admins can toggle this via the Partner Management page.';
