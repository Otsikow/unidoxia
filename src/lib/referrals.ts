import { getSiteUrl } from '@/lib/supabaseClientConfig';

const FALLBACK_PORTAL_URL = 'https://portal.unidoxia.com';

const resolvePortalOrigin = () => {
  let origin = FALLBACK_PORTAL_URL;

  try {
    origin = getSiteUrl();
  } catch (error) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      origin = window.location.origin;
    }
  }

  return origin;
};

export const generateReferralLink = (username: string | null | undefined): string => {
  if (!username) {
    return '';
  }

  const origin = resolvePortalOrigin();
  return `${origin}/signup?ref=${encodeURIComponent(username)}`;
};

export const formatReferralUsername = (raw: string): string => {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
};

export const generateAgentInviteLink = (code: string | null | undefined): string => {
  if (!code) {
    return '';
  }

  const origin = resolvePortalOrigin();
  return `${origin}/signup?ref=${encodeURIComponent(code)}`;
};
