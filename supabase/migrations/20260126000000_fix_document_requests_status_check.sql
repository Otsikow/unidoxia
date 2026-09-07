-- Fix check constraint for document_requests status to include 'received' and 'verified'
-- This fixes the error "new row for relation 'document_requests' violates check constraint 'document_requests_status_check'"
-- encountered when universities mark a document as "received" in the dashboard.

DO $$
BEGIN
  -- Drop the constraint if it exists (using a safe approach even if name is slightly different in some envs, 
  -- but based on error message it is 'document_requests_status_check')
  ALTER TABLE public.document_requests DROP CONSTRAINT IF EXISTS document_requests_status_check;
  
  -- Re-add the constraint with expanded allowed values
  -- Old values: pending, submitted, approved, rejected
  -- New values: pending, submitted, received, verified, approved, rejected
  ALTER TABLE public.document_requests 
    ADD CONSTRAINT document_requests_status_check 
    CHECK (status IN ('pending', 'submitted', 'received', 'verified', 'approved', 'rejected'));
    
EXCEPTION
  WHEN undefined_object THEN
    -- If the constraint didn't exist, we just create it
    ALTER TABLE public.document_requests 
      ADD CONSTRAINT document_requests_status_check 
      CHECK (status IN ('pending', 'submitted', 'received', 'verified', 'approved', 'rejected'));
END $$;
