-- Allow anyone (including unauthenticated users) to view active universities
-- This enables the marketplace functionality where students/agents can browse all universities
CREATE POLICY "Anyone can view active universities"
ON public.universities
FOR SELECT
USING (active = true OR active IS NULL);

-- Allow anyone to view active programs across all universities
-- This enables students/agents to browse all available courses
CREATE POLICY "Anyone can view all active programs"
ON public.programs
FOR SELECT
USING (active = true OR active IS NULL);