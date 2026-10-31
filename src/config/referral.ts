// UniDoxia Refer & Earn settings (page: unidoxia.com/refer).
// Source of the terms: Kojo, "UniDoxia Refer & Earn: terms" v2.2 plus the v2.3 no-figure wording
// (section I, 29 October 2026), DRAFT.
// Eric decides the headline and approves go-live. Change only the values below.

/**
 * Money-figure switch for /refer (headline, subtitle and reward section). Build time only.
 * - 'no-figure' (default): Kojo's v2.3 wording. No £ amount appears anywhere on the page or in the
 *   built JavaScript: the money-figure copy lives in src/config/referralFigures.ts and
 *   src/pages/refer/ReferRewardTable.tsx, which the build drops unless it selects the figure mode.
 * - The figure mode: set VITE_REFERRAL_HEADLINE_MODE to that mode for the build (vite.config.ts turns it
 *   into __REFERRAL_HEADLINE_MODE__). Kojo's CAP 3.7 ruling (terms v2.2 section H, v2.3 section I) is
 *   not to publish any £ figure until there are signed rates for named universities or courses, so
 *   `npm run build` refuses that mode (scripts/check-referral-go-live.mjs) until Kojo and Eric clear it.
 */
export type ReferralHeadlineMode = 'no-figure' | '£500';

declare const __REFERRAL_HEADLINE_MODE__: string | undefined;

/** Vite replaces __REFERRAL_HEADLINE_MODE__ at build time; Node scripts and vitest read the env var. */
const buildHeadlineMode =
  typeof __REFERRAL_HEADLINE_MODE__ === 'string'
    ? __REFERRAL_HEADLINE_MODE__
    : typeof process !== 'undefined'
      ? process.env.VITE_REFERRAL_HEADLINE_MODE
      : undefined;

export const REFERRAL_HEADLINE_MODE: ReferralHeadlineMode = buildHeadlineMode === '£500' ? '£500' : 'no-figure';

/** WhatsApp number that receives referrals (digits only, international format). */
export const REFERRAL_WHATSAPP_NUMBER = '447360961803';

/**
 * Show the amber "for Eric to decide" notes and placeholders on the page.
 * Keep true for review previews. Set false only once every placeholder has been filled in.
 */
export const REFERRAL_SHOW_REVIEW_NOTES = true;

/** Keep the page out of search results until Eric approves go-live. */
export const REFERRAL_PAGE_INDEXABLE = false;

/** Show the "Refer a friend" link in the site footer. Off until go-live. */
export const REFERRAL_SHOW_IN_FOOTER = false;

/**
 * Set true only when Eric has approved go-live. A test then fails unless the review notes are off,
 * the page is indexable, the footer link is on, /refer is in the sitemap and no "[...]" placeholders
 * are left on the page. Until then the prerendered /refer HTML carries a static robots noindex and
 * the sitemap leaves /refer out (scripts/refer-seo-page.mjs).
 */
export const REFERRAL_LIVE_READY = false;

/** The page goes into search results and the sitemap only when live-ready and indexable. */
export const REFERRAL_PAGE_PUBLIC = REFERRAL_LIVE_READY && REFERRAL_PAGE_INDEXABLE;

/** Page title and description, shared by the React page and the prerendered HTML. No £ amounts. */
export const REFERRAL_SEO_TITLE = 'Refer a Friend and Earn a Reward | UniDoxia';
export const REFERRAL_SEO_DESCRIPTION =
  "Refer a friend to UniDoxia and earn a reward when they successfully enrol on a university course abroad. Some courses don't qualify. 18+. Read the Refer & Earn terms.";

export type ReferralGoLiveConfig = {
  liveReady: boolean;
  showReviewNotes: boolean;
  pageIndexable: boolean;
  showInFooter: boolean;
  headlineMode: ReferralHeadlineMode;
};

export const REFERRAL_GO_LIVE_CONFIG: ReferralGoLiveConfig = {
  liveReady: REFERRAL_LIVE_READY,
  showReviewNotes: REFERRAL_SHOW_REVIEW_NOTES,
  pageIndexable: REFERRAL_PAGE_INDEXABLE,
  showInFooter: REFERRAL_SHOW_IN_FOOTER,
  headlineMode: REFERRAL_HEADLINE_MODE,
};

export const REFERRAL_FIGURE_MODE_PROBLEM =
  "REFERRAL_HEADLINE_MODE must be 'no-figure': Kojo and Eric must first clear a named list of courses with signed commission rates before any £ figure is shown";

/**
 * Lists the settings that block go-live. The money-figure check always applies (Kojo, v2.3 section I);
 * the draft settings are checked only once REFERRAL_LIVE_READY is true.
 */
export const getReferralGoLiveProblems = (config: ReferralGoLiveConfig = REFERRAL_GO_LIVE_CONFIG): string[] => {
  const problems: string[] = [];
  if (config.headlineMode !== 'no-figure') problems.push(REFERRAL_FIGURE_MODE_PROBLEM);
  if (!config.liveReady) return problems;
  if (config.showReviewNotes) problems.push('REFERRAL_SHOW_REVIEW_NOTES must be false');
  if (!config.pageIndexable) problems.push('REFERRAL_PAGE_INDEXABLE must be true');
  if (!config.showInFooter) problems.push('REFERRAL_SHOW_IN_FOOTER must be true');
  return problems;
};

export type ReferralHeadline = { title: string; subtitle: string };

/** No-figure headline and subtitle (Kojo terms v2.3, section I). The figure-mode copy is in referralFigures.ts. */
export const REFERRAL_HEADLINE: ReferralHeadline = {
  title: 'Earn a reward when your friend enrols',
  subtitle:
    // Kojo terms v2.3, section I, top-of-page subtitle (exact).
    "Refer a friend and earn a reward when they successfully enrol through UniDoxia. We pay only after they enrol and we receive our commission from the university. The amount depends on the course, some courses don't qualify, and we confirm it in writing before your friend applies. 18+.",
};

export type ReferralDetails = {
  referrerName: string;
  referrerContact: string;
  friendFirstName: string;
};

/** Opening line for the plain WhatsApp button (no details entered). */
export const REFERRAL_PLAIN_MESSAGE = 'Hello UniDoxia, I would like to refer a friend (Refer & Earn, unidoxia.com/refer).';

/** Message the referrer sends to UniDoxia on WhatsApp. Nothing is stored by the website. */
export const buildReferralMessage = ({ referrerName, referrerContact, friendFirstName }: ReferralDetails): string =>
  [
    REFERRAL_PLAIN_MESSAGE,
    `My name: ${referrerName.trim()}`,
    `My email or WhatsApp: ${referrerContact.trim()}`,
    `My friend's first name: ${friendFirstName.trim()}`,
    'I am 18 or over and I agree to the Refer & Earn terms.',
    'My friend has agreed that I can share their first name with UniDoxia and introduce them.',
  ].join('\n');

export const buildReferralWhatsAppUrl = (details?: ReferralDetails, number: string = REFERRAL_WHATSAPP_NUMBER): string => {
  const base = `https://wa.me/${number.replace(/\D/g, '')}`;
  const text = details ? buildReferralMessage(details) : REFERRAL_PLAIN_MESSAGE;
  return `${base}?text=${encodeURIComponent(text)}`;
};
