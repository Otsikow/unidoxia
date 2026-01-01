-- Add scoring configuration to universities
ALTER TABLE universities ADD COLUMN IF NOT EXISTS scoring_config JSONB DEFAULT '{
  "academics": {"weight": 25},
  "english_proficiency": {"weight": 25},
  "statement_quality": {"weight": 25},
  "visa_risk": {"weight": 25}
}';

-- Reviewer Profiles
CREATE TABLE IF NOT EXISTS reviewer_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  country_expertise TEXT[],
  program_expertise TEXT[],
  max_workload INTEGER DEFAULT 20,
  current_workload INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Application Reviews
CREATE TABLE IF NOT EXISTS application_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  stage TEXT NOT NULL, -- 'admin', 'university', 'agent'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed'
  scores JSONB, -- { "academics": 80, ... }
  feedback JSONB, -- { "strengths": "...", ... }
  decision TEXT, -- 'approve', 'reject', 'request_changes'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add review fields to applications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'assigned_reviewer_id') THEN
        ALTER TABLE applications ADD COLUMN assigned_reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'sla_due_at') THEN
        ALTER TABLE applications ADD COLUMN sla_due_at TIMESTAMPTZ;
    END IF;
END
$$;

-- RLS Policies
ALTER TABLE reviewer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_reviews ENABLE ROW LEVEL SECURITY;

-- Reviewer Profiles RLS
DROP POLICY IF EXISTS "Staff can view all reviewer profiles" ON reviewer_profiles;
CREATE POLICY "Staff can view all reviewer profiles"
  ON reviewer_profiles FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage reviewer profiles" ON reviewer_profiles;
CREATE POLICY "Staff can manage reviewer profiles"
  ON reviewer_profiles FOR ALL
  USING (is_admin_or_staff(auth.uid()));

-- Application Reviews RLS
DROP POLICY IF EXISTS "Staff can view all reviews" ON application_reviews;
CREATE POLICY "Staff can view all reviews"
  ON application_reviews FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "Reviewers can manage their own reviews" ON application_reviews;
CREATE POLICY "Reviewers can manage their own reviews"
  ON application_reviews FOR ALL
  USING (reviewer_id = auth.uid() OR is_admin_or_staff(auth.uid()));

DROP POLICY IF EXISTS "Partners can view reviews for their applications" ON application_reviews;
CREATE POLICY "Partners can view reviews for their applications"
  ON application_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN programs p ON a.program_id = p.id
      JOIN universities u ON p.university_id = u.id
      JOIN profiles prof ON prof.id = auth.uid()
      WHERE a.id = application_reviews.application_id
      AND prof.role = 'partner'
    )
  );

-- Function to assign reviewer
CREATE OR REPLACE FUNCTION assign_reviewer_to_application(app_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application applications%ROWTYPE;
  v_university universities%ROWTYPE;
  v_program programs%ROWTYPE;
  v_reviewer_id UUID;
  v_sla_hours INTEGER := 24;
BEGIN
  SELECT * INTO v_application FROM applications WHERE id = app_id;
  SELECT * INTO v_program FROM programs WHERE id = v_application.program_id;
  SELECT * INTO v_university FROM universities WHERE id = v_program.university_id;

  SELECT rp.id INTO v_reviewer_id
  FROM reviewer_profiles rp
  WHERE
    v_university.country = ANY(rp.country_expertise)
    AND (v_program.discipline = ANY(rp.program_expertise) OR rp.program_expertise IS NULL OR array_length(rp.program_expertise, 1) = 0)
    AND rp.current_workload < rp.max_workload
  ORDER BY rp.current_workload ASC
  LIMIT 1;

  IF v_reviewer_id IS NULL THEN
    SELECT rp.id INTO v_reviewer_id
    FROM reviewer_profiles rp
    WHERE rp.current_workload < rp.max_workload
    ORDER BY rp.current_workload ASC
    LIMIT 1;
  END IF;

  IF v_reviewer_id IS NOT NULL THEN
    UPDATE applications
    SET
      assigned_reviewer_id = v_reviewer_id,
      sla_due_at = NOW() + (v_sla_hours || ' hours')::INTERVAL
    WHERE id = app_id;

    UPDATE reviewer_profiles
    SET current_workload = current_workload + 1
    WHERE id = v_reviewer_id;

    INSERT INTO application_reviews (application_id, reviewer_id, stage, status)
    VALUES (app_id, v_reviewer_id, 'admin_review', 'pending');
  END IF;
END;
$$;

-- Trigger for assignment
CREATE OR REPLACE FUNCTION trigger_assign_reviewer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'submitted' AND (OLD.status IS DISTINCT FROM 'submitted') THEN
    PERFORM assign_reviewer_to_application(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_submit ON applications;
CREATE TRIGGER on_application_submit
  AFTER UPDATE OF status ON applications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_assign_reviewer();
