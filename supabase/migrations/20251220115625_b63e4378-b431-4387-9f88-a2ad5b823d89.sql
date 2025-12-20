-- Drop the existing status check constraint
ALTER TABLE public.document_requests DROP CONSTRAINT IF EXISTS document_requests_status_check;

-- Recreate the constraint with 'received' added to the allowed statuses
ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_status_check
  CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'received'));