import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sets <meta name="robots" content="noindex,nofollow"> on authenticated
 * application routes so private areas do not compete in search results.
 * Public marketing routes (including /universities and /partnership) stay
 * indexable and unaffected.
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

const OWNED_ATTR = "data-managed-seo";

const isPrivate = (pathname: string) => {
  if (pathname === "/university" || pathname.startsWith("/university/")) return true;
  return PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
};

export const RouteMetaRobots = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const priv = isPrivate(pathname);
    const existing = document.head.querySelectorAll<HTMLMetaElement>('meta[name="robots"]');
    existing.forEach((n) => n.parentNode?.removeChild(n));
    if (priv) {
      const m = document.createElement("meta");
      m.setAttribute("name", "robots");
      m.setAttribute("content", "noindex,nofollow");
      m.setAttribute(OWNED_ATTR, "1");
      document.head.appendChild(m);
    }
  }, [pathname]);

  return null;
};

export default RouteMetaRobots;
