import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import Refer from './Refer';
import {
  REFERRAL_FIGURE_MODE_PROBLEM,
  REFERRAL_GO_LIVE_CONFIG,
  REFERRAL_HEADLINE_MODE,
  REFERRAL_LIVE_READY,
  REFERRAL_SHOW_IN_FOOTER,
  ReferralHeadlineMode,
  buildReferralMessage,
  buildReferralWhatsAppUrl,
  getReferralGoLiveProblems,
} from '@/config/referral';
import { REFERRAL_FIGURE_HEADLINE } from '@/config/referralFigures';

const V23_SUBTITLE =
  "Refer a friend and earn a reward when they successfully enrol through UniDoxia. We pay only after they enrol and we receive our commission from the university. The amount depends on the course, some courses don't qualify, and we confirm it in writing before your friend applies. 18+.";
const V23_CLAUSE_1 =
  "1. What you can earn. Your reward is 25% of the net commission UniDoxia actually receives for your friend's enrolment, up to a maximum per student that we set. If our commission for a course is below the minimum we set, no reward is due, so some courses don't qualify. Before your friend applies, we confirm in writing whether their course qualifies and the exact amount, and that confirmed amount is what we pay. There is no reward for signing up or applying, only for successful enrolment.";
const V23_REWARD_TEXT =
  "Your reward is a share of the commission UniDoxia receives from the university for your friend's course. Commission differs between universities and courses, so we confirm your reward in writing before your friend applies. Some courses don't qualify.";

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

  it("renders Kojo's v2.3 no-figure page by default", () => {
    expect(REFERRAL_HEADLINE_MODE).toBe('no-figure');
    renderAt();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Earn a reward when your friend enrols');
    expect(screen.getByText(V23_SUBTITLE)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How your reward is worked out' })).toBeInTheDocument();
    expect(screen.getByTestId('how-reward-works')).toHaveTextContent(V23_REWARD_TEXT);
    expect(screen.queryByTestId('reward-table')).not.toBeInTheDocument();
    expect(screen.queryByText('Commission UniDoxia receives for the student')).not.toBeInTheDocument();
    expect(screen.getByText('UniDoxia Refer & Earn: terms')).toBeInTheDocument();
    expect(screen.getByText(/Nothing is saved on this website/)).toBeInTheDocument();
    expect(document.title).toBe('Refer a Friend and Earn a Reward | UniDoxia');
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://unidoxia.com/refer');
  });

  it('renders no £ amount anywhere (not even £500) with the default config', () => {
    renderAt();
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('£');
    expect(text).not.toMatch(/£\s?\d/);
    expect(text).not.toContain('500');
    expect(text).not.toMatch(/capped at|up to £|as shown in the reward table/i);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '').not.toContain('£');
  });

  it('switches to the £500 headline and the £ reward table only when the mode is £500 (figure build)', () => {
    expect(REFERRAL_FIGURE_HEADLINE.title).toBe('Earn up to £500 when your friend enrols');
    renderAt('£500');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Earn up to £500 when your friend enrols');
    expect(screen.getByText(/^Refer a friend to UniDoxia\. The amount depends on the course and university/)).toHaveTextContent(
      'Some courses earn no reward.',
    );
    expect(screen.getByTestId('reward-table')).toHaveTextContent('capped at £500');
    expect(screen.getByText('Commission UniDoxia receives for the student')).toBeInTheDocument();
    expect(screen.queryByTestId('how-reward-works')).not.toBeInTheDocument();
    expect(screen.getByTestId('terms-clause-1')).toHaveTextContent(V23_CLAUSE_1);
    expect(document.body.textContent).not.toContain('as shown in the reward table');
  });

  it("uses Kojo's exact v2.3 clause 1", () => {
    renderAt();
    expect(screen.getByTestId('terms-clause-1').textContent?.replace(/\s+/g, ' ').trim()).toBe(V23_CLAUSE_1);
  });

  it('applies the round 2 wording for clause 4, 4A and clause 13, and the round 3 hero line', () => {
    renderAt();
    const clause4 = screen.getByTestId('terms-clause-4');
    expect(clause4).toHaveTextContent(
      'Use the form on this page (it opens a WhatsApp message to UniDoxia), message us on WhatsApp, or ask your friend to give your name when they first contact UniDoxia.',
    );
    expect(clause4).toHaveTextContent("Only share a friend's details with us if they have agreed.");
    expect(clause4).not.toHaveTextContent(/referral link or code/);
    expect(screen.getByText(/You can introduce friends and share this page, but you must not/)).toBeInTheDocument();
    expect(screen.queryByText(/share our link/)).not.toBeInTheDocument();
    expect(screen.queryByText(/confirmed commission rates for every university/)).not.toBeInTheDocument();
    const heroLine = screen.getByText(/Open to anyone aged 18 or over\./);
    expect(heroLine.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Open to anyone aged 18 or over. Payment is subject to the identity, fraud and sanctions checks in clause 6. Terms below and at unidoxia.com/refer.',
    );
    expect(screen.queryByText(/wherever you live/)).not.toBeInTheDocument();
    expect(screen.queryByText(/anywhere in the world/)).not.toBeInTheDocument();
    const clause13 = screen.getByTestId('terms-clause-13');
    const emailFlag = clause13.querySelector('[data-testid="for-eric"]');
    expect(emailFlag).toHaveTextContent('info@unidoxia.com [for Eric to confirm]');
    expect(emailFlag?.querySelector('a')).toHaveAttribute('href', 'mailto:info@unidoxia.com');
    expect(screen.getByText('[the go-live date]')).toHaveAttribute('data-testid', 'for-eric');
    expect(screen.getByTestId('terms-clause-13').textContent).not.toMatch(/\s\.$/);
  });

  it('uses the Pexels 8199611 photo with alt text and no overlay', () => {
    renderAt();
    const img = screen.getByAltText(/Three smiling students/);
    expect(img.getAttribute('src')).toMatch(/refer-students-campus/);
    expect(img.parentElement?.children).toHaveLength(1);
  });

  it('puts a privacy notice link, a submit hint and a neutral contact field next to the form', () => {
    renderAt();
    const form = screen.getByRole('button', { name: /Send referral on WhatsApp/ }).closest('form') as HTMLFormElement;
    const privacy = within(form).getByRole('link', { name: 'privacy notice' });
    expect(privacy).toHaveAttribute('href', '/legal/privacy');
    expect(form).toHaveTextContent('Your message goes to UniDoxia through WhatsApp. See our privacy notice.');
    expect(within(form).getByText('To send, fill in all 3 fields and tick both boxes.')).toHaveAttribute(
      'id',
      'refer-submit-hint',
    );
    expect(screen.getByRole('button', { name: /Send referral on WhatsApp/ }).getAttribute('aria-describedby')).toContain(
      'refer-submit-hint',
    );
    const contact = screen.getByLabelText('Your email or WhatsApp number');
    expect(contact).toHaveAttribute('autocomplete', 'off');
    expect(contact).toHaveAttribute('inputmode', 'text');
  });

  it('has no visible space before full stops after highlighted placeholders', () => {
    renderAt();
    const terms = document.getElementById('terms')?.textContent ?? '';
    expect(terms).not.toMatch(/\] \./);
  });

  it('keeps the draft and noindex settings on unless go-live is approved', () => {
    expect(getReferralGoLiveProblems()).toEqual([]);
    if (REFERRAL_LIVE_READY) {
      renderAt();
      expect(document.body.textContent).not.toMatch(/\[[^\]]*\]/);
    } else {
      expect(REFERRAL_GO_LIVE_CONFIG).toMatchObject({ showReviewNotes: true, pageIndexable: false, showInFooter: false });
      renderAt();
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
    }
    expect(
      getReferralGoLiveProblems({
        liveReady: true,
        showReviewNotes: true,
        pageIndexable: false,
        showInFooter: false,
        headlineMode: 'no-figure',
      }),
    ).toEqual([
      'REFERRAL_SHOW_REVIEW_NOTES must be false',
      'REFERRAL_PAGE_INDEXABLE must be true',
      'REFERRAL_SHOW_IN_FOOTER must be true',
    ]);
  });

  it("reports a go-live problem whenever the headline mode is not 'no-figure' (N1)", () => {
    expect(REFERRAL_HEADLINE_MODE).toBe('no-figure');
    expect(REFERRAL_FIGURE_MODE_PROBLEM).toMatch(/Kojo and Eric must first clear a named list of courses/);
    const ready = { liveReady: true, showReviewNotes: false, pageIndexable: true, showInFooter: true } as const;
    expect(getReferralGoLiveProblems({ ...ready, headlineMode: 'no-figure' })).toEqual([]);
    expect(getReferralGoLiveProblems({ ...ready, headlineMode: '£500' })).toEqual([REFERRAL_FIGURE_MODE_PROBLEM]);
    // Also reported while still in draft, so the £500 mode cannot be left switched on by accident.
    expect(
      getReferralGoLiveProblems({ ...ready, liveReady: false, showReviewNotes: true, headlineMode: '£500' }),
    ).toEqual([REFERRAL_FIGURE_MODE_PROBLEM]);
  });

  it('does not pass fetchPriority to the hero image (React 18.3 warning, N3)', () => {
    const errors = vi.spyOn(console, 'error');
    renderAt();
    const img = screen.getByAltText(/Three smiling students/);
    expect(img.hasAttribute('fetchpriority')).toBe(false);
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/fetchPriority/i);
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
