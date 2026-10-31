-- Receive an owned request without granting students general request UPDATE access.
-- No existing requests/files are changed by this forward migration.
begin;
create or replace function public.submit_student_document_request(
  p_request_id uuid, p_document_id uuid, p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path = public set row_security = off
as $$
declare
  v_request public.document_requests%rowtype;
  v_doc record;
  v_type text;
  v_expected_type text;
  v_size bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to submit this document request' using errcode='42501';
  end if;
  select r.* into v_request
  from public.document_requests r join public.students s on s.id=r.student_id
  join public.profiles p on p.id=s.profile_id
  where r.id=p_request_id and p.id=auth.uid() and p.active is true
  for update of r;
  if not found then
    raise exception 'Document request unavailable for this account' using errcode='42501';
  end if;
  select d.*,a.student_id,a.tenant_id as application_tenant,s.tenant_id as student_tenant,u.tenant_id as university_tenant
  into v_doc from public.application_documents d
  join public.applications a on a.id=d.application_id
  join public.students s on s.id=a.student_id
  left join public.programs pr on pr.id=a.program_id
  left join public.universities u on u.id=pr.university_id
  where d.id=p_document_id and a.student_id=v_request.student_id and s.profile_id=auth.uid()
    and (a.tenant_id=s.tenant_id or a.tenant_id=pr.tenant_id or a.tenant_id=u.tenant_id)
  for share of d;
  if not found then
    raise exception 'Saved application file unavailable for this request' using errcode='42501';
  end if;
  if v_request.tenant_id is distinct from v_doc.student_tenant
     and v_request.tenant_id is distinct from v_doc.university_tenant then
    raise exception 'This file does not belong to the requesting workspace' using errcode='42501';
  end if;
  if split_part(v_doc.storage_path,'/',1) <> v_doc.application_id::text
     or v_doc.storage_path ~ '(^|/)\.\.(/|$)' or v_doc.storage_path ~ '[?#%]' or position(chr(92) in v_doc.storage_path)>0 then
    raise exception 'Invalid private application file path' using errcode='22023';
  end if;
  v_type:=regexp_replace(lower(v_request.document_type),'[\s_-]+','','g');
  v_expected_type:=case
    when v_type in ('passport','passportphotopage','passportbiopage','passportbiodatapage') then 'passport'
    when v_type in ('transcript','academictranscript') then 'transcript'
    when v_type in ('ielts','ieltsscore') then 'ielts'
    when v_type in ('toefl','toeflscore') then 'toefl'
    when v_type in ('sop','personalstatement','statementofpurpose') then 'sop'
    when v_type in ('cv','resume','cvresume') then 'cv'
    when v_type in ('lor','referenceletter','referenceletter1','referenceletter2','recommendation','letterofrecommendation') then 'lor'
    when v_type='portfolio' then 'portfolio'
    else 'other' end;
  if v_doc.document_type::text<>v_expected_type
    or (v_type in ('passportphoto','passportstylephoto','photo','photograph') and left(split_part(v_doc.storage_path,'/',2),15)<>'passport_photo_') then
    raise exception 'The saved file does not match the requested document type' using errcode='22023';
  end if;
  if v_doc.file_size not between 1 and 10485760 or v_doc.mime_type not in (
    'application/pdf','image/jpeg','image/jpg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception 'The saved document format or size is not supported' using errcode='22023';
  end if;
  select case when o.metadata->>'size' ~ '^[0-9]{1,12}$' then (o.metadata->>'size')::bigint else null end
  into v_size from storage.objects o where o.bucket_id='application-documents' and o.name=v_doc.storage_path
  for share of o;
  if not found or v_size is distinct from v_doc.file_size::bigint then
    raise exception 'The private file is missing or its saved size could not be confirmed' using errcode='22023';
  end if;
  -- Lost response: same operation returns its existing receipt, never overwrites a review.
  if v_request.status in ('received','submitted') and v_request.storage_path=v_doc.storage_path then
    return jsonb_build_object('id',v_request.id,'status',v_request.status,'storage_path',v_request.storage_path);
  end if;
  if v_request.status not in ('pending','rejected') or v_request.status is null then
    raise exception 'This request has already changed or been reviewed. Refresh before submitting.' using errcode='PT409';
  end if;
  if v_request.updated_at is distinct from p_expected_updated_at then
    raise exception 'The document request changed. Refresh before submitting.' using errcode='PT409';
  end if;
  update public.document_requests set status='received',storage_path=v_doc.storage_path,
    document_url=null,file_url=null,uploaded_file_url=null,submitted_at=now(),reviewed_at=null,reviewed_by=null
  where id=v_request.id;
  -- Receipt is not approval: application_documents verification fields are untouched.
  return jsonb_build_object('id',v_request.id,'status','received','storage_path',v_doc.storage_path);
end;
$$;
revoke all on function public.submit_student_document_request(uuid,uuid,timestamptz) from public,anon,service_role;
grant execute on function public.submit_student_document_request(uuid,uuid,timestamptz) to authenticated;
notify pgrst,'reload schema';
commit;
