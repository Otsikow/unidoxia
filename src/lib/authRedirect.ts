export const DEFAULT_AUTH_REDIRECT = "/dashboard";

export const getSafeAuthRedirect = (
  candidate: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
) => {
  if (!candidate) return fallback;

  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }

  try {
    const baseUrl = "https://unidoxia.local";
    const parsed = new URL(trimmed, baseUrl);

    if (parsed.origin !== baseUrl) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};

export const buildStudentSignupPath = (destination: string) => {
  const safeDestination = getSafeAuthRedirect(destination, "/student/dashboard");
  return `/auth/signup?role=student&next=${encodeURIComponent(safeDestination)}`;
};
