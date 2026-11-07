import { useQuery } from "@tanstack/react-query";
import {
  placementClient,
  placementCaseSchema,
  placementRecommendationSchema,
  placementKey,
} from "@/lib/placement";
export function usePlacement(studentId: string | undefined) {
  return useQuery({
    queryKey: placementKey(studentId || ""),
    enabled: Boolean(studentId),
    retry: false,
    staleTime: 15_000,
    queryFn: async () => {
      const [c, r] = await Promise.all([
        placementClient
          .from("student_placement_cases")
          .select("*")
          .eq("student_id", studentId!)
          .maybeSingle(),
        placementClient
          .from("student_placement_recommendations")
          .select("*")
          .eq("student_id", studentId!)
          .order("created_at", { ascending: false }),
      ]);
      if (c.error) throw c.error;
      if (r.error) throw r.error;
      return {
        review: c.data ? placementCaseSchema.parse(c.data) : null,
        recommendations: (r.data || []).map((v) =>
          placementRecommendationSchema.parse(v),
        ),
      };
    },
  });
}
