-- Create survey_responses table
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(application_id) -- One survey per application
);

-- RLS Policies
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can insert their own survey responses" ON public.survey_responses;
CREATE POLICY "Students can insert their own survey responses" ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view their own survey responses" ON public.survey_responses;
CREATE POLICY "Students can view their own survey responses" ON public.survey_responses
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all survey responses" ON public.survey_responses;
CREATE POLICY "Staff can view all survey responses" ON public.survey_responses
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );
