-- Fix application messaging RLS policy - 'university' is not a valid app_role enum value
-- The app_role enum only contains: student, agent, partner, staff, admin, counselor, verifier, finance, school_rep
-- University users have role 'partner' (with 'university' mapped to 'partner' by get_user_role function)
-- 
-- BUG: Migration 20251212120000_secure_application_messaging.sql used 'university'::public.app_role
-- which is an invalid enum cast and causes the function to fail, blocking ALL message sends.

BEGIN;

-- Drop and recreate the function with correct role checks
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
      -- UniDoxia internal roles (admin/staff can access all submitted applications)
      public.is_admin_or_staff(p_user_id)

      -- Student who owns the application (uses denormalized student_profile_id for efficiency)
      OR EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a.id = p_application_id
          AND a.student_profile_id = p_user_id
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
      -- Note: 'university' is not a valid app_role enum value - university users have role 'partner'
      -- The has_role function uses get_user_role which maps 'university' -> 'partner'
      OR (
        (public.has_role(p_user_id, 'partner'::public.app_role)
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

COMMENT ON FUNCTION public.can_access_application_messages(uuid, uuid) IS 
  'Checks if a user can access messages for a specific application. '
  'Returns true for: admin/staff (any application), students (own applications), '
  'agents (assigned applications), university partners (applications to their programs).';

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION public.can_access_application_messages(uuid, uuid) TO authenticated;

-- Ensure RLS is enabled on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they use the corrected function
-- This handles cases where the original migration partially applied
DROP POLICY IF EXISTS "Application messaging: select" ON public.messages;
DROP POLICY IF EXISTS "Application messaging: insert" ON public.messages;
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
