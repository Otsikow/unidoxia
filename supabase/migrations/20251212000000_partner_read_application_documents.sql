-- Allow university partners to read submitted application documents
-- from the private `application-documents` bucket, scoped by tenant.

-- Replace the existing read policy with one that includes partners.
DROP POLICY IF EXISTS "Users can read their application documents" ON storage.objects;

CREATE POLICY "Users can read their application documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents' AND
  (
    -- Students can read their own documents
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM applications WHERE student_id IN (
        SELECT id FROM students WHERE profile_id = auth.uid()
      )
    )
    OR
    -- Staff and admins can read all documents
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'staff', 'counselor', 'verifier')
    )
    OR
    -- University partners can read documents for applications in their tenant
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN applications a ON a.id::text = (storage.foldername(name))[1]
      WHERE p.id = auth.uid()
        AND p.role = 'partner'
        AND a.tenant_id = p.tenant_id
        AND a.submitted_at IS NOT NULL
    )
  )
);

