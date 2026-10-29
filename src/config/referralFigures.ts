// UniDoxia Refer & Earn: money-figure copy for the blocked '£500' mode (Kojo's wish to keep it for later).
// Build time only. Import this module only behind REFERRAL_FIGURES_IN_BUILD (src/pages/Refer.tsx), so a
// default no-figure build drops it and no £ band ships in the public JavaScript (Akosua QC N6).
// Kojo's CAP 3.7 ruling: no £ figure may be published until rates are signed for named courses.
import type { ReferralHeadline } from './referral';

export const REFERRAL_FIGURE_HEADLINE: ReferralHeadline = {
  title: 'Earn up to £500 when your friend enrols',
  subtitle:
    'Refer a friend to UniDoxia. The amount depends on the course and university, and is paid only after they have successfully enrolled and UniDoxia has received its fee. Some courses earn no reward. 18+.',
};

/** Kofi's reward bands (Kojo terms v2.2 section H). Internal; shown only in a '£500' build. */
export const REFERRAL_REWARD_BANDS = [
  { commission: '£2,000 or more', reward: '£500' },
  { commission: '£1,000 to £1,999', reward: '£250' },
  { commission: '£400 to £999', reward: '£100' },
  { commission: 'Under £400', reward: 'No reward' },
] as const;
