-- SYNTHETIC LOCAL FIXTURE ONLY. Never run this setup against a hosted database.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE TABLE public.test_reviewers (user_id uuid, university_id uuid, staff boolean DEFAULT false);
CREATE TABLE public.applications (id uuid PRIMARY KEY, student_profile_id uuid, university_id uuid);
CREATE TABLE public.application_documents (id uuid PRIMARY KEY, application_id uuid REFERENCES applications, verified boolean);
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.can_manage_university_application(p_user_id uuid, p_application_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM test_reviewers r JOIN applications a ON a.id=p_application_id
    WHERE r.user_id=p_user_id AND (r.staff OR r.university_id=a.university_id))
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT SELECT ON application_documents TO authenticated, anon;
INSERT INTO test_reviewers VALUES
  ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',false),
  ('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',false);
INSERT INTO applications VALUES
  ('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002');
INSERT INTO application_documents VALUES
  ('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',true),
  ('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',false),
  ('50000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002',true);
\ir ../migrations/20261031091259_application_document_review_access.sql
-- Reapplying must be safe.
\ir ../migrations/20261031091259_application_document_review_access.sql
SET ROLE authenticated;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  IF (SELECT count(*) FROM application_documents) <> 1 THEN RAISE EXCEPTION 'Partner must see only its verified document'; END IF;
  IF EXISTS(SELECT 1 FROM application_documents WHERE id IN ('50000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000003')) THEN RAISE EXCEPTION 'Pending or cross-university document leaked'; END IF;
END $$;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000002';
DO $$ BEGIN
  IF (SELECT count(*) FROM application_documents) <> 1 THEN RAISE EXCEPTION 'Second university lost its scoped access'; END IF;
END $$;
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000099';
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM application_documents) THEN RAISE EXCEPTION 'Unrelated user has document access'; END IF;
END $$;
RESET request.jwt.claim.sub;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM application_documents) THEN RAISE EXCEPTION 'Missing identity has document access'; END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM application_documents) THEN RAISE EXCEPTION 'Anonymous access leaked'; END IF;
END $$;
RESET ROLE;
SELECT 'application document RLS checks passed' AS result;
