ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS preferred_course text,
  ADD COLUMN IF NOT EXISTS preferred_country text;
