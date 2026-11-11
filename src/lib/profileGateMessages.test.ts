import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261111201000_profile_gate_messages_unnamed.sql', 'utf8');
const messages = [...sql.matchAll(/RAISE EXCEPTION '([^']*)'/g)].map((match) => match[1]);

describe('profile gate messages migration', () => {
  it('uses the unnamed student-facing messages', () => {
    expect(sql).toContain(
      "RAISE EXCEPTION 'Sharing authorisation not given. The student must give their sharing authorisation in their own UniDoxia account first.'",
    );
    expect(sql).toContain(
      "RAISE EXCEPTION 'Profile not complete for application processing: % item(s) missing. Please complete the student profile first.', cardinality(missing)",
    );
    expect(sql).toContain("USING ERRCODE = 'check_violation'");
  });

  it('never names the partner in a raised message', () => {
    expect(messages).toHaveLength(2);
    for (const message of messages) {
      expect(message).not.toMatch(/KC Overseas|CourseFinder|Nagpur/i);
    }
    expect(sql).not.toMatch(/KC Overseas|Nagpur/i);
  });

  it('only replaces the function and keeps the existing trigger untouched', () => {
    expect(sql).not.toMatch(/DROP TRIGGER|CREATE TRIGGER/i);
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.enforce_application_profile_gate()');
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.enforce_application_profile_gate() FROM PUBLIC, anon, authenticated;');
  });
});
