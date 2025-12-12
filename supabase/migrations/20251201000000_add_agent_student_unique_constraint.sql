-- Ensure agent-student links can be safely upserted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_student_links_agent_student_key'
  ) THEN
    ALTER TABLE public.agent_student_links
      ADD CONSTRAINT agent_student_links_agent_student_key UNIQUE (agent_id, student_id);
  END IF;
END $$;
