-- Fix: Partnership Documents Bucket Allows Unauthenticated Uploads
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can upload partnership documents" ON storage.objects;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can upload partnership documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'partnership-documents'::text);