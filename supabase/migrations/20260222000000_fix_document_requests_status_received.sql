-- Fix document_requests status check constraint to include 'received' status
--
-- The original constraint only allowed ('pending', 'submitted', 'approved', 'rejected')
-- but the university dashboard uses 'received' status when marking documents as received.
-- A previous fix migration (20260218) may not have been applied due to timestamp ordering,
-- so this migration ensures the constraint is properly updated.

BEGIN;

-- Drop the existing check constraint (handles both named and unnamed constraints)
DO $$
BEGIN
  -- Try to drop the named constraint first
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'document_requests'
    AND constraint_name = 'document_requests_status_check'
    AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.document_requests DROP CONSTRAINT document_requests_status_check;
  END IF;
END $$;

-- Also handle the case where the constraint might have an auto-generated name
-- by checking for any check constraints on the status column
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find any remaining check constraint on the status column
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'document_requests'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.document_requests DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Add the updated check constraint with 'received' included
ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_status_check
  CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'received'));

COMMIT;
