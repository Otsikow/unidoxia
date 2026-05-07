
-- 1. Restrict tenants INSERT to admins/staff (remove always-true policy)
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
CREATE POLICY "Admins can create tenants"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- 2. Switch application_reviews policies to canonical has_role/is_admin_or_staff
DROP POLICY IF EXISTS "Staff can view all application reviews" ON public.application_reviews;
DROP POLICY IF EXISTS "Staff can create application reviews" ON public.application_reviews;
DROP POLICY IF EXISTS "Staff can update application reviews" ON public.application_reviews;

CREATE POLICY "Staff can view all application reviews"
ON public.application_reviews
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_staff(auth.uid())
  OR public.has_role(auth.uid(), 'counselor'::app_role)
  OR public.has_role(auth.uid(), 'verifier'::app_role)
);

CREATE POLICY "Staff can create application reviews"
ON public.application_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  OR public.has_role(auth.uid(), 'counselor'::app_role)
  OR public.has_role(auth.uid(), 'verifier'::app_role)
);

CREATE POLICY "Staff can update application reviews"
ON public.application_reviews
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_staff(auth.uid())
  OR public.has_role(auth.uid(), 'counselor'::app_role)
  OR public.has_role(auth.uid(), 'verifier'::app_role)
);

-- 3. Survey responses staff view via canonical role check
DROP POLICY IF EXISTS "Staff can view all survey responses" ON public.survey_responses;
CREATE POLICY "Staff can view all survey responses"
ON public.survey_responses
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_staff(auth.uid())
  OR public.has_role(auth.uid(), 'counselor'::app_role)
);

-- 4. Restrict universities sensitive columns from anonymous reads.
-- Revoke broad SELECT from anon and re-grant only the public marketplace columns.
REVOKE SELECT ON public.universities FROM anon;
GRANT SELECT (
  id, tenant_id, name, country, city, logo_url, description, website,
  ranking, active, featured, featured_priority, featured_summary,
  featured_highlight, created_at, updated_at
) ON public.universities TO anon;

-- 5. Restrict blog image upload/update/delete to admin/staff only
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete blog images" ON storage.objects;

CREATE POLICY "Staff can upload blog images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'blog-images'
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Staff can update blog images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'blog-images'
  AND public.is_admin_or_staff(auth.uid())
);

CREATE POLICY "Staff can delete blog images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'blog-images'
  AND public.is_admin_or_staff(auth.uid())
);

-- 6. Restrict message-attachments uploads to conversation participants and
-- remove uid-folder fallback from SELECT policy.
DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Conversation participants can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;

CREATE POLICY "Participants can upload message attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Participants can view message attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Participants can update message attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid, auth.uid())
  AND owner = auth.uid()
);

CREATE POLICY "Participants can delete message attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND public.is_conversation_participant(((storage.foldername(name))[1])::uuid, auth.uid())
  AND owner = auth.uid()
);
