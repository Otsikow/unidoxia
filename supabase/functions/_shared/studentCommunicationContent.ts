/** Public content helpers only: this module is also imported by the web client. */
export const STUDENT_EMAIL_SIGNATURE =
  "Best regards,\nUniDoxia Team\ninfo@unidoxia.com\nhttps://unidoxia.com";
export interface ContactStudent {
  id: string;
  legal_name?: string | null;
  preferred_name?: string | null;
  contact_email?: string | null;
  whatsapp_number?: string | null;
  address?: unknown;
}
export interface ContactApplication {
  id: string;
  app_number?: string | null;
  program?: {
    name?: string | null;
    university?: { name?: string | null } | null;
  } | null;
}
export const studentName = (student: ContactStudent) =>
  student.preferred_name?.trim() || student.legal_name?.trim() || "student";
export function registeredWhatsApp(
  student: Pick<ContactStudent, "whatsapp_number" | "address">,
): string | null {
  const legacy =
    student.address &&
    typeof student.address === "object" &&
    "whatsapp" in student.address &&
    typeof student.address.whatsapp === "string"
      ? student.address.whatsapp
      : "";
  const raw = student.whatsapp_number?.trim() || legacy.trim();
  const clean = raw.replace(/[\s()-]/g, "").replace(/^00/, "+");
  return /^\+?[1-9]\d{7,14}$/.test(clean) ? clean.replace(/^\+/, "") : null;
}
export function whatsAppLink(
  student: Pick<ContactStudent, "whatsapp_number" | "address">,
  body: string,
): string | null {
  const phone = registeredWhatsApp(student);
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(body)}`
    : null;
}
export const COMMUNICATION_TEMPLATES = {
  update: "Application update",
  documents: "Outstanding documents",
  offer: "University offer",
  interview: "Interview preparation",
  visa: "Visa next steps",
  followup: "Friendly follow-up",
} as const;
export function communicationTemplate(
  kind: keyof typeof COMMUNICATION_TEMPLATES,
  student: ContactStudent,
  application?: ContactApplication | null,
) {
  const context = application
    ? ` regarding ${application.program?.name || "your course"}${application.program?.university?.name ? ` at ${application.program.university.name}` : ""}${application.app_number ? ` (reference ${application.app_number})` : ""}`
    : "";
  const messages = {
    update:
      "Please sign in to your UniDoxia account to review your latest application information. Let us know if you need help with the next step.",
    documents:
      "Please sign in to your UniDoxia account, review the document requests and upload the requested files through the secure portal. Contact us if anything is unclear.",
    offer:
      "Please contact our admissions team to review the university’s offer details, any conditions and the next steps before you make a decision.",
    interview:
      "Please confirm the date, time zone and format shown in the university’s interview invitation. Let us know if you would like help preparing.",
    visa: "Please sign in to your UniDoxia account to review the recorded next steps and tell us if any requested information is outstanding. Use official guidance for visa requirements.",
    followup:
      "We are checking in to see whether you need help with your application. Please let us know your current plans and any questions you have.",
  };
  return {
    subject: `UniDoxia — ${COMMUNICATION_TEMPLATES[kind]}${application?.app_number ? ` · ${application.app_number}` : ""}`,
    body: `Hello ${studentName(student)},\n\nWe are contacting you${context}.\n\n${messages[kind]}\n\nStudent portal: https://unidoxia.com/auth/login`,
  };
}
export interface CommunicationRecord {
  id: string;
  student_id: string;
  application_id: string | null;
  author_id: string | null;
  channel: "email" | "whatsapp_launch" | "note";
  status: "pending" | "accepted" | "failed" | "external_launch" | "recorded";
  subject: string;
  body: string;
  recipient: string | null;
  provider_id: string | null;
  delivery_status?: keyof typeof EMAIL_DELIVERY_LABELS | null;
  delivery_event_at?: string | null;
  created_at: string;
}
export const COMMUNICATION_STATUS_LABELS = {
  pending: "Sending result pending",
  accepted: "Accepted by email provider",
  failed: "Email provider declined",
  external_launch: "WhatsApp launch requested — not a send confirmation",
  recorded: "Manual staff note",
};

export const EMAIL_DELIVERY_LABELS = {
  delivered: "Delivered to recipient’s mail server",
  delayed: "Delivery delayed",
  bounced: "Bounced — recipient server rejected the email",
  failed: "Email delivery failed",
  suppressed: "Email suppressed by provider",
  complained: "Recipient reported this email as spam",
} as const;
