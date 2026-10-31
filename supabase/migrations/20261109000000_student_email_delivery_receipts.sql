begin;
-- Provider receipts are separate from send acceptance; never infer a human read/reply.
alter table public.student_communications add column if not exists receipt_tagged boolean not null default false;
alter table public.student_communications add column if not exists delivery_status text;
alter table public.student_communications add column if not exists delivery_event_at timestamptz;
alter table public.student_communications drop constraint if exists student_communications_delivery_status_check;
alter table public.student_communications add constraint student_communications_delivery_status_check
  check (delivery_status is null or delivery_status in ('delivered','delayed','bounced','failed','suppressed','complained'));
create unique index if not exists student_communications_provider_email_idx
  on public.student_communications(provider_id) where channel='email' and provider_id is not null;
create table if not exists public.student_email_delivery_events (
  event_id text primary key check (length(event_id) between 1 and 200),
  communication_id uuid not null references public.student_communications(id) on delete cascade,
  event_type text not null check (event_type in ('email.delivered','email.delivery_delayed','email.bounced','email.failed','email.suppressed','email.complained')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index if not exists student_email_delivery_events_communication_idx
  on public.student_email_delivery_events(communication_id,occurred_at desc);
alter table public.student_email_delivery_events enable row level security;
revoke all on public.student_email_delivery_events from public,anon,authenticated;
revoke all on public.student_email_delivery_events from service_role;
grant select,insert on public.student_email_delivery_events to service_role;

create or replace function public.record_student_email_delivery_event(
  p_event_id text,p_provider_id text,p_event_type text,p_occurred_at timestamptz,
  p_communication_id uuid default null,p_recipient text default null
) returns text language plpgsql security invoker set search_path=public as $$
declare
  v_message public.student_communications%rowtype;
  v_event public.student_email_delivery_events%rowtype;
  v_status text;
  v_rank integer;
  v_previous_rank integer;
begin
  if p_event_id is null or length(p_event_id) not between 1 and 200
    or p_provider_id is null or length(p_provider_id) not between 1 and 200
    or p_occurred_at is null or p_occurred_at > now()+interval '5 minutes' then
    raise exception 'Invalid provider receipt' using errcode='22023';
  end if;
  v_status := case p_event_type when 'email.delivered' then 'delivered'
    when 'email.delivery_delayed' then 'delayed' when 'email.bounced' then 'bounced'
    when 'email.failed' then 'failed' when 'email.suppressed' then 'suppressed'
    when 'email.complained' then 'complained' else null end;
  if v_status is null then raise exception 'Unsupported provider receipt' using errcode='22023'; end if;
  if p_communication_id is not null then
    select * into v_message from public.student_communications
      where id=p_communication_id and channel='email' for update;
  else
    select * into v_message from public.student_communications
      where channel='email' and provider_id=p_provider_id for update;
  end if;
  if not found then return 'ignored'; end if;
  if v_message.provider_id is null then
    -- A signed receipt may arrive before the sender's acceptance write-back.
    -- Recover only an opted-in pending attempt with an exact recipient match.
    if not v_message.receipt_tagged or v_message.status<>'pending'
      or p_recipient is null or lower(trim(p_recipient))<>lower(trim(v_message.recipient))
      or p_occurred_at<v_message.created_at-interval '5 minutes' then
      return 'retry';
    end if;
    update public.student_communications set provider_id=p_provider_id,status='accepted' where id=v_message.id;
  elsif v_message.provider_id<>p_provider_id then
    raise exception 'Provider receipt association conflict' using errcode='22023';
  end if;
  insert into public.student_email_delivery_events(event_id,communication_id,event_type,occurred_at)
    values(p_event_id,v_message.id,p_event_type,p_occurred_at) on conflict(event_id) do nothing;
  if not found then
    select * into v_event from public.student_email_delivery_events where event_id=p_event_id;
    if v_event.communication_id is distinct from v_message.id or v_event.event_type is distinct from p_event_type
      or v_event.occurred_at is distinct from p_occurred_at then
      raise exception 'Provider receipt identifier conflict' using errcode='23505';
    end if;
    return 'duplicate';
  end if;
  v_rank := case v_status when 'complained' then 4 when 'bounced' then 3 when 'failed' then 3
    when 'suppressed' then 3 when 'delivered' then 2 else 1 end;
  v_previous_rank := case v_message.delivery_status when 'complained' then 4 when 'bounced' then 3
    when 'failed' then 3 when 'suppressed' then 3 when 'delivered' then 2 when 'delayed' then 1 else 0 end;
  -- Serialize per message. Older events and weaker outcomes cannot erase a confirmed outcome.
  if (v_message.delivery_event_at is null or p_occurred_at>=v_message.delivery_event_at)
    and v_rank>=v_previous_rank then
    update public.student_communications set delivery_status=v_status,delivery_event_at=p_occurred_at
      where id=v_message.id;
  end if;
  return 'recorded';
end;
$$;
revoke all on function public.record_student_email_delivery_event(text,text,text,timestamptz,uuid,text) from public,anon,authenticated;
grant execute on function public.record_student_email_delivery_event(text,text,text,timestamptz,uuid,text) to service_role;
comment on table public.student_email_delivery_events is 'Signed provider delivery receipt identifiers and states only; no message bodies, recipients, open tracking or reply claims.';
notify pgrst, 'reload schema';
commit;
