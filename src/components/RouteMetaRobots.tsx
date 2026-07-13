import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

/**
 * Emits <meta name="robots" content="noindex,nofollow"> for authenticated
 * application areas so private routes do not compete in search results.
 * Public marketing routes (including /universities and /partnership) are
 * left indexable.
 */
const PRIVATE_PREFIXES = [
  "/auth",
  "/admin",
  "/student",
  "/dashboard",
  "/partner",
  "/agents",
  "/onboarding",
  "/profile-settings",
  "/verify-email",
  "/signup",
  "/intake-form",
  "/feedback",
];

// /university/... (singular) is the authenticated university dashboard;
// /universities (plural) is the public directory and stays indexable.
const isPrivate = (pathname: string) => {
  if (pathname === "/university" || pathname.startsWith("/university/")) return true;
  return PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
};

export const RouteMetaRobots = () => {
  const { pathname } = useLocation();
  if (!isPrivate(pathname)) return null;
  return (
    <Helmet>
      <meta name="robots" content="noindex,nofollow" />
    </Helmet>
  );
};

export default RouteMetaRobots;
