-- Security linter fixes

-- 1) notifications_backup has RLS enabled but no policies: explicitly deny all access.
alter table public.notifications_backup enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='notifications_backup'
      and policyname='Deny all access to notifications_backup'
  ) then
    create policy "Deny all access to notifications_backup"
    on public.notifications_backup
    for all
    using (false)
    with check (false);
  end if;
end $$;

-- 2) Fix mutable search_path warning for update_conversations_updated_at
create or replace function public.update_conversations_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;