-- Migration: Add student account status for admin management
-- This migration adds the ability for admins to suspend or soft-delete student accounts

-- Add status column to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted'));

-- Add suspension reason column for audit purposes
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Add status changed timestamp
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Add who changed the status
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES public.profiles(id);

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- Update existing students to have 'active' status
UPDATE public.students SET status = 'active' WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.students.status IS 'Account status: active, suspended, or deleted (soft delete)';
COMMENT ON COLUMN public.students.status_reason IS 'Reason for suspension or deletion';
COMMENT ON COLUMN public.students.status_changed_at IS 'Timestamp when status was last changed';
COMMENT ON COLUMN public.students.status_changed_by IS 'Admin profile ID who changed the status';
