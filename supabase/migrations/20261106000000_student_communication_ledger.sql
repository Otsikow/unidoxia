begin;
-- Private operational communication audit. Client writes are deliberately absent.
create table if not exists public.student_communications (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id),
  student_id uuid not null references public.students(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  channel text not null check (channel in ('email','whatsapp_launch','note')),
  status text not null check (status in ('pending','accepted','failed','external_launch','recorded')),
  recipient text,
  subject text not null default '' check (length(subject) <= 200),
  body text not null check (length(body) between 1 and 12000),
  signature text not null default E'Best regards,\nUniDoxia Team\ninfo@unidoxia.com\nhttps://unidoxia.com',
  provider_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_communications_history_idx on public.student_communications(tenant_id, student_id, created_at desc, id);
create index if not exists student_communications_actor_rate_idx on public.student_communications(author_id, channel, created_at desc);
create index if not exists student_communications_student_fk_idx on public.student_communications(student_id);
create index if not exists student_communications_application_fk_idx on public.student_communications(application_id) where application_id is not null;
alter table public.student_communications enable row level security;
revoke all on public.student_communications from anon, authenticated;
grant select on public.student_communications to authenticated;
grant all on public.student_communications to service_role;
drop policy if exists "Staff read their tenant communication audit" on public.student_communications;
create policy "Staff read their tenant communication audit" on public.student_communications
for select to authenticated using (exists (
  select 1 from public.profiles p where p.id = (select auth.uid())
  and p.tenant_id = student_communications.tenant_id
  and p.role in ('admin','staff') and p.active is true
));
comment on table public.student_communications is 'Operational student communications. Accepted means provider acceptance only. WhatsApp launches and notes are manual records; replies are not synchronised.';

commit;
