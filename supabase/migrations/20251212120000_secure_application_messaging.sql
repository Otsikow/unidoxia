-- Secure application-linked messaging across students, agents, and universities
-- Ensures only parties connected through an application can view/send messages.

BEGIN;

-- Helper: can the given user access messages for this application?
CREATE OR REPLACE FUNCTION public.can_access_application_messages(
  p_application_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p_user_id IS NOT NULL
    AND (
      -- UniDoxia internal roles
      public.is_admin_or_staff(p_user_id)

      -- Student who owns the application
      OR EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.students s ON s.id = a.student_id
        WHERE a.id = p_application_id
          AND s.profile_id = p_user_id
          AND a.submitted_at IS NOT NULL
      )

      -- Assigned/referring agent
      OR EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.agents ag ON ag.id = a.agent_id
        WHERE a.id = p_application_id
          AND ag.profile_id = p_user_id
          AND a.submitted_at IS NOT NULL
      )

      -- University partner (tenant-scoped) for submitted applications
      OR (
        (public.has_role(p_user_id, 'partner'::public.app_role)
          OR public.has_role(p_user_id, 'university'::public.app_role)
          OR public.has_role(p_user_id, 'school_rep'::public.app_role))
        AND EXISTS (
          SELECT 1
          FROM public.applications a
          JOIN public.programs p ON p.id = a.program_id
          JOIN public.universities u ON u.id = p.university_id
          WHERE a.id = p_application_id
            AND a.submitted_at IS NOT NULL
            AND u.tenant_id = public.get_user_tenant(p_user_id)
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_application_messages(uuid, uuid) TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Replace legacy policies
DROP POLICY IF EXISTS "Users can view messages for their applications" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages on their applications" ON public.messages;

CREATE POLICY "Application messaging: select"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (public.can_access_application_messages(application_id, auth.uid()));

CREATE POLICY "Application messaging: insert"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.can_access_application_messages(application_id, auth.uid())
  );

COMMIT;
