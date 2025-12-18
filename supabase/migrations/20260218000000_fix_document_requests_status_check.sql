-- Fix document_requests status check constraint
-- The original constraint only allowed ('pending', 'submitted', 'approved', 'rejected')
-- but the UI uses 'received' status when marking documents as received.
-- This migration updates the constraint to include 'received' as a valid status.

BEGIN;

-- Drop the existing check constraint
ALTER TABLE public.document_requests
  DROP CONSTRAINT IF EXISTS document_requests_status_check;

-- Add the updated check constraint with 'received' included
ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_status_check 
  CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'received'));

COMMIT;
