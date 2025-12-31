-- Add admin review columns to student_documents table
ALTER TABLE public.student_documents
ADD COLUMN IF NOT EXISTS admin_review_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_review_notes text,
ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamptz;

-- Add index for faster filtering by admin review status
CREATE INDEX IF NOT EXISTS idx_student_documents_admin_review_status 
ON public.student_documents(admin_review_status);

-- Create comment explaining statuses
COMMENT ON COLUMN public.student_documents.admin_review_status IS 
'Admin review status: pending, ready_for_university_review, admin_rejected';