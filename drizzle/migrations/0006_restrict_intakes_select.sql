DROP POLICY IF EXISTS "Authenticated users can view active intakes" ON public.intakes;
CREATE POLICY "Authenticated users can view intakes of visible programs"
ON public.intakes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.programs p WHERE p.id = intakes.program_id));