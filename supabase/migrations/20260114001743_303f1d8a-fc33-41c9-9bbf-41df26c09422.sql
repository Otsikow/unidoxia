-- Add billing columns to students table for plan management
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'self_service', 'agent_supported')),
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('one_time', NULL)),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS refund_eligibility BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES public.agents(id),
ADD COLUMN IF NOT EXISTS agent_assigned_at TIMESTAMPTZ;

-- Add index for plan type queries
CREATE INDEX IF NOT EXISTS idx_students_plan_type ON public.students(plan_type);

-- Add index for agent assignment queries
CREATE INDEX IF NOT EXISTS idx_students_assigned_agent ON public.students(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.students.plan_type IS 'Student subscription plan: free, self_service, or agent_supported';
COMMENT ON COLUMN public.students.payment_type IS 'Payment type: one_time (all plans are one-time payments)';
COMMENT ON COLUMN public.students.payment_date IS 'Timestamp when payment was made';
COMMENT ON COLUMN public.students.payment_amount_cents IS 'Amount paid in cents';
COMMENT ON COLUMN public.students.payment_currency IS 'Currency code (e.g., USD)';
COMMENT ON COLUMN public.students.refund_eligibility IS 'Whether payment is eligible for refund (always false for UniDoxia)';
COMMENT ON COLUMN public.students.payment_confirmed_at IS 'Timestamp when payment was confirmed by Stripe webhook';
COMMENT ON COLUMN public.students.assigned_agent_id IS 'Assigned agent for agent_supported plan';
COMMENT ON COLUMN public.students.agent_assigned_at IS 'Timestamp when agent was assigned';