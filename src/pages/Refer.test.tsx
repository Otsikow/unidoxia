import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import Refer from './Refer';
import {
  REFERRAL_HEADLINE_MODE,
  ReferralHeadlineMode,
  buildReferralMessage,
  buildReferralWhatsAppUrl,
  getReferralHeadline,
} from '@/config/referral';

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
  vi.restoreAllMocks();
});

const renderAt = (mode?: ReferralHeadlineMode) => {
  const router = createMemoryRouter(
    [{ path: '/refer', element: <Refer headlineMode={mode} /> }],
    { initialEntries: ['/refer'] },
  );
  return render(<RouterProvider router={router} />);
};

describe('Refer & Earn page', () => {
  it('is registered as the /refer route in App.tsx', () => {
    const app = fs.readFileSync('src/App.tsx', 'utf8');
    expect(app).toMatch(/<Route path="\/refer" element={<PublicLayout><Refer \/><\/PublicLayout>} \/>/);
  });

  it('renders with the no-figure headline by default, the reward table and the terms', () => {
    expect(REFERRAL_HEADLINE_MODE).toBe('no-figure');
    renderAt();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Earn a reward when your friend enrols');
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('£500');
    expect(screen.getByText('Commission UniDoxia receives for the student')).toBeInTheDocument();
    expect(screen.getByText('UniDoxia Refer & Earn: terms')).toBeInTheDocument();
    expect(screen.getByText(/Nothing is saved on this website/)).toBeInTheDocument();
    expect(document.title).toBe('Refer a Friend and Earn a Reward | UniDoxia');
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://unidoxia.com/refer');
  });

  it('switches to the £500 headline when the config mode is £500', () => {
    expect(getReferralHeadline('£500').title).toBe('Earn up to £500 when your friend enrols');
    renderAt('£500');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Earn up to £500 when your friend enrols');
    expect(screen.getByText(/^Refer a friend to UniDoxia\. The amount depends on the course and university/)).toBeInTheDocument();
  });

  it('builds an encoded wa.me URL with the entered details', () => {
    const details = { referrerName: ' Ama & Kofi ', referrerContact: '+44 7700 900123', friendFirstName: 'Zoë' };
    const url = buildReferralWhatsAppUrl(details);
    expect(url.startsWith('https://wa.me/447360961803?text=')).toBe(true);
    const text = url.split('?text=')[1];
    expect(text).not.toMatch(/[ &+\n]/);
    expect(decodeURIComponent(text)).toBe(buildReferralMessage(details));
    expect(decodeURIComponent(text)).toContain('My name: Ama & Kofi\n');
    expect(decodeURIComponent(text)).toContain('My email or WhatsApp: +44 7700 900123');
    expect(decodeURIComponent(text)).toContain("My friend's first name: Zoë");
    expect(buildReferralWhatsAppUrl()).toMatch(/^https:\/\/wa\.me\/447360961803\?text=Hello%20UniDoxia/);
  });

  it('keeps submit disabled until details and both consents are given, then opens WhatsApp', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderAt();
    const submit = screen.getByRole('button', { name: /Send referral on WhatsApp/ });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ama' } });
    fireEvent.change(screen.getByLabelText('Your email or WhatsApp number'), { target: { value: 'ama@example.com' } });
    fireEvent.change(screen.getByLabelText("Your friend's first name"), { target: { value: 'Kofi' } });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /18 or over/ }));
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /My friend has agreed/ }));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(open).toHaveBeenCalledWith(
      buildReferralWhatsAppUrl({ referrerName: 'Ama', referrerContact: 'ama@example.com', friendFirstName: 'Kofi' }),
      '_blank',
      'noopener,noreferrer',
    );
    expect(screen.getByRole('link', { name: /Chat with UniDoxia on WhatsApp/ })).toHaveAttribute(
      'href',
      buildReferralWhatsAppUrl(),
    );
  });
});
