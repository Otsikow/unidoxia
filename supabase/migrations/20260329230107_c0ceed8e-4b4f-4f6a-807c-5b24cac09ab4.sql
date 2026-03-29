
-- 1. Remove permissive conversations insert policy for public role
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- 2. Restrict signup INSERT policies to self-insertion only
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
CREATE POLICY "Allow profile creation during signup"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Allow user_roles creation during signup" ON public.user_roles;
CREATE POLICY "Allow user_roles creation during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow students creation during signup" ON public.students;
CREATE POLICY "Allow students creation during signup"
  ON public.students FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Allow agents creation during signup" ON public.agents;
CREATE POLICY "Allow agents creation during signup"
  ON public.agents FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- 3. Add explicit DENY policies for audit_logs write operations
CREATE POLICY "Deny direct inserts on audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny direct updates on audit_logs"
  ON public.audit_logs FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny direct deletes on audit_logs"
  ON public.audit_logs FOR DELETE
  USING (false);

-- 4. Restrict user_presence SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view user presence" ON public.user_presence;
CREATE POLICY "Authenticated users can view presence"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (true);

-- 5. Add RLS policies for staff_profiles view/table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'staff_profiles' AND relkind = 'r') THEN
    ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "Staff can view staff profiles" ON public.staff_profiles FOR SELECT TO authenticated USING (public.is_admin_or_staff(auth.uid()))';
  END IF;
END $$;

-- 6. Fix partner cross-tenant application read
DROP POLICY IF EXISTS "Partners can view applications to their university" ON public.applications;
CREATE POLICY "Partners can view applications to their university"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_staff(auth.uid())
    OR (
      public.has_role(auth.uid(), 'partner'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.programs pr
        JOIN public.universities u ON u.id = pr.university_id
        WHERE pr.id = program_id
          AND u.tenant_id = public.get_user_tenant(auth.uid())
      )
    )
    OR (
      public.has_role(auth.uid(), 'student'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id AND s.profile_id = auth.uid()
      )
    )
    OR public.is_agent_for_application(auth.uid(), id)
  );

-- 7. Add analytics size constraints via validation trigger
CREATE OR REPLACE FUNCTION public.validate_analytics_event_size()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(NEW.event_type) > 100 THEN
    NEW.event_type := left(NEW.event_type, 100);
  END IF;
  IF NEW.event_name IS NOT NULL AND length(NEW.event_name) > 100 THEN
    NEW.event_name := left(NEW.event_name, 100);
  END IF;
  IF NEW.page_url IS NOT NULL AND length(NEW.page_url) > 2000 THEN
    NEW.page_url := left(NEW.page_url, 2000);
  END IF;
  IF NEW.referrer IS NOT NULL AND length(NEW.referrer) > 2000 THEN
    NEW.referrer := left(NEW.referrer, 2000);
  END IF;
  IF NEW.user_agent IS NOT NULL AND length(NEW.user_agent) > 500 THEN
    NEW.user_agent := left(NEW.user_agent, 500);
  END IF;
  IF NEW.session_id IS NOT NULL AND length(NEW.session_id) > 255 THEN
    NEW.session_id := left(NEW.session_id, 255);
  END IF;
  IF NEW.event_data IS NOT NULL AND pg_column_size(NEW.event_data) > 10000 THEN
    NEW.event_data := '{"_truncated": true}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_analytics_event_size ON public.analytics_events;
CREATE TRIGGER trg_validate_analytics_event_size
  BEFORE INSERT ON public.analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_analytics_event_size();
