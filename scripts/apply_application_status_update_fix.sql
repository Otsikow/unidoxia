-- ============================================================================
-- FIX: Application Status Update - Issue #1620
-- ============================================================================
-- This script creates the `update_application_review` RPC function that is 
-- required for university partners to update application status and notes.
--
-- HOW TO APPLY:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project (gbustuntgvmwkcttjojo)
-- 3. Navigate to: SQL Editor (in the left sidebar)
-- 4. Click "New query"
-- 5. Paste this entire script
-- 6. Click "Run" (or press Ctrl/Cmd + Enter)
-- 7. Verify the message shows "Success. No rows returned"
--
-- After running this script, the "Update status" button should work correctly.
-- ============================================================================

-- Step 1: Ensure the 'rejected' status exists in the enum
DO $$
BEGIN
  ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- Step 2: Create/Replace the update_application_review function
-- This function allows university partners (partner + school_rep roles) and 
-- staff/admin to update application status, internal notes, and timeline.
CREATE OR REPLACE FUNCTION public.update_application_review(
  p_application_id UUID,
  p_new_status public.application_status DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_append_timeline_event JSONB DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  status public.application_status,
  internal_notes TEXT,
  timeline_json JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_tenant UUID;
  v_user_role public.app_role;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  v_user_role := public.get_user_role(v_user_id);

  -- Allow university partner roles (partner + school_rep) and staff/admin.
  IF NOT (
    v_user_role IN ('partner'::public.app_role, 'school_rep'::public.app_role)
    OR public.is_admin_or_staff(v_user_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to update applications' USING ERRCODE = '42501';
  END IF;

  -- For university partner roles: ensure the application belongs to their tenant (via program->university).
  IF NOT public.is_admin_or_staff(v_user_id) THEN
    v_user_tenant := public.get_user_tenant(v_user_id);

    IF v_user_tenant IS NULL THEN
      RAISE EXCEPTION 'Partner tenant not found' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.programs p ON p.id = a.program_id
      JOIN public.universities u ON u.id = p.university_id
      WHERE a.id = p_application_id
        AND u.tenant_id = v_user_tenant
    ) THEN
      RAISE EXCEPTION 'You do not have permission to update this application' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.applications a
  SET
    status = COALESCE(p_new_status, a.status),
    internal_notes = COALESCE(p_internal_notes, a.internal_notes),
    timeline_json = CASE
      WHEN p_append_timeline_event IS NULL THEN a.timeline_json
      WHEN a.timeline_json IS NULL THEN jsonb_build_array(p_append_timeline_event)
      WHEN jsonb_typeof(a.timeline_json) = 'array' THEN a.timeline_json || jsonb_build_array(p_append_timeline_event)
      ELSE jsonb_build_array(p_append_timeline_event)
    END,
    updated_at = now()
  WHERE a.id = p_application_id
  RETURNING a.id, a.status, a.internal_notes, a.timeline_json, a.updated_at
  INTO id, status, internal_notes, timeline_json, updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN NEXT;
END;
$$;

-- Step 3: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) TO authenticated;

-- Step 4: Add helpful comment
COMMENT ON FUNCTION public.update_application_review(UUID, public.application_status, TEXT, JSONB) IS
  'Authorized application review update for university partners (partner + school_rep) and staff/admin (status + internal_notes + timeline event).';

-- Step 5: Notify PostgREST to reload its schema cache
-- This ensures the new function is immediately available via the API
NOTIFY pgrst, 'reload config';

-- ============================================================================
-- VERIFICATION: Run this query after the script completes to verify the fix
-- ============================================================================
-- SELECT 
--   proname as function_name,
--   prosecdef as is_security_definer
-- FROM pg_proc 
-- WHERE proname = 'update_application_review';
-- 
-- Expected result: 1 row with function_name = 'update_application_review' and is_security_definer = true
-- ============================================================================
