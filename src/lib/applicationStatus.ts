import { Constants, type Database } from "@/integrations/supabase/types";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export const APPLICATION_STATUS_OPTIONS: ReadonlyArray<{
  value: ApplicationStatus;
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
  { value: "rejected", label: "Rejected" },
  // Intentionally omitted from university review UI for now:
  // { value: "draft", label: "Draft" },
  // { value: "deferred", label: "Deferred" },
] as const;

const DB_APPLICATION_STATUS_VALUES = new Set<string>(
  // Single source of truth: DB enum values from generated Supabase types.
  Constants.public.Enums.application_status as readonly string[],
);

const UI_APPLICATION_STATUS_VALUES = new Set<string>(
  (APPLICATION_STATUS_OPTIONS as ReadonlyArray<{ value: string }>).map((s) => s.value),
);

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return DB_APPLICATION_STATUS_VALUES.has(value);
}

export function isApplicationStatusOption(value: string): value is ApplicationStatus {
  return UI_APPLICATION_STATUS_VALUES.has(value);
}

export function getApplicationStatusLabel(status: string): string {
  return (
    APPLICATION_STATUS_OPTIONS.find((s) => s.value === status)?.label ??
    status
  );
}

