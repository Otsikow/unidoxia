-- Migration: Add instant_submission field to programs and is_unidoxia_partner to universities
-- Purpose: Enable "Instant Submission" badge for UniDoxia-onboarded courses and partner universities

-- Add instant_submission boolean to programs table
-- This field indicates whether a course/program is fully onboarded inside UniDoxia's internal catalogue
ALTER TABLE programs
ADD COLUMN IF NOT EXISTS instant_submission boolean DEFAULT false;

-- Add is_unidoxia_partner boolean to universities table
-- This field indicates whether a university is an official UniDoxia partner
-- When enabled, all courses from this university will show the Instant Submission badge
ALTER TABLE universities
ADD COLUMN IF NOT EXISTS is_unidoxia_partner boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN programs.instant_submission IS 'Indicates if the program is fully onboarded in UniDoxia internal catalogue for instant submission';
COMMENT ON COLUMN universities.is_unidoxia_partner IS 'Indicates if the university is an official UniDoxia partner - enables instant submission for all their programs';

-- Create index for efficient querying of instant submission programs
CREATE INDEX IF NOT EXISTS idx_programs_instant_submission ON programs(instant_submission) WHERE instant_submission = true;

-- Create index for efficient querying of UniDoxia partner universities
CREATE INDEX IF NOT EXISTS idx_universities_is_unidoxia_partner ON universities(is_unidoxia_partner) WHERE is_unidoxia_partner = true;
