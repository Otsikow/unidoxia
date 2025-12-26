-- Ensure application-documents bucket exists and is private
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'application-documents',
  'application-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg','image/png','image/jpg','image/webp','image/gif',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'application-documents'
);

-- If the bucket already exists, keep it private but ensure limits/mime types are set
UPDATE storage.buckets
SET
  public = false,
  file_size_limit = COALESCE(file_size_limit, 10485760),
  allowed_mime_types = COALESCE(allowed_mime_types,
    ARRAY[
      'application/pdf',
      'image/jpeg','image/png','image/jpg','image/webp','image/gif',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
  ),
  updated_at = now()
WHERE id = 'application-documents';

-- Storage policies for application-documents
-- NOTE: storage.objects already has RLS enabled in Supabase.

-- Students can view application documents for their own applications
DROP POLICY IF EXISTS "Students can view their application documents" ON storage.objects;
CREATE POLICY "Students can view their application documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT a.id::text
    FROM public.applications a
    JOIN public.students s ON s.id = a.student_id
    WHERE s.profile_id = auth.uid()
  )
);

-- Students can upload documents to their own applications
DROP POLICY IF EXISTS "Students can upload their application documents" ON storage.objects;
CREATE POLICY "Students can upload their application documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT a.id::text
    FROM public.applications a
    JOIN public.students s ON s.id = a.student_id
    WHERE s.profile_id = auth.uid()
  )
);

-- Partners/school reps can view documents for applications they can manage
DROP POLICY IF EXISTS "Partners can view application documents" ON storage.objects;
CREATE POLICY "Partners can view application documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND can_manage_university_application(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- Partners/school reps can upload documents for applications they can manage
DROP POLICY IF EXISTS "Partners can upload application documents" ON storage.objects;
CREATE POLICY "Partners can upload application documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-documents'
  AND can_manage_university_application(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- Staff can manage all application documents
DROP POLICY IF EXISTS "Staff can manage application documents" ON storage.objects;
CREATE POLICY "Staff can manage application documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'application-documents' AND is_admin_or_staff(auth.uid())
)
WITH CHECK (
  bucket_id = 'application-documents' AND is_admin_or_staff(auth.uid())
);

-- =========================
-- Missing RPCs used by ApplicationReviewDialog
-- =========================

-- Primary RPC for university status updates
CREATE OR REPLACE FUNCTION public.university_update_application_status(
  p_application_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.application_status;
  v_row public.applications;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_manage_university_application(auth.uid(), p_application_id) AND NOT public.is_admin_or_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_status := p_status::public.application_status;

  UPDATE public.applications
  SET status = v_status,
      updated_at = now()
  WHERE id = p_application_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'updated_at', v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.university_update_application_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.university_update_application_status(uuid, text, text) TO authenticated;

-- Fallback RPC for updating review text/status/timeline (used across the app)
CREATE OR REPLACE FUNCTION public.update_application_review_text(
  p_application_id uuid,
  p_new_status text DEFAULT NULL,
  p_internal_notes text DEFAULT NULL,
  p_append_timeline_event jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.applications;
  v_timeline jsonb;
  v_new_status public.application_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Allow students/agents/partners/staff based on existing RLS when we perform the UPDATE.
  -- We still require that the caller can at least SELECT the row.
  PERFORM 1 FROM public.applications a WHERE a.id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not accessible';
  END IF;

  IF p_new_status IS NOT NULL THEN
    v_new_status := p_new_status::public.application_status;
  END IF;

  -- Append timeline event if provided
  IF p_append_timeline_event IS NOT NULL THEN
    SELECT COALESCE(a.timeline_json::jsonb, '[]'::jsonb)
    INTO v_timeline
    FROM public.applications a
    WHERE a.id = p_application_id;

    v_timeline := v_timeline || jsonb_build_array(p_append_timeline_event);
  END IF;

  UPDATE public.applications
  SET
    status = COALESCE(v_new_status, status),
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    timeline_json = COALESCE(v_timeline, timeline_json::jsonb),
    updated_at = now()
  WHERE id = p_application_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'updated_at', v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_application_review_text(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_application_review_text(uuid, text, text, jsonb) TO authenticated;

-- Legacy RPC name still referenced as a fallback in the UI
CREATE OR REPLACE FUNCTION public.update_application_review(
  p_application_id uuid,
  p_new_status text DEFAULT NULL,
  p_internal_notes text DEFAULT NULL,
  p_append_timeline_event jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.update_application_review_text(
    p_application_id,
    p_new_status,
    p_internal_notes,
    p_append_timeline_event
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_application_review(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_application_review(uuid, text, text, jsonb) TO authenticated;

-- Optional diagnostics RPC (safe, returns minimal info)
CREATE OR REPLACE FUNCTION public.diagnose_app_update_issue(p_app_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_manage boolean;
  v_exists boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.applications a WHERE a.id = p_app_id) INTO v_exists;
  v_can_manage := public.can_manage_university_application(auth.uid(), p_app_id);

  RETURN jsonb_build_object(
    'authenticated', true,
    'application_exists', v_exists,
    'can_manage_university_application', v_can_manage,
    'user_id', auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.diagnose_app_update_issue(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.diagnose_app_update_issue(uuid) TO authenticated;
