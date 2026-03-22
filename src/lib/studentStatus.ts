/**
 * Derives a meaningful operational status for a student based on their
 * applications, documents, and profile completeness.
 *
 * Priority (highest status wins):
 *  1. Enrolled
 *  2. Visa Stage
 *  3. CAS / LOA Issued
 *  4. Offer Received (conditional or unconditional)
 *  5. Under Review (screening)
 *  6. Application Submitted
 *  7. Application Drafted
 *  8. Outstanding Documents (has profile but missing required docs)
 *  9. Profile Incomplete
 * 10. New Student (just registered)
 *
 * Negative terminal states (withdrawn / deferred) are shown only when
 * every application is in that state.
 */

import { REQUIRED_STUDENT_DOCUMENTS } from "@/lib/studentDocuments";

/* ---------- types -------------------------------------------------------- */

export type StudentOperationalStatus =
  | "enrolled"
  | "visa_stage"
  | "cas_loa_issued"
  | "admission_granted"
  | "offer_received"
  | "under_review"
  | "application_submitted"
  | "application_drafted"
  | "outstanding_documents"
  | "profile_incomplete"
  | "new_student"
  | "withdrawn"
  | "deferred"
  | "rejected"
  | "archived";

export interface StudentOperationalStatusMeta {
  label: string;
  /** Tailwind color classes for the badge */
  variant: "default" | "secondary" | "destructive" | "outline";
  /** Extra Tailwind classes for fine-grained color control */
  className: string;
  /** Sort weight – higher = further along the pipeline */
  weight: number;
}

/* ---------- config ------------------------------------------------------- */

const STATUS_META: Record<StudentOperationalStatus, StudentOperationalStatusMeta> = {
  enrolled: {
    label: "Enrolled",
    variant: "default",
    className: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    weight: 100,
  },
  visa_stage: {
    label: "Visa Stage",
    variant: "outline",
    className: "bg-blue-600/20 text-blue-400 border-blue-500/30",
    weight: 90,
  },
  cas_loa_issued: {
    label: "CAS / LOA Issued",
    variant: "outline",
    className: "bg-indigo-600/20 text-indigo-400 border-indigo-500/30",
    weight: 80,
  },
  admission_granted: {
    label: "Admission Granted",
    variant: "default",
    className: "bg-green-600/20 text-green-400 border-green-500/30",
    weight: 75,
  },
  offer_received: {
    label: "Offer Received",
    variant: "outline",
    className: "bg-violet-600/20 text-violet-400 border-violet-500/30",
    weight: 70,
  },
  under_review: {
    label: "Under Review",
    variant: "outline",
    className: "bg-amber-600/20 text-amber-400 border-amber-500/30",
    weight: 60,
  },
  application_submitted: {
    label: "Application Submitted",
    variant: "outline",
    className: "bg-sky-600/20 text-sky-400 border-sky-500/30",
    weight: 50,
  },
  application_drafted: {
    label: "Application Drafted",
    variant: "outline",
    className: "bg-slate-600/20 text-slate-300 border-slate-500/30",
    weight: 40,
  },
  outstanding_documents: {
    label: "Outstanding Documents",
    variant: "destructive",
    className: "bg-orange-600/20 text-orange-400 border-orange-500/30",
    weight: 30,
  },
  profile_incomplete: {
    label: "Profile Incomplete",
    variant: "outline",
    className: "bg-rose-600/20 text-rose-400 border-rose-500/30",
    weight: 20,
  },
  new_student: {
    label: "New Student",
    variant: "outline",
    className: "bg-slate-600/20 text-slate-400 border-slate-500/30",
    weight: 10,
  },
  withdrawn: {
    label: "Withdrawn",
    variant: "secondary",
    className: "bg-red-600/20 text-red-400 border-red-500/30",
    weight: 5,
  },
  deferred: {
    label: "Deferred",
    variant: "secondary",
    className: "bg-yellow-600/20 text-yellow-400 border-yellow-500/30",
    weight: 5,
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    className: "bg-red-700/20 text-red-500 border-red-600/30",
    weight: 3,
  },
  archived: {
    label: "Archived",
    variant: "secondary",
    className: "bg-slate-700/30 text-slate-500 border-slate-600/30",
    weight: 0,
  },
};

export function getStudentStatusMeta(status: StudentOperationalStatus): StudentOperationalStatusMeta {
  return STATUS_META[status];
}

export const STUDENT_STATUS_FILTER_OPTIONS: { value: StudentOperationalStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "enrolled", label: "Enrolled" },
  { value: "visa_stage", label: "Visa Stage" },
  { value: "cas_loa_issued", label: "CAS / LOA Issued" },
  { value: "offer_received", label: "Offer Received" },
  { value: "under_review", label: "Under Review" },
  { value: "application_submitted", label: "Application Submitted" },
  { value: "application_drafted", label: "Application Drafted" },
  { value: "outstanding_documents", label: "Outstanding Documents" },
  { value: "profile_incomplete", label: "Profile Incomplete" },
  { value: "new_student", label: "New Student" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "deferred", label: "Deferred" },
  { value: "archived", label: "Archived" },
];

/* ---------- derivation --------------------------------------------------- */

/** Application-status → operational-status mapping (priority order) */
const APP_STATUS_PRIORITY: [string, StudentOperationalStatus][] = [
  ["enrolled", "enrolled"],
  ["visa", "visa_stage"],
  ["cas_loa", "cas_loa_issued"],
  ["unconditional_offer", "offer_received"],
  ["conditional_offer", "offer_received"],
  ["screening", "under_review"],
  ["submitted", "application_submitted"],
  ["draft", "application_drafted"],
];

interface DeriveInput {
  archived_at: string | null;
  legal_name: string | null;
  contact_email: string | null;
  applications: { status: string | null }[];
  documents: { document_type: string }[];
}

export function deriveStudentStatus(student: DeriveInput): StudentOperationalStatus {
  // Archived overrides everything
  if (student.archived_at) return "archived";

  // Check applications – find the highest-priority app status
  const appStatuses = new Set(
    student.applications.map((a) => a.status).filter(Boolean) as string[]
  );

  for (const [appStatus, opStatus] of APP_STATUS_PRIORITY) {
    if (appStatuses.has(appStatus)) return opStatus;
  }

  // All apps withdrawn?
  if (student.applications.length > 0 && [...appStatuses].every((s) => s === "withdrawn")) {
    return "withdrawn";
  }
  // All apps deferred?
  if (student.applications.length > 0 && [...appStatuses].every((s) => s === "deferred")) {
    return "deferred";
  }

  // No applications – check document & profile completeness
  const docTypes = new Set(student.documents.map((d) => d.document_type));
  const hasAllDocs = REQUIRED_STUDENT_DOCUMENTS.every((req) =>
    req.acceptableTypes.some((t) => docTypes.has(t))
  );

  const profileComplete = Boolean(student.legal_name && student.contact_email);

  if (!profileComplete) return "profile_incomplete";
  if (!hasAllDocs) return "outstanding_documents";

  return "new_student";
}
