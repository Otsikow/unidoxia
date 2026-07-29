-- Scheduled broadcast dispatch runs with the service role, which has no auth.uid().
-- Claim all due tenants for service-role execution while retaining tenant isolation
-- for an authenticated admin/staff invocation.
CREATE OR REPLACE FUNCTION public.claim_due_broadcasts(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.broadcasts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
  v_is_service_role BOOLEAN;
BEGIN
  v_tenant := public.get_user_tenant(auth.uid());
  v_is_service_role := COALESCE(auth.role() = 'service_role', FALSE);

  IF NOT v_is_service_role AND v_tenant IS NULL THEN
    RAISE EXCEPTION 'A tenant-scoped user or service role is required';
  END IF;

  RETURN QUERY
  WITH due AS (
    SELECT id
    FROM public.broadcasts
    WHERE status = 'scheduled'
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= now()
      AND (v_is_service_role OR tenant_id = v_tenant)
    ORDER BY scheduled_for ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.broadcasts b
  SET status = 'processing', updated_at = now()
  FROM due
  WHERE b.id = due.id
  RETURNING b.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_broadcasts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_due_broadcasts(INTEGER) TO authenticated, service_role;
