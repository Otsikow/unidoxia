// Prerender entry for /refer (UniDoxia Refer & Earn). Read from src/config/referral.ts so the
// static HTML, the sitemap and the React page follow the same draft and go-live switches.
// While REFERRAL_PAGE_PUBLIC is false the entry is noindex: the prerenderer writes a static
// <meta name="robots" content="noindex">, generate-sitemap.cjs leaves /refer out and the
// unidoxia-seo worker adds X-Robots-Tag: noindex. No £ amounts appear in the starter HTML.
import {
  REFERRAL_HEADLINE_MODE,
  REFERRAL_PAGE_PUBLIC,
  REFERRAL_SEO_DESCRIPTION,
  REFERRAL_SEO_TITLE,
  getReferralHeadline,
} from '../src/config/referral.ts';

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function referSeoPage({ isPublic = REFERRAL_PAGE_PUBLIC, mode = REFERRAL_HEADLINE_MODE } = {}) {
  const headline = getReferralHeadline(mode);
  return {
    path: '/refer',
    title: REFERRAL_SEO_TITLE,
    description: REFERRAL_SEO_DESCRIPTION,
    noindex: !isPublic,
    body: `<h1>${esc(headline.title)}</h1><p>${esc(headline.subtitle)}</p><p>Refer a friend with their permission, or ask them to give your name when they first contact UniDoxia. Read the full UniDoxia Refer &amp; Earn terms on this page.</p><p><a href="/legal/privacy">Privacy notice</a></p>`,
  };
}
