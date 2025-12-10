import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUniversityProfileCompletion } from "@/hooks/useUniversityProfileCompletion";

interface UniversityBranding {
  displayName: string;
  avatarUrl: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactName: string | null;
  roleLabel: string;
  initials: string;
  isPartner: boolean;
}

const buildInitials = (value: string | null | undefined) =>
  (value ?? "UP")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "UP";

/**
 * Provides a single source of truth for university branding (name + logo).
 * Ensures the same logo/name are reused across dashboard header, profile pages,
 * and any other component that needs the university identity.
 */
export const useUniversityBranding = () => {
  const { profile } = useAuth();
  const {
    university,
    profileDetails,
    isLoading,
    isRefetching,
    refresh,
  } = useUniversityProfileCompletion();

  const branding: UniversityBranding = useMemo(() => {
    const isPartner = profile?.role === "partner";
    const displayName =
      (isPartner ? university?.name?.trim() : null) ||
      profile?.full_name?.trim() ||
      "University Partner";

    const logoUrl = isPartner ? university?.logo_url ?? null : null;
    const avatarUrl = logoUrl ?? profile?.avatar_url ?? null;

    const initialsSource =
      displayName ||
      profileDetails.contacts.primary?.name ||
      profile?.full_name ||
      "University Partner";

    return {
      displayName,
      avatarUrl,
      logoUrl,
      contactEmail: profile?.email ?? null,
      contactName: profile?.full_name ?? null,
      roleLabel: isPartner ? "University Partner" : profile?.role ?? "User",
      initials: buildInitials(initialsSource),
      isPartner,
    };
  }, [profile, profileDetails.contacts.primary?.name, university?.logo_url, university?.name]);

  return {
    ...branding,
    isLoading: branding.isPartner ? isLoading : false,
    isRefetching: branding.isPartner ? isRefetching : false,
    refresh,
  };
};
