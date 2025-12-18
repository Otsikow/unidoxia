-- Migration: Add draft status to programs table
-- This allows universities to save incomplete courses as drafts

-- Add is_draft column to programs table
ALTER TABLE programs
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN programs.is_draft IS 'Indicates if the program is a draft (incomplete) that is not yet published';

-- Create an index for filtering drafts
CREATE INDEX IF NOT EXISTS idx_programs_is_draft ON programs(is_draft);

-- Update RLS policies to handle drafts
-- Drafts should only be visible to the university that created them

-- Drop existing select policy if it exists and recreate with draft handling
DROP POLICY IF EXISTS "Programs are viewable by tenant users" ON programs;

CREATE POLICY "Programs are viewable by tenant users"
ON programs FOR SELECT
USING (
  -- Published programs (not drafts) are visible to all tenant users
  (NOT COALESCE(is_draft, FALSE) AND tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ))
  OR
  -- Drafts are only visible to university users who own them
  (COALESCE(is_draft, FALSE) AND university_id IN (
    SELECT university_id FROM profiles WHERE id = auth.uid()
  ))
  OR
  -- All programs visible to tenant admins
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND tenant_id = programs.tenant_id 
    AND role IN ('admin', 'super_admin')
  )
);
