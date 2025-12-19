-- Create enum for student document review workflow
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_document_status') THEN
    CREATE TYPE student_document_status AS ENUM (
      'awaiting_admin_review',
      'admin_rejected',
      'ready_for_university_review',
      'university_reviewed'
    );
  END IF;
END
$$;

-- Add status column to student_documents with default awaiting_admin_review
ALTER TABLE public.student_documents
ADD COLUMN IF NOT EXISTS status student_document_status NOT NULL DEFAULT 'awaiting_admin_review';
