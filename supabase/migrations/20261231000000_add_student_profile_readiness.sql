-- Add profile readiness fields to students table for admin approval workflow
-- This enables admins to explicitly mark when a student profile is ready for university review

-- Add columns for profile readiness tracking
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS profile_ready_for_university BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS profile_approved_by UUID REFERENCES public.profiles(id);

-- Create index for faster queries on readiness status
CREATE INDEX IF NOT EXISTS idx_students_profile_ready_for_university
  ON public.students(profile_ready_for_university)
  WHERE profile_ready_for_university = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN public.students.profile_ready_for_university IS
  'Indicates whether admin has approved this student profile for university review. Universities should only see profiles where this is TRUE.';

COMMENT ON COLUMN public.students.profile_approved_at IS
  'Timestamp when the profile was approved for university review';

COMMENT ON COLUMN public.students.profile_approved_by IS
  'ID of the admin who approved the profile for university review';

-- Update RLS policy to restrict university access to approved profiles only
-- First, check if the policy exists and drop it if so
DO $$
BEGIN
  -- Drop existing university view policy if it exists
  DROP POLICY IF EXISTS "Universities can view approved student profiles" ON public.students;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Policy doesn't exist, continue
END $$;

-- Create new policy that restricts university access to approved profiles
CREATE POLICY "Universities can view approved student profiles"
ON public.students
FOR SELECT
USING (
  -- Admins and staff can always see all students
  public.is_admin_or_staff(auth.uid())
  OR
  -- Students can see their own profile
  profile_id = auth.uid()
  OR
  -- Partners/universities can only see students who:
  -- 1. Have profile_ready_for_university = TRUE
  -- 2. Have an application to a program at a university in the partner's tenant
  (
    public.has_role(auth.uid(), 'partner'::app_role)
    AND profile_ready_for_university = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.student_id = students.id
        AND u.tenant_id = public.get_user_tenant(auth.uid())
    )
  )
);
