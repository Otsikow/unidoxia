-- Add archive columns to students table for soft-delete
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID DEFAULT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT DEFAULT NULL;

-- Create index for efficient filtering of non-archived students
CREATE INDEX IF NOT EXISTS idx_students_archived_at ON public.students (archived_at) WHERE archived_at IS NULL;