-- Disposable localhost acceptance only, never production.
do $$begin if exists(select 1 from auth.users) then raise exception 'Empty local Auth required'; end if; end$$;
alter table public.students add column archived_at timestamptz, add column nationality text, add column secondary_qualification text, add column secondary_school_name text;
alter table public.programs add column name text, add column active boolean default true;
create table public.education_records(id uuid primary key default gen_random_uuid(),student_id uuid references public.students(id) on delete cascade);
create table public.student_documents(id uuid primary key default gen_random_uuid(),student_id uuid references public.students(id) on delete cascade,document_type text,storage_path text,admin_review_status text default 'awaiting_admin_review');
grant all on public.education_records,public.student_documents to service_role;
grant select,insert on public.education_records,public.student_documents to authenticated;
alter table public.education_records enable row level security;
alter table public.student_documents enable row level security;
create policy own_education on public.education_records for all to authenticated using(exists(select 1 from public.students s where s.id=student_id and s.profile_id=auth.uid())) with check(exists(select 1 from public.students s where s.id=student_id and s.profile_id=auth.uid()));
create policy own_documents on public.student_documents for all to authenticated using(exists(select 1 from public.students s where s.id=student_id and s.profile_id=auth.uid())) with check(exists(select 1 from public.students s where s.id=student_id and s.profile_id=auth.uid()));
