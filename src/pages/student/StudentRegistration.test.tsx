import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentLayout from '@/components/layout/StudentLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import StudentRegistration from './StudentRegistration';

const savedProfile = {
  id: 'student-id', coursefinder_fields_required: true,
  first_name: 'Ama', last_name: 'Mensah', contact_phone: '+233201234567', contact_email: 'student@example.test',
  date_of_birth: '2000-01-01', gender: 'Female', marital_status: 'Single', dependants_travelling: 0,
  nationality: 'Ghanaian', citizenship: 'Ghanaian', city_of_birth: 'Accra', country_of_birth: 'Ghana',
  passport_number: 'TEST123', passport_issue_date: '2024-01-01', passport_expiry: '2034-01-01', passport_issue_country: 'Ghana',
  address_line_1: '1 Test Street', country_of_residence: 'Ghana', state_region: 'Greater Accra', city: 'Accra', postal_code: 'GA-123-4567', permanent_same_as_mailing: true,
  emergency_contact_name: 'Test Guardian', emergency_contact_relationship: 'Parent', emergency_contact_phone: '+233201111111', emergency_contact_email: 'guardian@example.test',
  has_other_citizenship: false, lived_or_studied_abroad: false, previous_immigration_applications: false, has_visa_refusals: false,
  country_of_education: 'Ghana', highest_education_level: 'Secondary', secondary_board: 'WAEC', secondary_qualification: 'WASSCE',
  secondary_school_name: 'Test High School', secondary_school_country: 'Ghana', secondary_school_state: 'Greater Accra', secondary_school_city: 'Accra',
  secondary_start_month: 9, secondary_start_year: 2016, secondary_end_month: 6, secondary_end_year: 2019,
  secondary_language_of_instruction: 'English', secondary_grades_band: '80-89%', secondary_final_grade: 'WASSCE aggregate 12',
  waec_scratch_card_pin: 'TEST-PIN', waec_scratch_card_serial: 'TEST-SERIAL', work_experience: [],
};

const state = vi.hoisted(() => ({
  verified: true, onboarded: false, failFinish: false,
  student: {} as Record<string, unknown>, finishWrites: 0,
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({
  user: { id: 'user-id', email: 'student@example.test', email_confirmed_at: state.verified ? '2026-11-11' : null },
  profile: { id: 'user-id', role: 'student', active: true, phone: '+233201234567', onboarded: state.onboarded },
  refreshProfile: async () => { state.onboarded = true; },
  signOut: vi.fn(),
}) }));
vi.mock('@/hooks/useUserRoles', () => ({ useUserRoles: () => ({ roles: ['student'], loading: false }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/layout/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/student/CompleteProfilePrompt', () => ({ CompleteProfilePrompt: () => null }));
vi.mock('@/components/student/SharingAuthorisationPrompt', () => ({ SharingAuthorisationPrompt: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  if (table === 'students') return {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...state.student }, error: null }) }) }),
    update: (patch: object) => ({ eq: async () => {
      state.student = { ...state.student, ...patch };
      return { error: null };
    } }),
  };
  if (table === 'education_records') return {
    select: () => ({ eq: () => Object.assign(Promise.resolve({ data: [], error: null }), {
      order: async () => ({ data: [], error: null }),
    }) }),
  };
  if (table === 'profiles') return {
    update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ single: async () => {
      state.finishWrites += 1;
      return { error: state.failFinish ? new Error('Write failed') : null };
    } }) }) }) }),
  };
  throw new Error(`Unexpected test table: ${table}`);
} } }));

function DocumentsDestination() {
  const { search, hash } = useLocation();
  return <h1>Documents {search}{hash}</h1>;
}

function open(path = '/student/documents?from=signup#uploads') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/verify-email" element={<h1>Verify your email</h1>} />
      <Route path="/student/onboarding" element={<ProtectedRoute><StudentRegistration /></ProtectedRoute>} />
      <Route path="/student" element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
        <Route path="documents" element={<DocumentsDestination />} />
      </Route>
    </Routes>
  </MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  state.verified = true;
  state.onboarded = false;
  state.failFinish = false;
  state.finishWrites = 0;
  state.student = { ...savedProfile };
});

describe('student registration', () => {
  it('waits for email verification before showing profile fields', async () => {
    state.verified = false;
    open('/student/onboarding');
    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeVisible();
    expect(screen.queryByLabelText(/Passport number/)).not.toBeInTheDocument();
  });

  it('saves personal and conditional academic details, then returns to the requested destination', async () => {
    state.student.date_of_birth = null;
    state.student.waec_scratch_card_pin = null;
    const browser = userEvent.setup();
    const click = (element: HTMLElement) => act(async () => { await browser.click(element); });
    open();
    const next = await screen.findByRole('button', { name: 'Continue to education' });
    expect(next).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: '2000-01-01' } });
    await click(screen.getByRole('button', { name: 'Save profile details' }));
    await waitFor(() => expect(next).toBeEnabled());
    expect(state.student.date_of_birth).toBe('2000-01-01');
    await click(next);

    const finish = screen.getByRole('button', { name: 'Finish registration' });
    expect(finish).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/scratch-card PIN/), { target: { value: 'TEST-PIN' } });
    await click(screen.getByRole('button', { name: 'Save secondary school details' }));
    await waitFor(() => expect(state.student.waec_scratch_card_pin).toBe('TEST-PIN'));
    expect(finish).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Activity or employer/), { target: { value: 'National Service' } });
    fireEvent.change(screen.getByLabelText('From *'), { target: { value: '2019-08-01' } });
    await click(screen.getByRole('checkbox', { name: 'I am still doing this' }));
    await click(screen.getByRole('button', { name: 'Add to history' }));
    await waitFor(() => expect(finish).toBeEnabled());

    state.failFinish = true;
    await click(finish);
    expect(await screen.findByRole('alert')).toHaveTextContent('Your saved details are still on file');
    expect(screen.queryByRole('heading', { name: /Documents/ })).not.toBeInTheDocument();
    state.failFinish = false;
    await click(finish);
    expect(await screen.findByRole('heading', { name: 'Documents ?from=signup#uploads' })).toBeVisible();
    expect(state.finishWrites).toBe(2);
  });

  it.each(['legacy', 'completed'])('does not stop %s accounts', async (account) => {
    if (account === 'legacy') state.student.coursefinder_fields_required = false;
    else state.onboarded = true;
    open();
    expect(await screen.findByRole('heading', { name: /Documents/ })).toBeVisible();
    expect(state.finishWrites).toBe(0);
  });
});
