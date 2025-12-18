-- Migration: Remove Placeholder Courses and Universities
-- This migration removes all placeholder/fake courses and universities including "InHisTime University"
-- 
-- The InHisTime University has Toronto listed as its city but United Kingdom as its country,
-- which indicates it's a placeholder/demo university with fake course data.
--
-- This migration cleans up the database to allow for real course data to be added.

BEGIN;

-- ============================================================================
-- STEP 1: Log what will be deleted (for reference)
-- ============================================================================

-- Note: This SELECT helps identify what's being removed - won't affect the migration
DO $$
DECLARE
  university_count INTEGER;
  program_count INTEGER;
  scholarship_count INTEGER;
  application_count INTEGER;
BEGIN
  -- Count placeholder universities
  SELECT COUNT(*) INTO university_count
  FROM public.universities
  WHERE 
    name ILIKE '%inhist%' OR
    name ILIKE '%InHisTime%' OR
    name ILIKE '%placeholder%' OR
    name ILIKE '%test university%' OR
    name ILIKE '%sample university%' OR
    name ILIKE '%demo university%' OR
    (city = 'Toronto' AND country = 'United Kingdom');
  
  RAISE NOTICE 'Found % placeholder universities to remove', university_count;
  
  -- Count programs that will be deleted
  SELECT COUNT(*) INTO program_count
  FROM public.programs p
  JOIN public.universities u ON p.university_id = u.id
  WHERE 
    u.name ILIKE '%inhist%' OR
    u.name ILIKE '%InHisTime%' OR
    u.name ILIKE '%placeholder%' OR
    u.name ILIKE '%test university%' OR
    u.name ILIKE '%sample university%' OR
    u.name ILIKE '%demo university%' OR
    (u.city = 'Toronto' AND u.country = 'United Kingdom');
  
  RAISE NOTICE 'Found % placeholder programs/courses to remove', program_count;
  
  -- Count scholarships that will be deleted
  SELECT COUNT(*) INTO scholarship_count
  FROM public.scholarships s
  JOIN public.universities u ON s.university_id = u.id
  WHERE 
    u.name ILIKE '%inhist%' OR
    u.name ILIKE '%InHisTime%' OR
    u.name ILIKE '%placeholder%' OR
    u.name ILIKE '%test university%' OR
    u.name ILIKE '%sample university%' OR
    u.name ILIKE '%demo university%' OR
    (u.city = 'Toronto' AND u.country = 'United Kingdom');
  
  RAISE NOTICE 'Found % placeholder scholarships to remove', scholarship_count;
  
  -- Count applications that will be cascade deleted (important warning!)
  SELECT COUNT(*) INTO application_count
  FROM public.applications a
  JOIN public.programs p ON a.program_id = p.id
  JOIN public.universities u ON p.university_id = u.id
  WHERE 
    u.name ILIKE '%inhist%' OR
    u.name ILIKE '%InHisTime%' OR
    u.name ILIKE '%placeholder%' OR
    u.name ILIKE '%test university%' OR
    u.name ILIKE '%sample university%' OR
    u.name ILIKE '%demo university%' OR
    (u.city = 'Toronto' AND u.country = 'United Kingdom');
  
  IF application_count > 0 THEN
    RAISE WARNING 'Found % applications that will be CASCADE DELETED with placeholder programs', application_count;
  ELSE
    RAISE NOTICE 'No applications found for placeholder programs (safe to delete)';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Delete scholarships associated with placeholder universities
-- (Must delete first due to foreign key constraints)
-- ============================================================================

DELETE FROM public.scholarships
WHERE university_id IN (
  SELECT id FROM public.universities
  WHERE 
    name ILIKE '%inhist%' OR
    name ILIKE '%InHisTime%' OR
    name ILIKE '%placeholder%' OR
    name ILIKE '%test university%' OR
    name ILIKE '%sample university%' OR
    name ILIKE '%demo university%' OR
    (city = 'Toronto' AND country = 'United Kingdom')
);

-- ============================================================================
-- STEP 3: Delete programs/courses associated with placeholder universities
-- Note: Applications to these programs will be cascade deleted
-- ============================================================================

DELETE FROM public.programs
WHERE university_id IN (
  SELECT id FROM public.universities
  WHERE 
    name ILIKE '%inhist%' OR
    name ILIKE '%InHisTime%' OR
    name ILIKE '%placeholder%' OR
    name ILIKE '%test university%' OR
    name ILIKE '%sample university%' OR
    name ILIKE '%demo university%' OR
    (city = 'Toronto' AND country = 'United Kingdom')
);

-- ============================================================================
-- STEP 4: Delete the placeholder universities themselves
-- ============================================================================

DELETE FROM public.universities 
WHERE 
  name ILIKE '%inhist%' OR
  name ILIKE '%InHisTime%' OR
  name ILIKE '%placeholder%' OR
  name ILIKE '%test university%' OR
  name ILIKE '%sample university%' OR
  name ILIKE '%demo university%' OR
  (city = 'Toronto' AND country = 'United Kingdom') OR
  (name IS NULL OR name = '');

-- ============================================================================
-- STEP 5: Verify cleanup
-- Note: Intakes are automatically deleted via CASCADE when programs are deleted
-- ============================================================================

DO $$
DECLARE
  remaining_placeholders INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_placeholders
  FROM public.universities
  WHERE 
    name ILIKE '%inhist%' OR
    name ILIKE '%InHisTime%' OR
    name ILIKE '%placeholder%' OR
    name ILIKE '%test university%' OR
    name ILIKE '%sample university%' OR
    name ILIKE '%demo university%' OR
    (city = 'Toronto' AND country = 'United Kingdom');
  
  IF remaining_placeholders > 0 THEN
    RAISE WARNING 'There are still % placeholder universities remaining', remaining_placeholders;
  ELSE
    RAISE NOTICE 'All placeholder universities and courses have been successfully removed';
  END IF;
END $$;

COMMIT;
