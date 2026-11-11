export const DEFAULT_AUTH_REDIRECT = "/dashboard";
export const STUDENT_REGISTRATION_PATH = "/student/onboarding";

export const getStudentRegistrationDestination = (candidate: string | null | undefined, fallback = "/student/dashboard") => {
  const destination = getSafeAuthRedirect(candidate, fallback);
  const path = destination.split(/[?#]/, 1)[0].replace(/\/+$/, "").toLowerCase();
  return path === STUDENT_REGISTRATION_PATH || path === "/verify-email" || path.startsWith("/auth/")
    ? fallback
    : destination;
};

export const buildStudentRegistrationPath = (destination: string) =>
  `${STUDENT_REGISTRATION_PATH}?next=${encodeURIComponent(getStudentRegistrationDestination(destination))}`;

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
