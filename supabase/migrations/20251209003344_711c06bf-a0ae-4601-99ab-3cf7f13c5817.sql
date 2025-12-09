-- Drop the old permissive storage policies that allow ANY authenticated user to modify university-media files
DROP POLICY IF EXISTS "University partners can delete their media" ON storage.objects;
DROP POLICY IF EXISTS "University partners can update their media" ON storage.objects;
DROP POLICY IF EXISTS "University partners can upload media" ON storage.objects;