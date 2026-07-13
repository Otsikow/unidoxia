-- Fix anonymous SELECT on blog_posts. The "Staff can manage" policy applied to role 'public'
-- caused is_admin_or_staff() evaluation for anon requests, but EXECUTE was revoked from anon.
-- Scope the staff-management policy to authenticated users only.
DROP POLICY IF EXISTS "Staff can manage blog posts" ON public.blog_posts;
CREATE POLICY "Staff can manage blog posts"
  ON public.blog_posts
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Ensure anon and authenticated can execute helper still needed by other authenticated policies
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(uuid) TO authenticated;