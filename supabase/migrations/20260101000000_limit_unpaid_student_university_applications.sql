-- Migration: Limit unpaid students to one university
-- Unpaid students (free plan) can only apply to one university total

-- Function to count distinct universities a student has applied to
CREATE OR REPLACE FUNCTION get_student_university_count(p_student_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT p.university_id)::INTEGER
  FROM applications a
  JOIN programs p ON a.program_id = p.id
  WHERE a.student_id = p_student_id
  AND a.status != 'draft';
$$;

-- Function to check if student can create application to a specific university
CREATE OR REPLACE FUNCTION can_student_apply_to_university(p_student_id UUID, p_program_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_plan_type TEXT;
  v_university_id UUID;
  v_university_count INTEGER;
  v_already_applied BOOLEAN;
BEGIN
  -- Get student's plan type
  SELECT plan_type INTO v_plan_type FROM students WHERE id = p_student_id;

  -- Paid plans have unlimited access
  IF v_plan_type IS DISTINCT FROM 'free' THEN
    RETURN TRUE;
  END IF;

  -- Get the target university for this program
  SELECT university_id INTO v_university_id FROM programs WHERE id = p_program_id;

  IF v_university_id IS NULL THEN
    -- No university found for program, allow (shouldn't happen normally)
    RETURN TRUE;
  END IF;

  -- Check if student already has a non-draft application to this university
  SELECT EXISTS (
    SELECT 1
    FROM applications a
    JOIN programs p ON a.program_id = p.id
    WHERE a.student_id = p_student_id
    AND a.status != 'draft'
    AND p.university_id = v_university_id
  ) INTO v_already_applied;

  -- If already applied to this university, allow more applications to same university
  IF v_already_applied THEN
    RETURN TRUE;
  END IF;

  -- Count distinct universities student has applied to
  v_university_count := get_student_university_count(p_student_id);

  -- Free plan: only 1 university allowed
  RETURN v_university_count < 1;
END;
$$;

-- Update the original can_student_create_application function to use university logic
CREATE OR REPLACE FUNCTION can_student_create_application(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    -- Free plan: max 1 university
    WHEN (SELECT plan_type FROM students WHERE id = p_student_id) = 'free' THEN
      get_student_university_count(p_student_id) < 1
    -- Paid plans: unlimited
    ELSE TRUE
  END;
$$;

-- Trigger function to enforce university limit on application insert
CREATE OR REPLACE FUNCTION enforce_unpaid_student_university_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_type TEXT;
  v_university_id UUID;
  v_university_count INTEGER;
  v_already_applied BOOLEAN;
BEGIN
  -- Only check non-draft applications
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;

  -- Get student's plan type
  SELECT plan_type INTO v_plan_type FROM students WHERE id = NEW.student_id;

  -- Paid plans have unlimited access
  IF v_plan_type IS DISTINCT FROM 'free' THEN
    RETURN NEW;
  END IF;

  -- Get the target university for this program
  SELECT university_id INTO v_university_id FROM programs WHERE id = NEW.program_id;

  IF v_university_id IS NULL THEN
    -- No university found for program, allow
    RETURN NEW;
  END IF;

  -- Check if student already has a non-draft application to this university
  SELECT EXISTS (
    SELECT 1
    FROM applications a
    JOIN programs p ON a.program_id = p.id
    WHERE a.student_id = NEW.student_id
    AND a.status != 'draft'
    AND a.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND p.university_id = v_university_id
  ) INTO v_already_applied;

  -- If already applied to this university, allow more applications to same university
  IF v_already_applied THEN
    RETURN NEW;
  END IF;

  -- Count distinct universities student has applied to (excluding current if update)
  SELECT COUNT(DISTINCT p.university_id)::INTEGER INTO v_university_count
  FROM applications a
  JOIN programs p ON a.program_id = p.id
  WHERE a.student_id = NEW.student_id
  AND a.status != 'draft'
  AND a.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  -- Free plan: only 1 university allowed
  IF v_university_count >= 1 THEN
    RAISE EXCEPTION 'Free plan students can only apply to one university. Please upgrade your plan to apply to more universities.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for insert and update on applications
DROP TRIGGER IF EXISTS tr_enforce_unpaid_student_university_limit ON applications;
CREATE TRIGGER tr_enforce_unpaid_student_university_limit
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION enforce_unpaid_student_university_limit();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_student_university_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_student_apply_to_university(UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_student_university_count(UUID) IS 'Returns count of distinct universities a student has applied to (non-draft applications)';
COMMENT ON FUNCTION can_student_apply_to_university(UUID, UUID) IS 'Checks if a student can apply to a specific university based on their plan';
COMMENT ON FUNCTION enforce_unpaid_student_university_limit() IS 'Trigger function to enforce university limit for unpaid (free plan) students';
