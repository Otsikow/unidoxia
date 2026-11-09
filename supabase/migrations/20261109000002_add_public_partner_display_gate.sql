ALTER TABLE public.universities
  ADD COLUMN agreement_signed_at timestamptz NULL,
  ADD COLUMN public_partner_display boolean NOT NULL DEFAULT false;
