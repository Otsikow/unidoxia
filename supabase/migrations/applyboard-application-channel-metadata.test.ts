import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(process.cwd(), "supabase", "migrations", "20260812170000_add_applyboard_application_channel_metadata.sql"),
  "utf8",
);

const publicSurface = ["src", "public", "supabase/functions"]
  .flatMap((directory) => {
    const output = execFileSync("rg", ["--files", directory, "-g", "*.ts", "-g", "*.tsx", "-g", "*.js", "-g", "*.jsx", "-g", "*.html", "-g", "*.json", "-g", "*.css"], { encoding: "utf8" }).trim();
    return output ? output.split("\n") : [];
  })
  .map((file) => readFileSync(path.join(process.cwd(), file), "utf8"))
  .join("\n");

describe("internal recruitment-platform routing boundary", () => {
  it("stores routing metadata in separate internal tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.internal_university_routing");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.internal_program_routing");
    expect(migration).not.toMatch(/ALTER TABLE public\.universities[\s\S]*ADD COLUMN IF NOT EXISTS applyboard/i);
    expect(migration).not.toMatch(/ALTER TABLE public\.programs[\s\S]*ADD COLUMN IF NOT EXISTS applyboard/i);
  });

  it("denies anonymous access and limits authenticated access to staff", () => {
    expect(migration).toContain("REVOKE ALL ON TABLE public.internal_university_routing FROM anon, authenticated");
    expect(migration).toContain("REVOKE ALL ON TABLE public.internal_program_routing FROM anon, authenticated");
    expect(migration.match(/public\.is_admin_or_staff\(auth\.uid\(\)\)/g)).toHaveLength(4);
    expect(migration).not.toMatch(/GRANT .* ON TABLE public\.internal_(?:university|program)_routing TO anon/i);
  });

  it("keeps public application facts separate from internal routing", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS application_fee_amount");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS scholarship_details");
    expect(migration).not.toMatch(/ADD COLUMN IF NOT EXISTS application_channel/);
    expect(migration).not.toMatch(/ADD COLUMN IF NOT EXISTS commission_verification_status/);
  });

  it("contains no ApplyBoard brand or routing identifiers in public application source", () => {
    expect(publicSurface).not.toMatch(/applyboard/i);
    expect(publicSurface).not.toMatch(/applyboard_(?:available|reference|verified_at|program)/i);
  });
});
