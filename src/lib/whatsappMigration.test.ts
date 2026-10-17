import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const sql = readFileSync('supabase/migrations/20261103000000_whatsapp_assistant.sql', 'utf8');
describe('WhatsApp migration security contracts (static, not a PostgreSQL execution)', () => {
  it('does not widen existing students RLS or backfill consent', () => {
    expect(sql).not.toMatch(/CREATE POLICY[^;]+ON\s+(?:public\.)?students/i);
    expect(sql).toContain('whatsapp_opt_in boolean NOT NULL DEFAULT false');
    expect(sql).not.toMatch(/UPDATE\s+public\.students\s+SET\s+whatsapp_opt_in\s*=\s*true/i);
    expect(sql).toContain('auth.uid() <> OLD.profile_id AND NOT public.is_admin_or_staff(auth.uid())');
  });
  it('locks and validates single-use, unexpired and number-bound links with an attempt limit', () => {
    expect(sql).toContain('WHERE id = p_contact FOR UPDATE');
    expect(sql).toContain("WHERE code = p_code AND used_at IS NULL AND expires_at > now() FOR UPDATE");
    expect(sql).toContain("regexp_replace(COALESCE(whatsapp_number,''), '[^0-9]', '', 'g') = c.wa_id FOR UPDATE");
    expect(sql).toContain('c.link_attempts >= 5');
    expect(sql).toContain('UPDATE public.whatsapp_link_codes SET used_at = now() WHERE id = l.id');
  });
  it('restricts privileged RPCs and fixes their search path', () => {
    for (const signature of ['whatsapp_consume_link(uuid,text)','whatsapp_ingest(text,text,text,text,timestamptz)','whatsapp_apply_consent(uuid,boolean)','whatsapp_notify_handover(uuid,text)']) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC, anon, authenticated;`);
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${signature} TO service_role;`);
    }
    const definers = sql.split('SECURITY DEFINER').slice(1);
    expect(definers.length).toBeGreaterThan(5);
    expect(definers.every(part => part.trimStart().startsWith('SET search_path = public'))).toBe(true);
  });
  it('uses idempotent tables/policies and transactionally claims message IDs', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.whatsapp_contacts');
    expect(sql).toContain('meta_message_id text UNIQUE');
    expect(sql).toContain("pg_advisory_xact_lock(hashtextextended(p_wa_id, 0))");
    expect(sql).toContain("RETURN jsonb_build_object('duplicate',true)");
  });
  it('limits direct writes to unread_count and retains existing auth/application behaviour', () => {
    expect(sql).toContain('GRANT UPDATE (unread_count) ON public.whatsapp_conversations TO authenticated');
    expect(sql).not.toContain('GRANT SELECT, UPDATE');
    expect(sql).not.toMatch(/CREATE POLICY[^;]+ON public\.(students|applications)/i);
    expect(sql).not.toMatch(/CREATE (?:OR REPLACE FUNCTION public\.handle_new_user|TRIGGER[^;]+ON public\.applications)/i);
    expect(sql).toContain('LANGUAGE plpgsql SECURITY INVOKER');
  });
  it('keeps START separate from update and marketing consent, and captures signup once', () => {
    const consent = sql.split('FUNCTION public.whatsapp_apply_consent(p_contact')[1].split('END $$;')[0];
    expect(consent).toContain('IF NOT p_opt_in AND c.linked_user_id IS NOT NULL');
    expect(consent).toContain('whatsapp_opt_in = false');
    expect(sql).toContain('service_resumed_at');
    expect(sql).not.toContain('opted_in_at');
    expect(sql).not.toMatch(/SET[^;]*marketing_consent_at\s*=/i);
    expect(sql).toContain('s.whatsapp_signup_consent_checked_at IS NOT NULL');
    expect(sql).toContain('IF s.whatsapp_opt_in_at IS NOT NULL OR s.whatsapp_opt_out_at IS NOT NULL THEN RETURN');
    expect(sql).toContain("PERFORM public.whatsapp_set_preferences(meta->>'phone', true)");
  });
  it('bounds untrusted handovers and reserves automatic reply capacity under a row lock', () => {
    expect(sql).toContain("created_at > now() - interval '1 hour'");
    expect(sql).toContain('>= 5 THEN');
    expect(sql).toContain("'[[:cntrl:]]', ' ', 'g')),2000)");
    expect(sql).toContain('cardinality(times) >= 10');
    expect(sql).toContain("WHERE id = p_conversation AND mode = 'assistant'");
    expect(sql).toContain('IF NOT FOUND THEN RETURN false; END IF;');
  });
  it('purges expired data while retaining opt-out records and schedules conditionally', () => {
    expect(sql).toContain('whatsapp_purge_expired() RETURNS void');
    expect(sql).toContain("m.created_at < now() - interval '12 months'");
    expect(sql).toContain('(c.retain_until IS NULL OR c.retain_until <= now())');
    expect(sql).toContain("created_at < now() - interval '30 days'");
    expect(sql).not.toContain('DELETE FROM public.whatsapp_contacts');
    expect(sql).toContain("IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')");
    expect(sql).toContain("'30 3 * * *'");
    expect(sql).toContain('RAISE NOTICE');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.whatsapp_purge_expired() FROM PUBLIC, anon, authenticated');
  });

});
