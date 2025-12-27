-- Student Billing System Migration
-- One-time, non-refundable payments for student plans

-- Create plan type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_plan_type') THEN
    CREATE TYPE student_plan_type AS ENUM ('free', 'self_service', 'agent_supported');
  END IF;
END$$;

-- Create payment type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_payment_type') THEN
    CREATE TYPE billing_payment_type AS ENUM ('one_time');
  END IF;
END$$;

-- Add billing columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_type student_plan_type DEFAULT 'free';
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_type billing_payment_type DEFAULT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_amount_cents INTEGER DEFAULT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';
ALTER TABLE students ADD COLUMN IF NOT EXISTS refund_eligibility BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_confirmation_ip TEXT DEFAULT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS agent_assigned_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for plan type lookups
CREATE INDEX IF NOT EXISTS idx_students_plan_type ON students(plan_type);
CREATE INDEX IF NOT EXISTS idx_students_assigned_agent ON students(assigned_agent_id);

-- Create student_billing_history table for audit trail
CREATE TABLE IF NOT EXISTS student_billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  plan_type student_plan_type NOT NULL,
  payment_type billing_payment_type NOT NULL DEFAULT 'one_time',
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  stripe_payment_intent TEXT,
  stripe_session_id TEXT,
  confirmation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmation_ip TEXT,
  confirmation_user_agent TEXT,
  refund_eligibility BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on billing history
ALTER TABLE student_billing_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_billing_history
CREATE POLICY "Students can view their own billing history"
  ON student_billing_history FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Staff can view all billing history"
  ON student_billing_history FOR SELECT
  USING (is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff can manage billing history"
  ON student_billing_history FOR ALL
  USING (is_admin_or_staff(auth.uid()));

-- Function to get application count for a student
CREATE OR REPLACE FUNCTION get_student_application_count(p_student_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM applications 
  WHERE student_id = p_student_id 
  AND status != 'draft';
$$;

-- Function to check if student can create new application based on plan
CREATE OR REPLACE FUNCTION can_student_create_application(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    -- Free plan: max 1 application
    WHEN (SELECT plan_type FROM students WHERE id = p_student_id) = 'free' THEN
      get_student_application_count(p_student_id) < 1
    -- Paid plans: unlimited applications
    ELSE TRUE
  END;
$$;

-- Function to get available agent for assignment
CREATE OR REPLACE FUNCTION get_available_agent_for_assignment(p_tenant_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT a.id
  FROM agents a
  WHERE a.tenant_id = p_tenant_id
    AND a.active = TRUE
    AND a.verification_status = 'verified'
  ORDER BY (
    SELECT COUNT(*) 
    FROM students s 
    WHERE s.assigned_agent_id = a.id
  ) ASC, a.created_at ASC
  LIMIT 1;
$$;

-- Function to assign agent to student (for Agent-Supported plan)
CREATE OR REPLACE FUNCTION assign_agent_to_student(p_student_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_agent_id UUID;
BEGIN
  -- Get student's tenant
  SELECT tenant_id INTO v_tenant_id FROM students WHERE id = p_student_id;
  
  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Find available agent
  v_agent_id := get_available_agent_for_assignment(v_tenant_id);
  
  IF v_agent_id IS NOT NULL THEN
    -- Assign agent to student
    UPDATE students 
    SET assigned_agent_id = v_agent_id,
        agent_assigned_at = NOW()
    WHERE id = p_student_id;
  END IF;
  
  RETURN v_agent_id;
END;
$$;

-- Function to upgrade student plan after payment
CREATE OR REPLACE FUNCTION upgrade_student_plan(
  p_student_id UUID,
  p_plan_type student_plan_type,
  p_amount_cents INTEGER,
  p_currency TEXT DEFAULT 'USD',
  p_stripe_payment_intent TEXT DEFAULT NULL,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_confirmation_ip TEXT DEFAULT NULL,
  p_confirmation_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assigned_agent_id UUID := NULL;
  v_result JSONB;
BEGIN
  -- Update student plan
  UPDATE students 
  SET plan_type = p_plan_type,
      payment_type = 'one_time',
      payment_date = NOW(),
      payment_amount_cents = p_amount_cents,
      payment_currency = p_currency,
      refund_eligibility = FALSE,
      payment_confirmed_at = NOW(),
      payment_confirmation_ip = p_confirmation_ip
  WHERE id = p_student_id;
  
  -- Record billing history
  INSERT INTO student_billing_history (
    student_id,
    plan_type,
    payment_type,
    amount_cents,
    currency,
    stripe_payment_intent,
    stripe_session_id,
    confirmation_ip,
    confirmation_user_agent,
    refund_eligibility
  ) VALUES (
    p_student_id,
    p_plan_type,
    'one_time',
    p_amount_cents,
    p_currency,
    p_stripe_payment_intent,
    p_stripe_session_id,
    p_confirmation_ip,
    p_confirmation_user_agent,
    FALSE
  );
  
  -- If Agent-Supported plan, assign an agent
  IF p_plan_type = 'agent_supported' THEN
    v_assigned_agent_id := assign_agent_to_student(p_student_id);
  END IF;
  
  -- Return result
  v_result := jsonb_build_object(
    'success', TRUE,
    'plan_type', p_plan_type::TEXT,
    'assigned_agent_id', v_assigned_agent_id,
    'payment_date', NOW()
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_student_application_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_student_create_application(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_student_plan(UUID, student_plan_type, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE student_billing_history IS 'Audit trail for student billing/plan upgrades. All payments are one-time and non-refundable.';
COMMENT ON COLUMN students.plan_type IS 'Student plan type: free (1 app), self_service ($49 unlimited), agent_supported ($200 with agent)';
COMMENT ON COLUMN students.refund_eligibility IS 'Always FALSE - all payments are non-refundable';
