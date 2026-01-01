-- Create application_reviews table for storing application review data
CREATE TABLE IF NOT EXISTS public.application_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id),
  stage TEXT NOT NULL DEFAULT 'initial',
  status TEXT NOT NULL DEFAULT 'pending',
  scores JSONB DEFAULT '{}',
  feedback JSONB DEFAULT '{"strengths": [], "weaknesses": [], "conditions": [], "visa_concerns": []}',
  decision TEXT CHECK (decision IN ('approve', 'reject', 'request_changes')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey_responses table for storing student feedback
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(application_id, student_id)
);

-- Enable RLS on both tables
ALTER TABLE public.application_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for application_reviews
CREATE POLICY "Staff can view all application reviews"
  ON public.application_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'counselor', 'verifier')
    )
  );

CREATE POLICY "Staff can create application reviews"
  ON public.application_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'counselor', 'verifier')
    )
  );

CREATE POLICY "Staff can update application reviews"
  ON public.application_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'counselor', 'verifier')
    )
  );

-- RLS policies for survey_responses
CREATE POLICY "Students can view own survey responses"
  ON public.survey_responses FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Students can insert own survey responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Staff can view all survey responses"
  ON public.survey_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'counselor')
    )
  );

-- Create get_agent_performance_metrics RPC function
CREATE OR REPLACE FUNCTION public.get_agent_performance_metrics(agent_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_applications', (
      SELECT COUNT(*) FROM applications WHERE agent_id = agent_id_param
    ),
    'time_to_offer_days', (
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (o.created_at - a.submitted_at)) / 86400), 0)::INT
      FROM applications a
      JOIN offers o ON o.application_id = a.id
      WHERE a.agent_id = agent_id_param AND a.submitted_at IS NOT NULL
    ),
    'acceptance_rate', (
      SELECT COALESCE(
        (COUNT(*) FILTER (WHERE o.accepted = true)::FLOAT / NULLIF(COUNT(*), 0) * 100),
        0
      )::INT
      FROM applications a
      JOIN offers o ON o.application_id = a.id
      WHERE a.agent_id = agent_id_param
    ),
    'visa_success_rate', (
      SELECT COALESCE(
        (COUNT(*) FILTER (WHERE status = 'visa_approved')::FLOAT / NULLIF(COUNT(*) FILTER (WHERE status IN ('visa_approved', 'visa_rejected')), 0) * 100),
        0
      )::INT
      FROM applications
      WHERE agent_id = agent_id_param
    ),
    'active_applications', (
      SELECT COUNT(*) FROM applications 
      WHERE agent_id = agent_id_param 
      AND status NOT IN ('enrolled', 'rejected', 'withdrawn', 'visa_rejected')
    ),
    'funnel', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT status, COUNT(*) as cnt
        FROM applications
        WHERE agent_id = agent_id_param
        GROUP BY status
      ) s
    ),
    'universities', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', u.name, 'avg_days', avg_days)), '[]'::jsonb)
      FROM (
        SELECT p.university_id, AVG(EXTRACT(EPOCH FROM (o.created_at - a.submitted_at)) / 86400)::INT as avg_days
        FROM applications a
        JOIN programs p ON p.id = a.program_id
        JOIN offers o ON o.application_id = a.id
        WHERE a.agent_id = agent_id_param AND a.submitted_at IS NOT NULL
        GROUP BY p.university_id
        ORDER BY avg_days ASC
        LIMIT 5
      ) sub
      JOIN universities u ON u.id = sub.university_id
    ),
    'nationalities', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('nationality', nationality, 'visa_rate', rate)), '[]'::jsonb)
      FROM (
        SELECT s.nationality, 
          (COUNT(*) FILTER (WHERE a.status = 'visa_approved')::FLOAT / NULLIF(COUNT(*) FILTER (WHERE a.status IN ('visa_approved', 'visa_rejected')), 0) * 100)::INT as rate
        FROM applications a
        JOIN students s ON s.id = a.student_id
        WHERE a.agent_id = agent_id_param
        AND s.nationality IS NOT NULL
        GROUP BY s.nationality
        HAVING COUNT(*) FILTER (WHERE a.status IN ('visa_approved', 'visa_rejected')) > 0
        ORDER BY rate DESC
        LIMIT 5
      ) sub
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create updated_at trigger for application_reviews
CREATE TRIGGER update_application_reviews_updated_at
  BEFORE UPDATE ON public.application_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();