-- ============================================================================
-- Ensure message attachments bucket exists for audio and other chat uploads
-- ============================================================================
-- This migration recreates the message-attachments bucket configuration and
-- policies to prevent "Bucket not found" errors when uploading audio messages
-- or other chat attachments.
-- ============================================================================

-- Create or update the message-attachments bucket with proper limits and MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  TRUE,
  20971520, -- 20MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed',
    'application/json'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Refresh storage policies for the bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND polname = 'Message attachments public read'
  ) THEN
    EXECUTE $$CREATE POLICY "Message attachments public read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'message-attachments');$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND polname = 'Authenticated message uploads'
  ) THEN
    EXECUTE $$CREATE POLICY "Authenticated message uploads"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'message-attachments');$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND polname = 'Authenticated message updates'
  ) THEN
    EXECUTE $$CREATE POLICY "Authenticated message updates"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'message-attachments');$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND polname = 'Authenticated message deletes'
  ) THEN
    EXECUTE $$CREATE POLICY "Authenticated message deletes"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'message-attachments');$$;
  END IF;
END;$$;
