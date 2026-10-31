import { useState } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PersonalInfoStep from './PersonalInfoStep';
import { RESIDENCE_COUNTRIES } from '@/lib/residenceCountries';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

function Form({ nationality = '' }: { nationality?: string }) {
  const [data, setData] = useState({
    fullName: 'Test Student', email: 'student@example.com', phone: '+233501234567',
    whatsappNumber: '+233501234567', dateOfBirth: '2000-10-15', nationality,
    passportNumber: '', currentCountry: 'Ghana', homeAddress: '', correspondentAddress: '',
  });
  return <PersonalInfoStep data={data} onChange={setData} onNext={vi.fn()}
    emergencyContact={{ fullName: '', relationship: '', email: '', phone: '', country: '' }}
    onEmergencyContactChange={vi.fn()} />;
}

describe('Application nationality selection', () => {
  it('offers the full country list, including African countries and both alphabetical ends', async () => {
    const user = userEvent.setup();
    render(<Form />);
    await act(async () => { await user.click(screen.getByRole('combobox', { name: 'Nationality *' })); });
    expect(screen.getAllByRole('option')).toHaveLength(RESIDENCE_COUNTRIES.length);
    for (const country of ['Afghanistan', 'Ghana', 'Nigeria', 'Kenya', 'Zimbabwe']) {
      expect(screen.getByRole('option', { name: country })).toBeInTheDocument();
    }
  });

  it('searches case-insensitively, saves Ghana in the form and closes the list', async () => {
    const user = userEvent.setup();
    render(<Form />);
    await act(async () => { await user.click(screen.getByRole('combobox', { name: 'Nationality *' })); });
    await act(async () => { await user.type(screen.getByRole('combobox', { name: 'Search nationality countries' }), 'gHa'); });
    expect(screen.queryByRole('option', { name: 'Germany' })).not.toBeInTheDocument();
    await act(async () => { await user.click(screen.getByRole('option', { name: 'Ghana' })); });
    expect(screen.getByRole('combobox', { name: 'Nationality *' })).toHaveTextContent('Ghana');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Current Country *')).toHaveValue('Ghana');
  });

  it('supports keyboard selection and starts with a fresh search when reopened', async () => {
    const user = userEvent.setup();
    render(<Form />);
    await act(async () => { await user.click(screen.getByRole('combobox', { name: 'Nationality *' })); });
    const search = screen.getByRole('combobox', { name: 'Search nationality countries' });
    await act(async () => { await user.type(search, 'Zimbabwe'); });
    await act(async () => { await user.keyboard('{ArrowDown}{Enter}'); });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Nationality *' })).toHaveTextContent('Zimbabwe');
    await act(async () => { await user.click(screen.getByRole('combobox', { name: 'Nationality *' })); });
    expect(screen.getByRole('combobox', { name: 'Search nationality countries' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Ghana' })).toBeInTheDocument();
  });

  it('preserves a legacy saved nationality when search has no results or is dismissed', async () => {
    const user = userEvent.setup();
    render(<Form nationality="Ghanaian" />);
    await act(async () => { await user.click(screen.getByRole('combobox', { name: 'Nationality *' })); });
    await act(async () => { await user.type(screen.getByRole('combobox', { name: 'Search nationality countries' }), 'zzzzzz'); });
    expect(screen.getByText('No countries found. Try another search.')).toBeInTheDocument();
    await act(async () => { await user.keyboard('{Escape}'); });
    expect(screen.getByRole('combobox', { name: 'Nationality *' })).toHaveTextContent('Ghanaian');
  });
});
