
-- 1. Sequence for student reference codes
CREATE SEQUENCE IF NOT EXISTS public.student_reference_seq START 1 INCREMENT 1 MINVALUE 1;

-- 2. Add reference_code column (nullable initially for backfill)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS reference_code text;

-- 3. Backfill existing students in order of creation
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.students
  WHERE reference_code IS NULL
)
UPDATE public.students s
SET reference_code = 'UDX-' || lpad(o.rn::text, 6, '0')
FROM ordered o
WHERE s.id = o.id;

-- 4. Advance sequence past the highest used number
SELECT setval(
  'public.student_reference_seq',
  GREATEST(
    (SELECT COALESCE(MAX(NULLIF(regexp_replace(reference_code, '^UDX-', ''), '')::int), 0) FROM public.students),
    1
  ),
  true
);

-- 5. Trigger function to auto-assign reference_code on insert
CREATE OR REPLACE FUNCTION public.assign_student_reference_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    NEW.reference_code := 'UDX-' || lpad(nextval('public.student_reference_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_student_reference_code ON public.students;
CREATE TRIGGER trg_assign_student_reference_code
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_student_reference_code();

-- 6. Enforce uniqueness and non-null going forward
ALTER TABLE public.students
  ALTER COLUMN reference_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS students_reference_code_key
  ON public.students (reference_code);
