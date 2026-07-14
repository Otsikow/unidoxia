
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS website_lead_id UUID REFERENCES public.website_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_website_lead_id ON public.tasks(website_lead_id);
