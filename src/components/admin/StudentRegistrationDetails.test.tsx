import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentRegistrationDetails } from './StudentRegistrationDetails';

const state = vi.hoisted(() => ({ fail: false }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => state.fail ? { error: new Error('Denied') } : {
            data: { first_name: 'Ama', dependants_travelling: 0, has_visa_refusals: false, secondary_final_grade: 'AAB', work_experience: [{ employer: 'National service', is_current: true }] },
            error: null,
          },
          order: async () => table === 'education_records' ? {
            data: [{ id: 'degree', level: 'degree', institution_name: 'Test University', degree_title: 'Economics', final_grade: 'First' }],
            error: null,
          } : { data: [], error: null },
        }),
      }),
    }),
  },
}));

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><StudentRegistrationDetails studentId="student-1" /></QueryClientProvider>);
}

beforeEach(() => { state.fail = false; });

describe('student registration details', () => {
  it('shows saved answers, including zero, no, education and history', async () => {
    show();
    expect(await screen.findByText('Ama')).toBeVisible();
    expect(screen.getByText('0')).toBeVisible();
    expect(screen.getByText('No')).toBeVisible();
    expect(screen.getByText('AAB')).toBeVisible();
    expect(screen.getByText('National service')).toBeVisible();
    expect(screen.getByText('Test University')).toBeVisible();
    expect(screen.getByText('First')).toBeVisible();
  });

  it('shows a retry message when access or loading fails', async () => {
    state.fail = true;
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
