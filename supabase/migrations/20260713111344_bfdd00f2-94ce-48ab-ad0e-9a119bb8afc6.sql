
-- Helper: return the caller's tenant_id from profiles (security definer, stable)
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_tenant_id() TO authenticated, service_role;

-- =============================================================
-- application_reviews: scope counselor/verifier to their tenant
-- =============================================================
DROP POLICY IF EXISTS "Staff can view all application reviews" ON public.application_reviews;
DROP POLICY IF EXISTS "Staff can create application reviews" ON public.application_reviews;
DROP POLICY IF EXISTS "Staff can update application reviews" ON public.application_reviews;

CREATE POLICY "Staff can view application reviews in scope"
ON public.application_reviews
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_staff(auth.uid())
  OR (
    (has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'verifier'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_reviews.application_id
        AND a.tenant_id = public.current_user_tenant_id()
    )
  )
);

CREATE POLICY "Staff can create application reviews in scope"
ON public.application_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  OR (
    (has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'verifier'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_reviews.application_id
        AND a.tenant_id = public.current_user_tenant_id()
    )
  )
);

CREATE POLICY "Staff can update application reviews in scope"
ON public.application_reviews
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_staff(auth.uid())
  OR (
    (has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'verifier'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_reviews.application_id
        AND a.tenant_id = public.current_user_tenant_id()
    )
  )
)
WITH CHECK (
  public.is_admin_or_staff(auth.uid())
  OR (
    (has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'verifier'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_reviews.application_id
        AND a.tenant_id = public.current_user_tenant_id()
    )
  )
);

-- =============================================================
-- user_presence: scope SELECT to same tenant or shared conversation
-- =============================================================
DROP POLICY IF EXISTS "Authenticated users can view presence" ON public.user_presence;

CREATE POLICY "Users can view presence in their tenant or shared conversations"
ON public.user_presence
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_presence.user_id
      AND p.tenant_id = public.current_user_tenant_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.conversation_participants cp_self
    JOIN public.conversation_participants cp_other
      ON cp_other.conversation_id = cp_self.conversation_id
    WHERE cp_self.user_id = auth.uid()
      AND cp_other.user_id = user_presence.user_id
  )
);
