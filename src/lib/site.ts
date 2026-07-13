const DEFAULT_SITE_URL = "https://unidoxia.com";

const isValidHttpUrl = (value?: string | null): value is string => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (error) {
    console.warn("[site] Invalid URL provided", error);
    return false;
  }
};

const normalizeUrl = (url: string) => url.replace(/\/+$/, "");

export const getPublicSiteUrl = (): string => {
  const envUrl = typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_PUBLIC_SITE_URL : undefined;
  if (isValidHttpUrl(envUrl)) {
    return normalizeUrl(envUrl);
  }

  if (typeof window !== "undefined" && window.location?.origin && isValidHttpUrl(window.location.origin)) {
    return normalizeUrl(window.location.origin);
  }

  return DEFAULT_SITE_URL;
};

export const buildScholarshipShareLink = (scholarship: {
  id: string;
  title: string;
  institution: string;
  country: string;
  awardAmount?: string;
  officialLink: string;
}): string => {
  const siteUrl = getPublicSiteUrl();
  const shareUrl = new URL("/scholarships/share", siteUrl);

  shareUrl.searchParams.set("id", scholarship.id);
  shareUrl.searchParams.set("title", scholarship.title);
  shareUrl.searchParams.set("institution", scholarship.institution);
  shareUrl.searchParams.set("country", scholarship.country);
  if (scholarship.awardAmount) {
    shareUrl.searchParams.set("award", scholarship.awardAmount);
  }
  shareUrl.searchParams.set("redirect", scholarship.officialLink);

  return shareUrl.toString();
};
