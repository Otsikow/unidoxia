-- Representative private-PDF Storage boundary for localhost acceptance only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('student-documents','student-documents',false,10485760,array['application/pdf']);
create policy placement_fixture_document_read on storage.objects for select to authenticated using(bucket_id='student-documents' and exists(select 1 from public.students s where s.id::text=(storage.foldername(name))[1] and (private.placement_owner(s.id) or private.placement_staff(s.id))));
create policy placement_fixture_document_upload on storage.objects for insert to authenticated with check(bucket_id='student-documents' and exists(select 1 from public.students s where s.id::text=(storage.foldername(name))[1] and private.placement_owner(s.id)));
