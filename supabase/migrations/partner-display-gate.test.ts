import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20261109000002_add_public_partner_display_gate.sql"), "utf8");

describe("public partner display gate migration", () => {
  it("adds both columns idempotently with safe defaults and no backfill", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS agreement_signed_at timestamptz NULL");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS public_partner_display boolean NOT NULL DEFAULT false");
    expect(sql).not.toMatch(/UPDATE\s+public\.universities/i);
  });

  it("requires a signed agreement before public display is allowed", () => {
    expect(sql).toContain("ADD CONSTRAINT universities_public_partner_requires_agreement");
    expect(sql).toContain("CHECK (public_partner_display = false OR agreement_signed_at IS NOT NULL)");
  });

  it("guards both fields with an admin-only trigger that rejects future agreement dates", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.guard_public_partner_display()");
    expect(sql).toContain("public.has_role(auth.uid(), 'admin'::app_role)");
    expect(sql).toContain("current_user NOT IN ('postgres', 'service_role', 'supabase_admin')");
    expect(sql).toContain("NEW.agreement_signed_at > now()");
    expect(sql).toMatch(/CREATE TRIGGER guard_public_partner_display\s+BEFORE INSERT OR UPDATE ON public\.universities\s+FOR EACH ROW EXECUTE FUNCTION public\.guard_public_partner_display\(\);/);
  });

  it("does not weaken RLS", () => {
    expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });
});
