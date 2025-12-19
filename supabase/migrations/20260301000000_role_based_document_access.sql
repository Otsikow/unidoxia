-- Enforce strict role-based access rules for student documents
-- Students: view/manage their own documents
-- Admins: view/manage all documents
-- Universities: view documents only after admin approval and tenant match

-- Add approval metadata for university access
ALTER TABLE public.student_documents
  ADD COLUMN IF NOT EXISTS university_access_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS university_access_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS university_access_approved_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.student_documents.university_access_approved IS 'When true, university partners can view the document';
COMMENT ON COLUMN public.student_documents.university_access_approved_at IS 'Timestamp when an admin approved university access';
COMMENT ON COLUMN public.student_documents.university_access_approved_by IS 'Admin profile that approved university access';

-- Clean up legacy policies
DROP POLICY IF EXISTS "Students can manage their own documents" ON public.student_documents;
DROP POLICY IF EXISTS "Counselors can view and verify assigned students' documents" ON public.student_documents;
DROP POLICY IF EXISTS "Staff can verify documents" ON public.student_documents;
DROP POLICY IF EXISTS "Partners can view student documents for their applications" ON public.student_documents;

-- Students can manage only their own documents
CREATE POLICY "Students manage own documents"
ON public.student_documents
FOR ALL
TO authenticated
USING (student_profile_id = auth.uid())
WITH CHECK (student_profile_id = auth.uid());

-- Admins can view and manage all documents
CREATE POLICY "Admins manage all student documents"
ON public.student_documents
FOR ALL
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin'::public.app_role)
WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.app_role);

-- Universities can view documents only after admin approval and tenant match
CREATE POLICY "Universities view approved documents"
ON public.student_documents
FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
  AND university_access_approved = TRUE
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.programs p ON p.id = a.program_id
    JOIN public.universities u ON u.id = p.university_id
    WHERE a.student_id = public.student_documents.student_id
      AND u.tenant_id = public.get_user_tenant(auth.uid())
      AND a.submitted_at IS NOT NULL
  )
);

-- Update storage bucket policies to mirror RLS protections
DROP POLICY IF EXISTS "Students can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view all student documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can manage all student documents" ON storage.objects;
DROP POLICY IF EXISTS "Partners can view student documents for applications" ON storage.objects;

-- Students: only their folder
CREATE POLICY "Students manage student-documents bucket"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.students WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'student-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.students WHERE profile_id = auth.uid()
  )
);

-- Admins: full control
CREATE POLICY "Admins manage student-documents bucket"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND public.get_user_role(auth.uid()) = 'admin'::public.app_role
)
WITH CHECK (
  bucket_id = 'student-documents'
  AND public.get_user_role(auth.uid()) = 'admin'::public.app_role
);

-- Universities: read-only when document is approved and tenant matches
CREATE POLICY "Universities read approved student documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND public.get_user_role(auth.uid()) IN ('partner'::public.app_role, 'school_rep'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.student_documents sd
    WHERE sd.storage_path = storage.objects.name
      AND sd.university_access_approved = TRUE
      AND EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.programs p ON p.id = a.program_id
        JOIN public.universities u ON u.id = p.university_id
        WHERE a.student_id = sd.student_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
          AND a.submitted_at IS NOT NULL
      )
  )
);
