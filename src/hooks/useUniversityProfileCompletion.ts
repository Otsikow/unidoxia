import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  computeUniversityProfileCompletion,
  emptyUniversityProfileDetails,
  mergeUniversityProfileDetails,
  parseUniversityProfileDetails,
  type UniversityProfileDetails,
  type UniversityProfileCompletionResult,
} from "@/lib/universityProfile";
import type { Database } from "@/integrations/supabase/types";

type UniversityRecord = Database["public"]["Tables"]["universities"]["Row"];

interface UniversityProfileData {
  university: UniversityRecord | null;
  details: UniversityProfileDetails;
}

interface UseUniversityProfileCompletionResult {
  /** Profile completion percentage and missing fields */
  completion: UniversityProfileCompletionResult;
  /** Whether the profile data is currently loading */
  isLoading: boolean;
  /** Whether the profile data is being refetched */
  isRefetching: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** The university record if available */
  university: UniversityRecord | null;
  /** Parsed profile details */
  profileDetails: UniversityProfileDetails;
  /** Manually refresh the profile data */
  refresh: () => Promise<void>;
  /** Invalidate all profile-related queries (call after saving) */
  invalidateAll: () => Promise<void>;
}

/**
 * Shared hook for fetching and computing university profile completion.
 * This ensures consistent profile completion calculation across all pages.
 * 
 * SECURITY NOTE: This hook includes both tenantId AND profile.id in the query key
 * to ensure user-specific caching and prevent data leakage between users.
 */
export function useUniversityProfileCompletion(): UseUniversityProfileCompletionResult {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;
  const profileId = profile?.id ?? null;

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<UniversityProfileData>({
    // CRITICAL: Include profile.id in query key for user-specific caching
    queryKey: ["university-profile-completion", tenantId, profileId],
    // Only enable when we have both tenant and user context
    enabled: Boolean(tenantId) && Boolean(profileId),
    staleTime: 1000 * 60 * 2, // 2 minutes - same as dashboard for consistency
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // SECURITY: Require both tenant and user context
      if (!tenantId || !profileId) {
        console.warn("Missing context for university profile completion fetch", { tenantId, profileId });
        return {
          university: null,
          details: { ...emptyUniversityProfileDetails },
        };
      }

      // SECURITY: Verify user's tenant matches the requested tenant
      if (profile?.tenant_id !== tenantId) {
        console.error("SECURITY: Tenant mismatch in completion query!", {
          profileTenant: profile?.tenant_id,
          requestedTenant: tenantId,
          userId: profileId,
        });
        throw new Error("Profile isolation error: Your account tenant does not match");
      }

      const { data: universityData, error: fetchError } = await supabase
        .from("universities")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching university for completion:", fetchError);
        throw fetchError;
      }

      // Verify tenant isolation
      if (universityData && universityData.tenant_id !== tenantId) {
        console.error("SECURITY: University tenant mismatch in completion hook", {
          expected: tenantId,
          actual: universityData.tenant_id,
          userId: profileId,
        });
        throw new Error("Data isolation error: University does not belong to your organization");
      }

      const details = parseUniversityProfileDetails(
        universityData?.submission_config_json ?? null
      );

      return {
        university: universityData,
        details,
      };
    },
  });

  // Compute profile completion with contact fallback from user profile
  const completion = useMemo<UniversityProfileCompletionResult>(() => {
    if (!data?.university) {
      return { percentage: 0, missingFields: [] };
    }

    // Merge user profile data as fallback for contact info
    // This ensures consistency with how the Profile page uses profile data as defaults
    const detailsWithContactFallback = mergeUniversityProfileDetails(
      data.details ?? emptyUniversityProfileDetails,
      {
        contacts: {
          primary: {
            name: data.details?.contacts?.primary?.name ?? profile?.full_name ?? null,
            email: data.details?.contacts?.primary?.email ?? profile?.email ?? null,
            phone: data.details?.contacts?.primary?.phone ?? profile?.phone ?? null,
            title: data.details?.contacts?.primary?.title ?? null,
          },
        },
      }
    );

    return computeUniversityProfileCompletion(
      data.university,
      detailsWithContactFallback
    );
  }, [data, profile]);

  const refresh = async () => {
    await refetch();
  };

  const invalidateAll = async () => {
    if (!tenantId || !profileId) return;
    
    // CRITICAL: Include profileId in invalidation to ensure user-specific cache clearing
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["university-profile-completion", tenantId, profileId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["university-profile", tenantId, profileId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["university-dashboard", tenantId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["partner-dashboard-overview", tenantId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["university-dashboard-overview", tenantId],
      }),
    ]);
  };

  return {
    completion,
    isLoading,
    isRefetching: isFetching,
    error: error ? (error as Error).message : null,
    university: data?.university ?? null,
    profileDetails: data?.details ?? emptyUniversityProfileDetails,
    refresh,
    invalidateAll,
  };
}
