-- ============================================================================
-- Ensure all storage buckets exist with proper configuration
-- ============================================================================
-- Issue: Some storage buckets may not exist in certain environments, causing
-- "Bucket not found" errors when the application attempts to access them.
--
-- This migration ensures all required storage buckets exist with proper
-- configuration and RLS policies.
-- ============================================================================

-- ============================================================================
-- 1. STUDENT-DOCUMENTS BUCKET
-- ============================================================================
-- Used for: Student document uploads (transcripts, certificates, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false, -- Private bucket - requires authentication
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 2. MESSAGE-ATTACHMENTS BUCKET
-- ============================================================================
-- Used for: File attachments in messaging conversations
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true, -- Public for easy URL sharing in chats
  20971520, -- 20MB limit
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

-- ============================================================================
-- 3. CHAT-UPLOADS BUCKET
-- ============================================================================
-- Used for: Zoe AI chat file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-uploads',
  'chat-uploads',
  true, -- Public for easy URL access
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 4. RESOURCES BUCKET
-- ============================================================================
-- Used for: Admin resource library uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resources',
  'resources',
  true, -- Public for resource distribution
  52428800, -- 50MB limit for larger resources
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 5. APPLICATION-DOCUMENTS BUCKET
-- ============================================================================
-- Used for: Application-specific document uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents',
  'application-documents',
  false, -- Private for security
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 6. UNIVERSITY-MEDIA BUCKET
-- ============================================================================
-- Used for: University logos, hero images, program images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'university-media',
  'university-media',
  true, -- Public for website display
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 7. PARTNERSHIP-DOCUMENTS BUCKET
-- ============================================================================
-- Used for: Partnership agreement documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partnership-documents',
  'partnership-documents',
  false, -- Private
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 8. PUBLIC BUCKET
-- ============================================================================
-- Used for: General public assets, blog images, generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public',
  'public',
  true, -- Public
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- SUMMARY:
-- ============================================================================
-- This migration ensures the following buckets exist:
-- 1. student-documents - Private, 10MB, documents
-- 2. message-attachments - Public, 20MB, various media
-- 3. chat-uploads - Public, 10MB, documents/images
-- 4. resources - Public, 50MB, various resources
-- 5. application-documents - Private, 10MB, documents
-- 6. university-media - Public, 10MB, images
-- 7. partnership-documents - Private, 10MB, documents
-- 8. public - Public, 10MB, images
-- 9. profile-photos - Already handled by previous migration
-- ============================================================================
