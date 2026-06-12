
-- 1) partnership-documents: restrict uploads to partners/staff
DROP POLICY IF EXISTS "Authenticated users can upload partnership documents" ON storage.objects;
CREATE POLICY "Partners and staff can upload partnership documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'partnership-documents'
  AND (
    public.is_admin_or_staff(auth.uid())
    OR public.has_role(auth.uid(), 'partner'::app_role)
    OR public.has_role(auth.uid(), 'school_rep'::app_role)
  )
);

-- 2) profiles: replace tenant-wide visibility with role-scoped visibility
DROP POLICY IF EXISTS "Profiles: tenant members can view" ON public.profiles;
CREATE POLICY "Profiles: privileged tenant roles can view"
ON public.profiles FOR SELECT TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  AND (
    public.is_admin_or_staff(auth.uid())
    OR public.has_role(auth.uid(), 'counselor'::app_role)
    OR public.has_role(auth.uid(), 'agent'::app_role)
    OR public.has_role(auth.uid(), 'partner'::app_role)
    OR public.has_role(auth.uid(), 'school_rep'::app_role)
    OR public.has_role(auth.uid(), 'verifier'::app_role)
    OR public.has_role(auth.uid(), 'finance'::app_role)
  )
);

-- 3) student-documents: allow students to update (re-upload) their own files
CREATE POLICY "Students can update their own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT students.id::text FROM public.students WHERE students.profile_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT students.id::text FROM public.students WHERE students.profile_id = auth.uid()
  )
);

-- 4) realtime.messages: restrict conversation channel subscriptions to participants
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Realtime: conversation participants only" ON realtime.messages;
CREATE POLICY "Realtime: conversation participants only"
ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    WHEN topic LIKE 'conversation:%' THEN
      public.is_conversation_participant(
        NULLIF(split_part(topic, ':', 2), '')::uuid,
        auth.uid()
      )
    WHEN topic LIKE 'conversation_messages:%' THEN
      public.is_conversation_participant(
        NULLIF(split_part(topic, ':', 2), '')::uuid,
        auth.uid()
      )
    ELSE true
  END
);
