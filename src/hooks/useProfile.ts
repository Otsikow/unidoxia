import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch a user's profile by their user ID.
 * 
 * SECURITY NOTE: This hook fetches profile data by user_id (auth.users.id).
 * The profiles table uses auth.users.id as the primary key, ensuring that
 * each user can only have one profile and profiles cannot be shared.
 * 
 * RLS policies further restrict access so users can only view profiles
 * they're authorized to see (their own, or profiles of users they interact with).
 */
export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      // CRITICAL: Always fetch by user_id (which is the primary key)
      // This ensures we get exactly one profile belonging to this user
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, tenant_id, email, role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }

      // SECURITY CHECK: Verify the returned profile ID matches the requested user ID
      if (data && data.id !== userId) {
        console.error("SECURITY ERROR: Profile ID mismatch in useProfile!", {
          requested: userId,
          returned: data.id,
        });
        throw new Error("Profile isolation error: Returned profile does not match requested user");
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes - refresh frequently to catch tenant changes
    refetchOnWindowFocus: true, // Ensure fresh data on tab focus
  });
};
