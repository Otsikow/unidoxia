
CREATE OR REPLACE FUNCTION public.get_students_by_tenant(p_tenant_id uuid)
 RETURNS TABLE(student_id uuid, application_count integer, student jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    s.id as student_id,
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM public.applications a
      WHERE a.student_id = s.id
    ), 0) as application_count,
    jsonb_build_object(
      'id', s.id,
      'tenant_id', s.tenant_id,
      'profile_id', s.profile_id,
      'reference_code', s.reference_code,
      'legal_name', s.legal_name,
      'preferred_name', s.preferred_name,
      'contact_email', s.contact_email,
      'contact_phone', s.contact_phone,
      'current_country', s.current_country,
      'created_at', s.created_at,
      'updated_at', s.updated_at,
      'profile', (
        SELECT jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'phone', p.phone,
          'country', p.country,
          'onboarded', p.onboarded,
          'username', p.username
        )
        FROM public.profiles p
        WHERE p.id = s.profile_id
      )
    ) as student
  FROM public.students s
  WHERE s.tenant_id = p_tenant_id;
END;
$function$;
