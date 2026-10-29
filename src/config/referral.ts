// UniDoxia Refer & Earn settings (page: unidoxia.com/refer).
// Source of the terms: Kojo, "UniDoxia Refer & Earn: terms v2.2" (29 October 2026), DRAFT.
// Eric decides the headline and approves go-live. Change only the values below.

/**
 * Headline shown at the top of /refer.
 * - 'no-figure': "Earn a reward when your friend enrols" (no money claim). Default.
 * - '£500': "Earn up to £500 when your friend enrols". Kojo's CAP 3.7 advice (terms v2.2, section H)
 *   is not to publish "up to £500" until there is a signed rate for named universities or courses.
 */
export type ReferralHeadlineMode = 'no-figure' | '£500';

export const REFERRAL_HEADLINE_MODE: ReferralHeadlineMode = 'no-figure';

/** WhatsApp number that receives referrals (digits only, international format). */
export const REFERRAL_WHATSAPP_NUMBER = '447360961803';

/**
 * Show the amber "for Eric to decide" notes and placeholders on the page.
 * Keep true for review previews. Set false only once every placeholder has been filled in.
 */
export const REFERRAL_SHOW_REVIEW_NOTES = true;

/** Keep the page out of search results until Eric approves go-live. */
export const REFERRAL_PAGE_INDEXABLE = false;

export type ReferralHeadline = { title: string; subtitle: string };

export const getReferralHeadline = (mode: ReferralHeadlineMode): ReferralHeadline =>
  mode === '£500'
    ? {
        title: 'Earn up to £500 when your friend enrols',
        subtitle:
          'Refer a friend to UniDoxia. The amount depends on the course and university, and is paid only after they have successfully enrolled and UniDoxia has received its fee. 18+.',
      }
    : {
        title: 'Earn a reward when your friend enrols',
        subtitle:
          'Refer a friend and earn a reward when they enrol through UniDoxia. The amount depends on the course and university, and we confirm it in writing before your friend applies. 18+.',
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
