ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS agreement_signed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS public_partner_display boolean NOT NULL DEFAULT false;

ALTER TABLE public.universities
  ADD CONSTRAINT universities_public_partner_requires_agreement
  CHECK (public_partner_display = false OR agreement_signed_at IS NOT NULL);

CREATE OR REPLACE FUNCTION public.guard_public_partner_display()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND (NEW.public_partner_display OR NEW.agreement_signed_at IS NOT NULL))
     OR (TG_OP = 'UPDATE' AND (NEW.public_partner_display IS DISTINCT FROM OLD.public_partner_display
                               OR NEW.agreement_signed_at IS DISTINCT FROM OLD.agreement_signed_at)) THEN
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin')
       AND NOT (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role)) THEN
      RAISE EXCEPTION 'Only an admin can change public partner display fields';
    END IF;
    IF NEW.agreement_signed_at > now() THEN
      RAISE EXCEPTION 'agreement_signed_at cannot be in the future';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_public_partner_display ON public.universities;
CREATE TRIGGER guard_public_partner_display
  BEFORE INSERT OR UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.guard_public_partner_display();
