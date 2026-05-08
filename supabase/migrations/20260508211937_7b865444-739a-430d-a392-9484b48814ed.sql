ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS preferred_intake_year integer,
  ADD COLUMN IF NOT EXISTS preferred_intake_month integer;