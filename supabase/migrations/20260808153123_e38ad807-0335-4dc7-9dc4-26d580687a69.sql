ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_email text,
  ADD COLUMN IF NOT EXISTS emergency_contact_country text;

COMMENT ON COLUMN public.students.emergency_contact_name IS 'Emergency contact full name (personal data - restricted access)';