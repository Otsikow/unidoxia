import type { Database } from "@/integrations/supabase/types";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export const APPLICATION_STATUS_OPTIONS: ReadonlyArray<{
  value: ApplicationStatus | string;
  label: string;
}> = [
  { value: "submitted", label: "Submitted" },
  { value: "screening", label: "Under Review" },
  { value: "conditional_offer", label: "Conditional Offer" },
  { value: "unconditional_offer", label: "Unconditional Offer" },
  { value: "cas_loa", label: "CAS / LOA Issued" },
  { value: "visa", label: "Visa Stage" },
  { value: "enrolled", label: "Enrolled" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "deferred", label: "Deferred" },
  // Intentionally omitted from university review UI for now:
  // { value: "draft", label: "Draft" },
] as const;

const APPLICATION_STATUS_VALUES = new Set<string>(
  (APPLICATION_STATUS_OPTIONS as ReadonlyArray<{ value: string }>).map((s) => s.value),
);

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return APPLICATION_STATUS_VALUES.has(value);
}

export function getApplicationStatusLabel(status: string): string {
  return (
    APPLICATION_STATUS_OPTIONS.find((s) => s.value === status)?.label ??
    status
  );
}

