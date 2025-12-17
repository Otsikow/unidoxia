-- Allow university partners to upload to application-documents bucket
-- This is required for universities to upload CAS, Offer Letters, etc.

BEGIN;

-- Policy for University Partners to INSERT (Upload) to application-documents bucket
CREATE POLICY "university_partner_storage_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-documents' AND
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.applications a ON a.id::text = (storage.foldername(name))[1]
    JOIN public.programs prog ON prog.id = a.program_id
    JOIN public.universities u ON u.id = prog.university_id
    WHERE p.id = auth.uid()
      AND p.role IN ('partner', 'school_rep')
      AND u.tenant_id = p.tenant_id
      -- Ensure application is real and belongs to the university
  )
);

COMMIT;
