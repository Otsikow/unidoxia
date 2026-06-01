
ALTER TABLE public.students
  ALTER COLUMN reference_code
  SET DEFAULT ('UDX-' || lpad(nextval('public.student_reference_seq')::text, 6, '0'));
