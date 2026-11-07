import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export const placementCaseSchema = z.object({
  student_id: z.string(),
  intended_subject: z.string(),
  preferred_countries: z.array(z.string()),
  tuition_budget: z.number().nullable(),
  budget_currency: z.string(),
  budget_notes: z.string(),
  scholarship_interest: z.boolean().nullable(),
  scholarship_background: z.string(),
  status: z.enum([
    "draft",
    "submitted",
    "reviewing",
    "changes_requested",
    "recommendations_ready",
  ]),
  review_notes: z.string(),
  submitted_at: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const placementRecommendationSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  program_id: z.string().nullable(),
  program_name: z.string(),
  university_name: z.string(),
  country: z.string(),
  rationale: z.string(),
  tuition_amount: z.number().nullable(),
  tuition_currency: z.string(),
  tuition_period: z.string(),
  tuition_source_url: z.string().nullable(),
  tuition_checked_on: z.string().nullable(),
  scholarship_notes: z.string(),
  scholarship_source_url: z.string().nullable(),
  scholarship_checked_on: z.string().nullable(),
  response: z.enum(["interested", "not_suitable", "question"]).nullable(),
  student_feedback: z.string(),
  responded_at: z.string().nullable(),
  withdrawn: z.boolean(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  request_fingerprint: z.string(),
  version: z.number(),
});
export type PlacementCase = z.infer<typeof placementCaseSchema>;
export type PlacementRecommendation = z.infer<
  typeof placementRecommendationSchema
>;
// Additive schema overlay for this review-only migration. Regenerate the main
// database types after approved activation. This is the existing Auth client.
type ReadTable<T> = { Row: T; Insert: never; Update: never; Relationships: [] };
type Rpc<Args> = { Args: Args; Returns: Json };
type PlacementDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      student_placement_cases: ReadTable<PlacementCase>;
      student_placement_recommendations: ReadTable<PlacementRecommendation>;
    };
    Functions: Database["public"]["Functions"] & {
      save_student_placement: Rpc<{
        p_student_id: string;
        p_preferences: Json;
        p_submit: boolean;
        p_version: number;
      }>;
      review_student_placement: Rpc<{
        p_student_id: string;
        p_status: string;
        p_notes: string;
        p_version: number;
      }>;
      share_student_placement_recommendation: Rpc<{
        p_student_id: string;
        p_program_id: string;
        p_details: Json;
        p_id: string;
      }>;
      respond_student_placement: Rpc<{
        p_recommendation_id: string;
        p_response: string;
        p_feedback: string;
        p_version: number;
      }>;
      withdraw_student_placement_recommendation: Rpc<{
        p_recommendation_id: string;
        p_version: number;
      }>;
    };
  };
};
export const placementClient =
  supabase as unknown as SupabaseClient<PlacementDatabase>;
export const placementKey = (studentId: string) =>
  ["student-placement", studentId] as const;
export const placementStatuses: Record<PlacementCase["status"], string> = {
  draft: "Study plan in progress",
  submitted: "Submitted for UniDoxia review",
  reviewing: "University matching in progress",
  changes_requested: "More information requested",
  recommendations_ready: "Recommended options ready",
};
export function placementError(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (error instanceof z.ZodError)
    return "The saved response could not be confirmed. Reload the review before trying again.";
  if (e?.code === "23514")
    return "Check the amounts, currencies and source dates. Fee and scholarship information needs a valid official source and the date checked.";
  if (e?.code === "23505")
    return "This course is already on the active shortlist. Review or withdraw that recommendation before sharing another.";
  if (e?.code === "23503")
    return "The selected student or course is no longer available. Reload before trying again.";
  if (e?.code === "23502")
    return "Complete the required study or recommendation details before saving.";
  if (e?.code === "42501")
    return "You do not have permission to change this placement record.";
  if (["PGRST205", "42P01", "PGRST202", "42883"].includes(e?.code || ""))
    return "The adviser review workspace is not available yet. Please contact UniDoxia or try again later.";
  return (
    e?.message ||
    "The change could not be confirmed. Your answers have been kept. Reload to check the latest progress."
  );
}
export function initialReviewReadiness(
  student: Pick<
    Tables<"students">,
    | "legal_name"
    | "contact_email"
    | "nationality"
    | "secondary_qualification"
    | "secondary_school_name"
  >,
  educationCount: number,
  docs: {
    document_type: string;
    storage_path: string;
    admin_review_status?: string | null;
  }[],
) {
  return {
    personal: Boolean(
      student.legal_name?.trim() &&
        student.contact_email?.trim() &&
        student.nationality?.trim(),
    ),
    education:
      educationCount > 0 ||
      Boolean(
        student.secondary_qualification?.trim() &&
          student.secondary_school_name?.trim(),
      ),
    documents: docs.some(
      (d) =>
        ["transcript", "degree_certificate"].includes(d.document_type) &&
        Boolean(d.storage_path) &&
        d.admin_review_status !== "admin_rejected",
    ),
  };
}
export function recommendationFee(
  rec: Pick<
    PlacementRecommendation,
    "tuition_amount" | "tuition_currency" | "tuition_period"
  >,
) {
  if (rec.tuition_amount === null) return "Tuition not yet verified";
  const amount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: rec.tuition_currency,
    maximumFractionDigits: 0,
  }).format(rec.tuition_amount);
  return `${rec.tuition_currency} ${amount} ${({ per_year: "per year", per_semester: "per semester", total_course: "for the course" } as Record<string, string>)[rec.tuition_period] || ""}`;
}
