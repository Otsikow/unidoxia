-- TEST ONLY. Run in a new, disposable plain PostgreSQL database as its owner.
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/whatsapp_local_stub.sql
-- Then apply the WhatsApp migration twice and run whatsapp_rls.sql.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT (NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role';
$$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),raw_user_meta_data jsonb DEFAULT '{}');
CREATE TYPE public.app_role AS ENUM ('student','agent','partner','staff','admin');
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),tenant_id uuid NOT NULL DEFAULT gen_random_uuid(),role public.app_role NOT NULL,full_name text DEFAULT 'Fictional test',email text DEFAULT 'test@example.invalid');
CREATE TABLE public.students(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid REFERENCES public.profiles(id),whatsapp_number text,date_of_birth date);
CREATE TABLE public.universities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,country text,active boolean DEFAULT true,listing_status text DEFAULT 'active');
CREATE TABLE public.programs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),university_id uuid REFERENCES public.universities(id),name text,level text,discipline text,active boolean DEFAULT true,catalogue_status text DEFAULT 'active');
CREATE TABLE public.applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid REFERENCES public.students(id),program_id uuid REFERENCES public.programs(id),status text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,user_id uuid,type text,title text,content text,metadata jsonb,action_url text);
CREATE FUNCTION public.is_admin_or_staff(user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT FROM profiles WHERE id=user_id AND role IN ('admin','staff')); $$;
CREATE FUNCTION public.has_role(p_user_id uuid,p_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT FROM profiles WHERE id=p_user_id AND role=p_role); $$;
CREATE FUNCTION public.create_notification(p_tenant_id uuid,p_user_id uuid,p_type text,p_title text,p_content text,p_metadata jsonb DEFAULT '{}',p_action_url text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE result uuid; BEGIN
 INSERT INTO notifications(tenant_id,user_id,type,title,content,metadata,action_url) VALUES(p_tenant_id,p_user_id,p_type,p_title,p_content,p_metadata,p_action_url) RETURNING id INTO result; RETURN result; END $$;
GRANT SELECT,UPDATE ON public.students TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_student ON public.students FOR ALL TO authenticated USING(profile_id=auth.uid()) WITH CHECK(profile_id=auth.uid());
CREATE POLICY staff_student ON public.students FOR ALL TO authenticated USING(public.is_admin_or_staff(auth.uid()));
