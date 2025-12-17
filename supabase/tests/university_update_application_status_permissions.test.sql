-- Verify university_update_application_status permission handling
BEGIN;

SELECT plan(4);

-- Use authenticated role semantics for auth.uid()
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claim.aud" = 'authenticated';

-- Shared test identifiers
CREATE TEMP TABLE vars AS
SELECT
  gen_random_uuid() AS tenant1,
  gen_random_uuid() AS tenant2,
  gen_random_uuid() AS admin_id,
  gen_random_uuid() AS partner_match,
  gen_random_uuid() AS partner_other,
  gen_random_uuid() AS tenantless_user,
  gen_random_uuid() AS student1_profile,
  gen_random_uuid() AS student2_profile,
  gen_random_uuid() AS university_id,
  gen_random_uuid() AS program_id,
  gen_random_uuid() AS app1_id,
  gen_random_uuid() AS app2_id;

-- Seed tenants
INSERT INTO public.tenants (id, name, slug, email_from)
SELECT tenant1, 'Tenant One', 'tenant-one-test', 'one@example.com' FROM vars;

INSERT INTO public.tenants (id, name, slug, email_from)
SELECT tenant2, 'Tenant Two', 'tenant-two-test', 'two@example.com' FROM vars;

-- Create auth users
INSERT INTO auth.users (id, email)
SELECT admin_id, 'admin@test.com' FROM vars
UNION ALL
SELECT partner_match, 'partner-match@test.com' FROM vars
UNION ALL
SELECT partner_other, 'partner-other@test.com' FROM vars
UNION ALL
SELECT tenantless_user, 'tenantless@test.com' FROM vars
UNION ALL
SELECT student1_profile, 'student1@test.com' FROM vars
UNION ALL
SELECT student2_profile, 'student2@test.com' FROM vars;

-- Allow a tenantless profile for regression coverage
ALTER TABLE public.profiles ALTER COLUMN tenant_id DROP NOT NULL;

-- Create profiles for users
INSERT INTO public.profiles (id, tenant_id, role, full_name, email)
SELECT admin_id, tenant1, 'admin', 'Admin User', 'admin@test.com' FROM vars
UNION ALL
SELECT partner_match, tenant1, 'partner', 'Matching Partner', 'partner-match@test.com' FROM vars
UNION ALL
SELECT partner_other, tenant2, 'partner', 'Other Partner', 'partner-other@test.com' FROM vars
UNION ALL
SELECT tenantless_user, NULL::uuid, 'partner', 'Tenantless Partner', 'tenantless@test.com' FROM vars
UNION ALL
SELECT student1_profile, tenant1, 'student', 'Student One', 'student1@test.com' FROM vars
UNION ALL
SELECT student2_profile, tenant1, 'student', 'Student Two', 'student2@test.com' FROM vars;

-- University + program tied to tenant1
INSERT INTO public.universities (id, tenant_id, name, country)
SELECT university_id, tenant1, 'Test University', 'USA' FROM vars;

INSERT INTO public.programs (id, tenant_id, university_id, name, level, discipline, duration_months, tuition_amount)
SELECT program_id, tenant1, university_id, 'CS', 'Bachelor', 'STEM', 48, 10000 FROM vars;

-- Students + applications for tenant1
INSERT INTO public.students (id, tenant_id, profile_id)
SELECT student1_profile, tenant1, student1_profile FROM vars
UNION ALL
SELECT student2_profile, tenant1, student2_profile FROM vars;

INSERT INTO public.applications (id, tenant_id, student_id, program_id, status, intake_month, intake_year)
SELECT app1_id, tenant1, student1_profile, program_id, 'submitted', 1, 2025 FROM vars
UNION ALL
SELECT app2_id, tenant1, student2_profile, program_id, 'submitted', 2, 2025 FROM vars;

-- Admin allowed
SET LOCAL "request.jwt.claim.sub" = (SELECT admin_id FROM vars);
SELECT is(
  (SELECT (public.university_update_application_status((SELECT app1_id FROM vars), 'screening', NULL))->>'status'),
  'screening',
  'Admin can update application status'
);

-- Partner with matching tenant allowed
SET LOCAL "request.jwt.claim.sub" = (SELECT partner_match FROM vars);
SELECT is(
  (SELECT (public.university_update_application_status((SELECT app2_id FROM vars), 'conditional_offer', NULL))->>'status'),
  'conditional_offer',
  'Partner with matching tenant can update application status'
);

-- Partner from another tenant denied
SET LOCAL "request.jwt.claim.sub" = (SELECT partner_other FROM vars);
SELECT throws_like(
  $$SELECT public.university_update_application_status((SELECT app1_id FROM vars), 'visa', NULL);$$,
  '%different university%',
  'Partner with mismatched tenant is blocked'
);

-- Partner with null tenant receives clear message
SET LOCAL "request.jwt.claim.sub" = (SELECT tenantless_user FROM vars);
SELECT throws_like(
  $$SELECT public.university_update_application_status((SELECT app1_id FROM vars), 'visa', NULL);$$,
  '%tenant_id is NULL%',
  'Partner missing tenant is rejected with guidance'
);

SELECT * FROM finish();

ROLLBACK;
