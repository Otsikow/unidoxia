-- Refresh storage bucket metadata to keep Supabase dashboard in sync
-- Issue: Storage buckets show stale "Updated" dates in the dashboard, making it
-- look like uploads and avatar changes aren't being applied. We upsert the
-- bucket definitions with a refreshed updated_at timestamp so the dashboard
-- reflects the latest configuration.

WITH bucket_definitions AS (
  SELECT * FROM (VALUES
    ('student-documents',        'student-documents',        false, 10485760::bigint, ARRAY['application/pdf','image/jpeg','image/png','image/jpg','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]),
    ('message-attachments',      'message-attachments',      true,  20971520::bigint, ARRAY['image/jpeg','image/png','image/jpg','image/gif','image/webp','video/mp4','video/quicktime','video/webm','audio/mpeg','audio/wav','audio/webm','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','text/csv','application/zip','application/x-rar-compressed','application/json']::text[]),
    ('chat-uploads',             'chat-uploads',             true,  10485760::bigint, ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']::text[]),
    ('resources',                'resources',                true,  52428800::bigint, ARRAY['application/pdf','image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/webm','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]),
    ('application-documents',    'application-documents',    false, 10485760::bigint, ARRAY['application/pdf','image/jpeg','image/png','image/jpg','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]),
    ('university-media',         'university-media',         true,  10485760::bigint, ARRAY['image/jpeg','image/png','image/jpg','image/webp','image/gif']::text[]),
    ('partnership-documents',    'partnership-documents',    false, 10485760::bigint, ARRAY['application/pdf','image/jpeg','image/png','image/jpg','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]),
    ('public',                   'public',                   true,  10485760::bigint, ARRAY['image/jpeg','image/png','image/jpg','image/webp','image/gif']::text[]),
    ('profile-photos',           'profile-photos',           true,  5242880::bigint,  ARRAY['image/jpeg','image/png','image/jpg','image/webp','image/gif']::text[])
  ) AS t(id, name, public, file_size_limit, allowed_mime_types)
)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, updated_at)
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  timezone('utc', now()) AS updated_at
FROM bucket_definitions
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = EXCLUDED.updated_at;
