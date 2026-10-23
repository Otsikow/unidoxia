import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SharingAuthorisationConsent } from './SharingAuthorisationConsent';
import { SharingAuthorisationPromptView } from './SharingAuthorisationPrompt';
import {
  SHARING_AUTHORISATION_HEADING,
  SHARING_AUTHORISATION_SMALL_PRINT,
  SHARING_AUTHORISATION_TEXT,
  SHARING_AUTHORISATION_VERSION,
  shouldShowSharingAuthorisationPrompt,
} from '@/lib/sharingAuthorisation';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

afterEach(() => cleanup());

const MIGRATION = 'supabase/migrations/20261103000000_coursefinder_mandatory_registration_fields.sql';

describe('sharing authorisation wording', () => {
  it('uses the approved wording, word for word', () => {
    expect(SHARING_AUTHORISATION_HEADING).toBe('Sharing your application with our partner');
    expect(SHARING_AUTHORISATION_TEXT).toBe(
      'To apply to universities for you, UniDoxia (Global Talent Gateway Ltd) shares your application details with the universities you choose and with our application partner KC Overseas Education Private Limited in India, which runs the CourseFinder portal. KC Overseas uses your details as a separate controller to process your applications. The UK does not treat India as having equivalent data protection laws, so your details may have less legal protection there.',
    );
    expect(SHARING_AUTHORISATION_SMALL_PRINT).toBe(
      'You can withdraw this at any time by emailing info@unidoxia.com. Applications already sent cannot be recalled, and we may not be able to continue them.',
    );
  });

  it('shows its own checkbox, not ticked, with the Privacy Notice linked', () => {
    render(
      <MemoryRouter>
        <SharingAuthorisationConsent id="t" checked={false} onCheckedChange={() => {}} />
      </MemoryRouter>,
    );
    const box = screen.getByRole('checkbox');
    expect(box).not.toBeChecked();
    expect(box).toHaveAttribute('id', 't');
    expect(screen.getByText(/I authorise UniDoxia to share my application details with KC Overseas Education \(India\) and the universities I apply to, so they can process my applications\. I have read the/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/legal/privacy');
    expect(screen.getByRole('heading', { name: SHARING_AUTHORISATION_HEADING })).toBeInTheDocument();
  });

  it('is a separate box from the terms and conditions at submit', () => {
    const source = readFileSync('src/components/application/ReviewSubmitStep.tsx', 'utf8');
    expect(source).toContain('useState(false);\n  // Separate from the terms');
    expect(source).toMatch(/const \[authorisedSharing, setAuthorisedSharing\] = useState\(false\)/);
    expect(source).toContain('disabled={!agreedToTerms || !authorisedSharing');
    expect(source).toContain('await recordSharingAuthorisation();');
  });
});

describe('student prompt', () => {
  it('cannot be saved until the student ticks the box, then saves', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <SharingAuthorisationPromptView onSave={onSave} />
      </MemoryRouter>,
    );
    const save = screen.getByRole('button', { name: 'Save my authorisation' });
    expect(save).toBeDisabled();
    expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });

  it('shows the server refusal instead of pretending it saved', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Only the student can give this authorisation, from their own account.'));
    render(
      <MemoryRouter>
        <SharingAuthorisationPromptView onSave={onSave} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Save my authorisation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only the student can give this authorisation');
  });

  it('shows for a student with a live application and no authorisation only', () => {
    const base = { isStudent: true, isLoading: false, hasLiveApplication: true, authorised: false };
    expect(shouldShowSharingAuthorisationPrompt(base)).toBe(true);
    expect(shouldShowSharingAuthorisationPrompt({ ...base, authorised: true })).toBe(false);
    expect(shouldShowSharingAuthorisationPrompt({ ...base, hasLiveApplication: false })).toBe(false);
    expect(shouldShowSharingAuthorisationPrompt({ ...base, isStudent: false })).toBe(false);
    expect(shouldShowSharingAuthorisationPrompt({ ...base, isLoading: true })).toBe(false);
  });
});

describe('server side', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('records the same wording version as the app', () => {
    expect(sql).toContain(`current_version constant text := '${SHARING_AUTHORISATION_VERSION}';`);
  });

  it('takes no student ID, so it can only record the caller', () => {
    expect(sql).toMatch(/FUNCTION public\.record_sharing_authorisation\(p_wording_version text\)/);
  });

  it('checks the authorisation before the admin override', () => {
    const trigger = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.enforce_application_profile_gate()'));
    const exempt = trigger.indexOf('NEW.coursefinder_gate_exempt IS TRUE');
    const authorisation = trigger.indexOf('NOT public.has_sharing_authorisation(NEW.student_id)');
    const override = trigger.indexOf('application_profile_gate_overrides o WHERE o.application_id = NEW.id');
    expect(exempt).toBeGreaterThan(0);
    expect(authorisation).toBeGreaterThan(exempt);
    expect(override).toBeGreaterThan(authorisation);
  });

  it('includes rollback lines for the new parts', () => {
    for (const line of [
      '-- DROP FUNCTION IF EXISTS public.record_sharing_authorisation(text);',
      '-- DROP FUNCTION IF EXISTS public.withdraw_sharing_authorisation(uuid);',
      '-- DROP TABLE IF EXISTS public.application_sharing_authorisations;',
      '-- DROP FUNCTION IF EXISTS public.has_sharing_authorisation(uuid);',
      '-- DROP FUNCTION IF EXISTS public.guard_application_sharing_authorisations();',
    ]) {
      expect(sql).toContain(line);
    }
  });

  it('the Privacy Notice points to the in-account authorisation', () => {
    const page = readFileSync('src/pages/LegalPrivacy.tsx', 'utf8');
    expect(page).toContain('and only after you have given your authorisation in your UniDoxia account.');
    expect(page).not.toContain('signed authorisation');
  });
});
