-- Review-only until approved. Additive placement workflow; existing applications,
-- billing, document policies and roles are untouched. All writes use guarded RPCs.
create schema if not exists private;

create table public.student_placement_cases (
  student_id uuid primary key references public.students(id) on delete cascade,
  intended_subject text not null default '' check (length(intended_subject) <= 300),
  preferred_countries text[] not null default '{}' check (cardinality(preferred_countries) <= 12),
  tuition_budget numeric check (tuition_budget > 0 and tuition_budget <= 10000000),
  budget_currency text not null default 'USD' check (budget_currency ~ '^[A-Z]{3}$'),
  budget_notes text not null default '' check (length(budget_notes) <= 4000),
  scholarship_interest boolean,
  scholarship_background text not null default '' check (length(scholarship_background) <= 4000),
  status text not null default 'draft' check (status in ('draft','submitted','reviewing','changes_requested','recommendations_ready')),
  review_notes text not null default '' check (length(review_notes) <= 4000),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.student_placement_recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_placement_cases(student_id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  program_name text not null,
  university_name text not null,
  country text not null,
  rationale text not null check (length(trim(rationale)) between 20 and 4000),
  tuition_amount numeric check (tuition_amount > 0 and tuition_amount <= 10000000),
  tuition_currency text not null default 'USD' check (tuition_currency ~ '^[A-Z]{3}$'),
  tuition_period text not null default 'per_year' check (tuition_period in ('per_year','per_semester','total_course')),
  tuition_source_url text,
  tuition_checked_on date,
  scholarship_notes text not null default '' check (length(scholarship_notes) <= 4000),
  scholarship_source_url text,
  scholarship_checked_on date,
  response text check (response in ('interested','not_suitable','question')),
  student_feedback text not null default '' check (length(student_feedback) <= 4000),
  responded_at timestamptz,
  withdrawn boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  request_fingerprint text not null,
  version integer not null default 0,
  check (tuition_amount is null or (tuition_source_url is not null and tuition_source_url ~ '^https://[^[:space:]]+$' and tuition_checked_on is not null)),
  check (scholarship_notes = '' or (scholarship_source_url is not null and scholarship_source_url ~ '^https://[^[:space:]]+$' and scholarship_checked_on is not null))
  ,check (tuition_source_url is null or tuition_source_url ~ '^https://[^[:space:]]+$')
  ,check (scholarship_source_url is null or scholarship_source_url ~ '^https://[^[:space:]]+$')
);
create index on public.student_placement_recommendations(student_id, created_at desc);
create unique index placement_one_active_course on public.student_placement_recommendations(student_id, program_id) where not withdrawn;
create index on public.student_placement_cases(status, submitted_at);

-- The private helpers use trusted database role membership plus tenant and active
-- profile checks, never user-editable signup metadata. They return no student data.
create or replace function private.placement_staff(p_student_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.students s join public.profiles p on p.id = auth.uid()
    where s.id = p_student_id and p.active is true and s.tenant_id = p.tenant_id
      and exists(select 1 from public.user_roles r where r.user_id=p.id and r.role::text in ('admin','staff')))
$$;
create or replace function private.placement_owner(p_student_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.students s join public.profiles p on p.id = s.profile_id
    where s.id = p_student_id and p.id = auth.uid() and p.active is true and p.role::text = 'student'
      and s.archived_at is null)
$$;
revoke all on function private.placement_staff(uuid), private.placement_owner(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.placement_staff(uuid), private.placement_owner(uuid) to authenticated;
alter table public.student_placement_cases enable row level security;
alter table public.student_placement_recommendations enable row level security;
revoke all on public.student_placement_cases, public.student_placement_recommendations from public, anon, authenticated;
grant select on public.student_placement_cases, public.student_placement_recommendations to authenticated;
grant all on public.student_placement_cases, public.student_placement_recommendations to service_role;
create policy placement_case_read on public.student_placement_cases for select to authenticated
  using (private.placement_owner(student_id) or private.placement_staff(student_id));
create policy placement_recommendation_read on public.student_placement_recommendations for select to authenticated
  using (private.placement_staff(student_id) or (not withdrawn and private.placement_owner(student_id)));

create or replace function public.save_student_placement(p_student_id uuid, p_preferences jsonb, p_submit boolean, p_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.student_placement_cases; countries text[];
begin
  if not private.placement_owner(p_student_id) then raise exception 'Access denied' using errcode='42501'; end if;
  if jsonb_typeof(p_preferences->'preferred_countries') is distinct from 'array' then raise exception 'Choose your preferred destinations'; end if;
  select array_agg(distinct btrim(value)) into countries from jsonb_array_elements_text(p_preferences->'preferred_countries');
  if cardinality(countries) is null or cardinality(countries) = 0 or exists(select 1 from unnest(countries) t where t is null or length(t) not between 2 and 80) then raise exception 'Choose your preferred destinations'; end if;
  if length(trim(coalesce(p_preferences->>'intended_subject',''))) = 0 then raise exception 'Tell us your intended subject'; end if;
  if jsonb_typeof(p_preferences->'scholarship_interest') is distinct from 'boolean' then raise exception 'Tell us whether you want scholarship research'; end if;
  if nullif(p_preferences->>'tuition_budget','') is null and length(trim(coalesce(p_preferences->>'budget_notes',''))) = 0 then raise exception 'Give a tuition budget or explain the advice you need'; end if;
  insert into public.student_placement_cases(student_id) values(p_student_id) on conflict do nothing;
  select * into c from public.student_placement_cases where student_id=p_student_id for update;
  if c.version is distinct from p_version then raise exception 'Your study plan changed. Reload before saving.' using errcode='40001'; end if;
  if c.status not in ('draft','changes_requested') then raise exception 'Your plan is under review. Message your adviser about changes.'; end if;
  if p_submit then
    if not exists(select 1 from public.students s where s.id=p_student_id and nullif(trim(s.legal_name),'') is not null and nullif(trim(s.contact_email),'') is not null and nullif(trim(s.nationality),'') is not null) then raise exception 'Complete your name, email and nationality in your profile first'; end if;
    if not exists(select 1 from public.education_records e where e.student_id=p_student_id) and not exists(select 1 from public.students s where s.id=p_student_id and nullif(trim(s.secondary_qualification),'') is not null and nullif(trim(s.secondary_school_name),'') is not null) then raise exception 'Add your education history first'; end if;
    if not exists(select 1 from public.student_documents d where d.student_id=p_student_id and d.document_type::text in ('transcript','degree_certificate') and nullif(d.storage_path,'') is not null and coalesce(d.admin_review_status::text,'') <> 'admin_rejected') then raise exception 'Upload an academic transcript or qualification certificate first'; end if;
  end if;
  update public.student_placement_cases set
    intended_subject=trim(p_preferences->>'intended_subject'), preferred_countries=countries,
    tuition_budget=nullif(p_preferences->>'tuition_budget','')::numeric,
    budget_currency=coalesce(p_preferences->>'budget_currency','USD'),
    budget_notes=coalesce(p_preferences->>'budget_notes',''),
    scholarship_interest=(p_preferences->>'scholarship_interest')::boolean,
    scholarship_background=coalesce(p_preferences->>'scholarship_background',''),
    status=case when p_submit then 'submitted' else c.status end,
    submitted_at=case when p_submit then now() else c.submitted_at end,
    version=version+1, updated_at=now() where student_id=p_student_id returning * into c;
  if p_submit then
    update public.student_placement_recommendations set withdrawn=true, version=version+1 where student_id=p_student_id and not withdrawn;
  end if;
  return to_jsonb(c);
end $$;

create or replace function public.review_student_placement(p_student_id uuid, p_status text, p_notes text, p_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.student_placement_cases;
begin
  if not private.placement_staff(p_student_id) then raise exception 'Access denied' using errcode='42501'; end if;
  select * into c from public.student_placement_cases where student_id=p_student_id for update;
  if not found or c.status='draft' then raise exception 'The student has not submitted a review request'; end if;
  if c.version is distinct from p_version then raise exception 'The review changed. Reload before saving.' using errcode='40001'; end if;
  if p_status not in ('reviewing','changes_requested') or p_status is null then raise exception 'Invalid review status'; end if;
  if p_status='changes_requested' and length(trim(coalesce(p_notes,''))) < 10 then raise exception 'Explain which information the student needs to add'; end if;
  update public.student_placement_cases set status=p_status, review_notes=coalesce(p_notes,''), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now(), version=version+1 where student_id=p_student_id returning * into c;
  return to_jsonb(c);
end $$;

create or replace function public.share_student_placement_recommendation(p_student_id uuid, p_program_id uuid, p_details jsonb, p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.student_placement_cases; r public.student_placement_recommendations; course record; fingerprint text;
begin
  if not private.placement_staff(p_student_id) then raise exception 'Access denied' using errcode='42501'; end if;
  fingerprint := md5(p_details::text || p_program_id::text);
  -- Lock the case first: sharing/review transitions and idempotent retries serialize.
  select * into c from public.student_placement_cases where student_id=p_student_id for update;
  select * into r from public.student_placement_recommendations where id=p_id;
  if found then
    if r.student_id=p_student_id and r.created_by=auth.uid() and r.request_fingerprint=fingerprint then return to_jsonb(r); end if;
    raise exception 'Recommendation request changed. Start a new recommendation.';
  end if;
  if c.status is null or c.status not in ('reviewing','recommendations_ready') then raise exception 'Start reviewing the student before sharing recommendations'; end if;
  select p.name, u.name as university_name, u.country into course from public.programs p join public.universities u on u.id=p.university_id where p.id=p_program_id and p.active is true and u.active is true;
  if not found then raise exception 'Choose an available catalogue course'; end if;
  if nullif(p_details->>'tuition_checked_on','')::date > current_date or nullif(p_details->>'scholarship_checked_on','')::date > current_date then raise exception 'The source-check date cannot be in the future'; end if;
  insert into public.student_placement_recommendations(id,student_id,program_id,program_name,university_name,country,rationale,tuition_amount,tuition_currency,tuition_period,tuition_source_url,tuition_checked_on,scholarship_notes,scholarship_source_url,scholarship_checked_on,created_by,request_fingerprint)
  values(p_id,p_student_id,p_program_id,course.name,course.university_name,course.country,trim(p_details->>'rationale'),nullif(p_details->>'tuition_amount','')::numeric,coalesce(p_details->>'tuition_currency','USD'),coalesce(p_details->>'tuition_period','per_year'),nullif(p_details->>'tuition_source_url',''),nullif(p_details->>'tuition_checked_on','')::date,coalesce(p_details->>'scholarship_notes',''),nullif(p_details->>'scholarship_source_url',''),nullif(p_details->>'scholarship_checked_on','')::date,auth.uid(),fingerprint) returning * into r;
  update public.student_placement_cases set status='recommendations_ready', reviewed_by=auth.uid(), reviewed_at=now(),updated_at=now(),version=version+1 where student_id=p_student_id;
  return to_jsonb(r);
end $$;

create or replace function public.respond_student_placement(p_recommendation_id uuid, p_response text, p_feedback text, p_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.student_placement_recommendations;
begin
  select * into r from public.student_placement_recommendations where id=p_recommendation_id for update;
  if not found or not private.placement_owner(r.student_id) or r.withdrawn then raise exception 'Recommendation unavailable' using errcode='42501'; end if;
  if r.version is distinct from p_version then raise exception 'This option changed. Reload before responding.' using errcode='40001'; end if;
  if p_response is null or p_response not in ('interested','not_suitable','question') then raise exception 'Choose your preference'; end if;
  if p_response='interested' and not exists(select 1 from public.programs p join public.universities u on u.id=p.university_id where p.id=r.program_id and p.active is true and u.active is true) then raise exception 'This catalogue option is no longer available. Ask your adviser to review it.'; end if;
  if p_response in ('not_suitable','question') and length(trim(coalesce(p_feedback,''))) = 0 then raise exception 'Add a question or explain your preference'; end if;
  update public.student_placement_recommendations set response=p_response,student_feedback=coalesce(p_feedback,''),responded_at=now(),version=version+1 where id=p_recommendation_id returning * into r;
  return to_jsonb(r);
end $$;

create or replace function public.withdraw_student_placement_recommendation(p_recommendation_id uuid, p_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.student_placement_recommendations; sid uuid;
begin
  select student_id into sid from public.student_placement_recommendations where id=p_recommendation_id;
  if not private.placement_staff(sid) then raise exception 'Access denied' using errcode='42501'; end if;
  perform 1 from public.student_placement_cases where student_id=sid for update;
  select * into r from public.student_placement_recommendations where id=p_recommendation_id for update;
  if r.version is distinct from p_version then raise exception 'This option changed. Reload before withdrawing.' using errcode='40001'; end if;
  update public.student_placement_recommendations set withdrawn=true,version=version+1 where id=r.id returning * into r;
  if not exists(select 1 from public.student_placement_recommendations where student_id=sid and not withdrawn) then
    update public.student_placement_cases set status='reviewing',version=version+1,updated_at=now() where student_id=sid and status='recommendations_ready';
  end if;
  return to_jsonb(r);
end $$;

revoke all on function public.save_student_placement(uuid,jsonb,boolean,integer), public.review_student_placement(uuid,text,text,integer), public.share_student_placement_recommendation(uuid,uuid,jsonb,uuid), public.respond_student_placement(uuid,text,text,integer), public.withdraw_student_placement_recommendation(uuid,integer) from public, anon;
grant execute on function public.save_student_placement(uuid,jsonb,boolean,integer), public.review_student_placement(uuid,text,text,integer), public.share_student_placement_recommendation(uuid,uuid,jsonb,uuid), public.respond_student_placement(uuid,text,text,integer), public.withdraw_student_placement_recommendation(uuid,integer) to authenticated;
