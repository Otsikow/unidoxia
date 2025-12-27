-- Fix storage policies for student document uploads
-- This migration ensures that:
-- 1. The student-documents bucket exists with correct settings
-- 2. RLS policies allow students to upload to their own folders
-- 3. The policies work correctly with the folder-based access pattern

-- Ensure the student-documents bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = COALESCE(storage.buckets.file_size_limit, 10485760),
  allowed_mime_types = COALESCE(storage.buckets.allowed_mime_types,
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
  );

-- Drop potentially conflicting policies for student-documents bucket
DROP POLICY IF EXISTS "Students can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students manage student-documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage student-documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view all student documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can manage all student documents" ON storage.objects;
DROP POLICY IF EXISTS "Universities read approved student documents" ON storage.objects;

-- Create consolidated policy for students to manage their own documents
-- Uses FOR ALL to cover INSERT, SELECT, UPDATE, DELETE in one policy
CREATE POLICY "student_documents_bucket_student_access"
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

-- Admin/staff can manage all documents in student-documents bucket
CREATE POLICY "student_documents_bucket_admin_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND public.is_admin_or_staff(auth.uid())
)
WITH CHECK (
  bucket_id = 'student-documents'
  AND public.is_admin_or_staff(auth.uid())
);

-- Ensure the application-documents bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents',
  'application-documents',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = COALESCE(storage.buckets.file_size_limit, 10485760),
  allowed_mime_types = COALESCE(storage.buckets.allowed_mime_types,
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
  );

-- Drop potentially conflicting policies for application-documents bucket
DROP POLICY IF EXISTS "Users can upload application documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their application documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their application documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their application documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload their application documents" ON storage.objects;
DROP POLICY IF EXISTS "Partners can view application documents" ON storage.objects;
DROP POLICY IF EXISTS "Partners can upload application documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can manage application documents" ON storage.objects;

-- Create consolidated policy for students to manage their own application documents
CREATE POLICY "application_documents_bucket_student_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT a.id::text
    FROM public.applications a
    JOIN public.students s ON s.id = a.student_id
    WHERE s.profile_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'application-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT a.id::text
    FROM public.applications a
    JOIN public.students s ON s.id = a.student_id
    WHERE s.profile_id = auth.uid()
  )
);

-- Admin/staff can manage all documents in application-documents bucket
CREATE POLICY "application_documents_bucket_admin_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND public.is_admin_or_staff(auth.uid())
)
WITH CHECK (
  bucket_id = 'application-documents'
  AND public.is_admin_or_staff(auth.uid())
);

-- University partners can access application documents for applications to their programs
CREATE POLICY "application_documents_bucket_partner_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND public.can_manage_university_application(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'application-documents'
  AND public.can_manage_university_application(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- Add comment explaining the storage policy structure
COMMENT ON POLICY "student_documents_bucket_student_access" ON storage.objects IS
  'Allows students to manage documents in folders named after their student ID';

COMMENT ON POLICY "application_documents_bucket_student_access" ON storage.objects IS
  'Allows students to manage documents in folders named after their application IDs';

-- =============================================================================
-- FIX: student_documents TABLE RLS policies
-- =============================================================================
-- The student_documents table needs policies that work with the trigger that
-- populates student_profile_id from student_id. Both columns are valid for access.

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Students can manage their own documents" ON public.student_documents;
DROP POLICY IF EXISTS "Students manage own documents" ON public.student_documents;

-- Create a robust policy that works with either student_id OR student_profile_id
-- This ensures inserts work even if the trigger hasn't fired yet
CREATE POLICY "Students manage own documents"
ON public.student_documents
FOR ALL
TO authenticated
USING (
  -- Check via student_profile_id (direct, preferred)
  student_profile_id = auth.uid()
  OR
  -- Fallback: check via student_id lookup
  student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
)
WITH CHECK (
  -- For inserts, verify the student_id belongs to the authenticated user
  student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

-- Ensure admin/staff can still manage all documents
DROP POLICY IF EXISTS "Admins manage all student documents" ON public.student_documents;
CREATE POLICY "Admins manage all student documents"
ON public.student_documents
FOR ALL
TO authenticated
USING (public.is_admin_or_staff(auth.uid()))
WITH CHECK (public.is_admin_or_staff(auth.uid()));
