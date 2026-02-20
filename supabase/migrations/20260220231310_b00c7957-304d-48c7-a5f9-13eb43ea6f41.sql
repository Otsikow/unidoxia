
-- Fix all NO ACTION FK constraints that block user deletion
-- These reference either public.profiles or auth.users
-- We use SET NULL for reviewer/auditor fields (preserves the record, clears the reference)
-- We use CASCADE for ownership fields (user_feedback.user_id)

-- 1. student_documents.admin_reviewed_by → profiles (SET NULL)
ALTER TABLE public.student_documents
  DROP CONSTRAINT student_documents_admin_reviewed_by_fkey;
ALTER TABLE public.student_documents
  ADD CONSTRAINT student_documents_admin_reviewed_by_fkey
  FOREIGN KEY (admin_reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. student_documents.verified_by → profiles (SET NULL)
ALTER TABLE public.student_documents
  DROP CONSTRAINT student_documents_verified_by_fkey;
ALTER TABLE public.student_documents
  ADD CONSTRAINT student_documents_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. conversations.created_by → profiles (SET NULL)
ALTER TABLE public.conversations
  DROP CONSTRAINT conversations_created_by_fkey;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. document_requests.requested_by → profiles (SET NULL)
ALTER TABLE public.document_requests
  DROP CONSTRAINT document_requests_requested_by_fkey;
ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_requested_by_fkey
  FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. document_requests.reviewed_by → profiles (SET NULL)
ALTER TABLE public.document_requests
  DROP CONSTRAINT document_requests_reviewed_by_fkey;
ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. application_reviews.reviewer_id → profiles (SET NULL)
ALTER TABLE public.application_reviews
  DROP CONSTRAINT application_reviews_reviewer_id_fkey;
ALTER TABLE public.application_reviews
  ADD CONSTRAINT application_reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 7. partnership_applications.reviewed_by → auth.users (SET NULL)
ALTER TABLE public.partnership_applications
  DROP CONSTRAINT partnership_applications_reviewed_by_fkey;
ALTER TABLE public.partnership_applications
  ADD CONSTRAINT partnership_applications_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. user_feedback.resolved_by → auth.users (SET NULL)
ALTER TABLE public.user_feedback
  DROP CONSTRAINT user_feedback_resolved_by_fkey;
ALTER TABLE public.user_feedback
  ADD CONSTRAINT user_feedback_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 9. user_feedback.user_id → auth.users (CASCADE - this is an ownership field)
ALTER TABLE public.user_feedback
  DROP CONSTRAINT user_feedback_user_id_fkey;
ALTER TABLE public.user_feedback
  ADD CONSTRAINT user_feedback_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. resource_library.created_by → auth.users (SET NULL)
ALTER TABLE public.resource_library
  DROP CONSTRAINT resource_library_created_by_fkey;
ALTER TABLE public.resource_library
  ADD CONSTRAINT resource_library_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
