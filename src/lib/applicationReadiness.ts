export interface ReadinessInput {
  status: string;
  student?: {
    legal_name?: string | null;
    contact_email?: string | null;
  } | null;
  program?: {
    name?: string | null;
    university?: { name?: string | null } | null;
  } | null;
  intake_month?: number | null;
  intake_year?: number | null;
  documents: Array<{ verified: boolean; storage_path?: string | null }>;
  tasks: Array<{ status: string | null }>;
}

/** Evidence available in this application only; never infer institution eligibility. */
export function applicationReadiness(app: ReadinessInput) {
  return [
    {
      label: "Application submitted to UniDoxia",
      complete: app.status !== "draft",
      section: "overview",
    },
    {
      label: "Student name and email recorded",
      complete: Boolean(
        app.student?.legal_name?.trim() && app.student?.contact_email?.trim(),
      ),
      section: "profile",
    },
    {
      label: "Course and university recorded",
      complete: Boolean(app.program?.name && app.program.university?.name),
      section: "overview",
    },
    {
      label: "Intake recorded",
      complete: Boolean(app.intake_month && app.intake_year),
      section: "overview",
    },
    {
      label: "Application files reviewed",
      complete:
        app.documents.length > 0 &&
        app.documents.every((doc) => doc.verified && doc.storage_path),
      section: "documents",
    },
    {
      label: "No blocked follow-ups",
      complete: !app.tasks.some((task) => task.status === "blocked"),
      section: "followups",
    },
  ];
}
