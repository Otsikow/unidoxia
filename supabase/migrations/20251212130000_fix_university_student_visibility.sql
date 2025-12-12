-- Fix student visibility for universities by relaxing the submitted_at check
-- to also allow applications with status != 'draft'

-- 1. Update student_has_application_to_partner_university
CREATE OR REPLACE FUNCTION public.student_has_application_to_partner_university(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.applications a
    JOIN public.programs p ON a.program_id = p.id
    JOIN public.universities u ON p.university_id = u.id
    WHERE a.student_id = p_student_id
      AND u.tenant_id = public.get_user_tenant(auth.uid())
      AND (a.submitted_at IS NOT NULL OR a.status != 'draft')
  );
$$;

-- 2. Update profile_has_application_to_partner_university
CREATE OR REPLACE FUNCTION public.profile_has_application_to_partner_university(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.students s
    JOIN public.applications a ON a.student_id = s.id
    JOIN public.programs p ON a.program_id = p.id
    JOIN public.universities u ON p.university_id = u.id
    WHERE s.profile_id = p_profile_id
      AND u.tenant_id = public.get_user_tenant(auth.uid())
      AND (a.submitted_at IS NOT NULL OR a.status != 'draft')
  );
$$;

-- 3. Update app_document_belongs_to_partner_university
CREATE OR REPLACE FUNCTION public.app_document_belongs_to_partner_university(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.applications a
    JOIN public.programs p ON a.program_id = p.id
    JOIN public.universities u ON p.university_id = u.id
    WHERE a.id = p_application_id
      AND u.tenant_id = public.get_user_tenant(auth.uid())
      AND (a.submitted_at IS NOT NULL OR a.status != 'draft')
  );
$$;
