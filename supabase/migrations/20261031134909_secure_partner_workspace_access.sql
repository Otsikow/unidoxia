-- Forward-only security fix. No existing profiles/tenants/universities are changed here.
begin;

-- Same trusted role sources as before, with current active status required.
-- Preserve the deployed argument name for existing named RPC callers.
create or replace function public.is_admin_or_staff(user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select (public.has_role($1, 'admin'::public.app_role) or public.has_role($1, 'staff'::public.app_role))
    and exists (select 1 from public.profiles p where p.id = $1 and p.active is true);
$$;

-- Internal authorization helper: not a separately callable browser RPC.
create or replace function public.can_manage_partner_workspace(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles target
    where target.id = p_profile_id and target.role = 'partner' and target.active is true
      and (auth.role() = 'service_role'
        or target.id = auth.uid()
        or (public.is_admin_or_staff(auth.uid()) and exists (
          select 1 from public.profiles actor
          where actor.id = auth.uid() and actor.tenant_id = target.tenant_id
        )))
  );
$$;
revoke all on function public.can_manage_partner_workspace(uuid) from public, anon, authenticated, service_role;

create or replace function public.partner_needs_isolation(p_profile_id uuid)
returns boolean language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.can_manage_partner_workspace(p_profile_id) then
    raise exception 'Not allowed to manage this partner workspace' using errcode = '42501';
  end if;
  return exists (
    select 1 from public.profiles p join public.tenants t on t.id = p.tenant_id
    where p.id = p_profile_id and p.role = 'partner' and p.active is true
      and (t.slug in ('geg-global','unidoxia','default') or exists (
        select 1 from public.profiles other where other.tenant_id = p.tenant_id
          and other.role = 'partner' and other.id <> p.id
      ))
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.isolate_partner_profile(p_profile_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_new_tenant_id UUID;
  v_new_university_id UUID;
  v_tenant_slug TEXT;
BEGIN
  IF NOT public.can_manage_partner_workspace(p_profile_id) THEN
    RAISE EXCEPTION 'Not allowed to manage this partner workspace' USING ERRCODE = '42501';
  END IF;
  -- Serialize repeats for this partner before evaluating current isolation state.
  SELECT * INTO v_profile FROM public.profiles
  WHERE id = p_profile_id AND role = 'partner' AND active IS TRUE FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  IF NOT public.partner_needs_isolation(p_profile_id) THEN
    IF EXISTS (SELECT 1 FROM public.universities u WHERE u.tenant_id = v_profile.tenant_id) THEN
      RETURN v_profile.tenant_id;
    END IF;
    -- Repair a missing university inside the same guarded transaction.
    v_new_tenant_id := v_profile.tenant_id;
  ELSE
  -- Generate unique tenant slug
  v_tenant_slug := 'university-' || gen_random_uuid()::text;
  
  -- Create a new isolated tenant for this partner
  INSERT INTO public.tenants (name, slug, email_from, active)
  VALUES (
    COALESCE(v_profile.full_name || '''s University', 'University Partner'),
    v_tenant_slug,
    COALESCE(v_profile.email, 'noreply@example.com'),
    true
  )
  RETURNING id INTO v_new_tenant_id;
  
  END IF;

  -- Create a fresh university for this partner's new tenant
  INSERT INTO public.universities (
    tenant_id,
    name,
    country,
    active,
    submission_config_json
  )
  VALUES (
    v_new_tenant_id,
    COALESCE(v_profile.full_name || '''s University', 'University'),
    COALESCE(v_profile.country, 'Unknown'),
    true,
    jsonb_build_object(
      'tagline', NULL,
      'highlights', '[]'::jsonb,
      'contacts', jsonb_build_object(
        'primary', jsonb_build_object(
          'name', v_profile.full_name,
          'email', v_profile.email,
          'phone', v_profile.phone,
          'title', NULL
        )
      ),
      'social', '{}'::jsonb,
      'media', '{}'::jsonb
    )
  )
  RETURNING id INTO v_new_university_id;
  
  -- Update the profile to use the new isolated tenant
  UPDATE public.profiles
  SET tenant_id = v_new_tenant_id
  WHERE id = p_profile_id;
  
  RETURN v_new_tenant_id;
END;
$$;


-- New client entry point: older unguarded deployments have no such RPC.
-- Never fall back to browser inserts or the old endpoint when this is unavailable.
create or replace function public.ensure_partner_workspace(p_profile_id uuid)
returns uuid language sql volatile security invoker set search_path = public
as $$select public.isolate_partner_profile(p_profile_id);$$;
revoke all on function public.ensure_partner_workspace(uuid) from public, anon;
grant execute on function public.ensure_partner_workspace(uuid) to authenticated, service_role;

revoke all on function public.isolate_partner_profile(uuid), public.partner_needs_isolation(uuid) from public, anon;
grant execute on function public.isolate_partner_profile(uuid), public.partner_needs_isolation(uuid) to authenticated, service_role;
notify pgrst, 'reload schema';
commit;
