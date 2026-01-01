-- Add verification_status to application_documents to support AI verification states
ALTER TABLE application_documents
ADD COLUMN verification_status TEXT CHECK (verification_status IN ('Verified', 'Suspicious', 'Invalid', 'Pending'));

-- Update existing records to default based on 'verified' boolean
UPDATE application_documents
SET verification_status = CASE
  WHEN verified = TRUE THEN 'Verified'
  ELSE 'Pending'
END;
