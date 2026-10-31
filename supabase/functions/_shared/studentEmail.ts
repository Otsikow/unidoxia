import {
  STUDENT_EMAIL_SIGNATURE,
  type CommunicationRecord,
} from "./studentCommunicationContent.ts";
export class CommunicationError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export interface EmailContext {
  studentId: string;
  tenantId: string;
  authorId: string;
  email: string | null;
  applicationId: string | null;
}
export interface EmailInput {
  id: string;
  subject: string;
  body: string;
  expectedEmail: string;
}
export interface EmailStore {
  insert: (row: Record<string, unknown>) => Promise<boolean>;
  find: (
    id: string,
  ) => Promise<(CommunicationRecord & { tenant_id: string; signature?: string }) | null>;
  update: (id: string, values: Record<string, unknown>) => Promise<void>;
  recentCount: () => Promise<number>;
}
export const emailHtml = (body: string, signature = STUDENT_EMAIL_SIGNATURE) =>
  `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#172033;max-width:640px"><h2 style="color:#12345b">UniDoxia</h2><p>${(body + "\n\n" + signature).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/\n/g, "<br>")}</p></div>`;
export async function sendStudentEmail(
  input: EmailInput,
  context: EmailContext,
  deps: {
    enabled: boolean;
    store: EmailStore;
    now: () => number;
    send: (value: {
      to: string;
      subject: string;
      html: string;
      text: string;
      key: string;
    }) => Promise<{ ok: boolean; id?: string; uncertain?: boolean }>;
  },
) {
  if (!deps.enabled)
    throw new CommunicationError(
      "Direct email is not enabled. Use the email-app option or ask an administrator to complete setup.",
      503,
    );
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.id,
    )
  )
    throw new CommunicationError("Invalid message identifier.");
  if (
    !input.subject?.trim() ||
    input.subject.length > 200 ||
    /[\r\n]/.test(input.subject) ||
    !input.body?.trim() ||
    input.body.length > 10000
  )
    throw new CommunicationError(
      "Enter a subject and message within the supported limits.",
    );
  if (!context.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(context.email))
    throw new CommunicationError(
      "This student has no valid registered email address.",
    );
  if (input.expectedEmail !== context.email)
    throw new CommunicationError(
      "The student’s email address changed. Reload the student before sending.",
      409,
    );
  let row = await deps.store.find(input.id);
  if (!row) {
    if ((await deps.store.recentCount()) >= 60)
      throw new CommunicationError(
        "The hourly email limit has been reached. Please try later.",
        429,
      );
    const inserted = await deps.store.insert({
      id: input.id,
      student_id: context.studentId,
      tenant_id: context.tenantId,
      author_id: context.authorId,
      application_id: context.applicationId,
      channel: "email",
      status: "pending",
      recipient: context.email,
      subject: input.subject,
      body: input.body,
      signature: STUDENT_EMAIL_SIGNATURE,
    });
    if (!inserted) row = await deps.store.find(input.id);
  }
  if (row) {
    if (
      row.student_id !== context.studentId ||
      row.tenant_id !== context.tenantId ||
      row.author_id !== context.authorId ||
      row.channel !== "email" ||
      row.subject !== input.subject ||
      row.body !== input.body ||
      row.recipient !== context.email ||
      row.application_id !== context.applicationId
    )
      throw new CommunicationError(
        "This message identifier belongs to a different draft. Refresh its history before sending.",
        409,
      );
    if (row.status === "accepted")
      return { status: "accepted", id: row.id, providerId: row.provider_id };
    // Provider idempotency lasts 24 hours. Never retry an uncertain send outside it.
    if (deps.now() - Date.parse(row.created_at) > 23 * 60 * 60 * 1000)
      throw new CommunicationError(
        "This earlier attempt needs reconciliation before it can be retried. Do not resend it as a new draft without checking the official mailbox.",
        409,
      );
  } else if (!(await deps.store.find(input.id))) {
    throw new CommunicationError(
      "Message audit could not be confirmed. Nothing was sent.",
      503,
    );
  }
  let response: { ok: boolean; id?: string; uncertain?: boolean };
  try {
    response = await deps.send({
      to: context.email,
      subject: input.subject,
      html: emailHtml(input.body, row?.signature ?? STUDENT_EMAIL_SIGNATURE),
      text: input.body + "\n\n" + (row?.signature ?? STUDENT_EMAIL_SIGNATURE),
      key: `student-email/${input.id}`,
    });
  } catch {
    throw new CommunicationError(
      "Email result is uncertain. Keep this draft and retry the same message; do not create a duplicate.",
      503,
    );
  }
  if (response.uncertain)
    throw new CommunicationError("Email result is uncertain. Refresh history and retry this same draft.", 503);
  if (!response.ok) {
    await deps.store.update(input.id, {
      status: "failed",
      updated_at: new Date(deps.now()).toISOString(),
    });
    throw new CommunicationError(
      "The email provider declined this request. The draft has been kept.",
      502,
    );
  }
  if (!response.id)
    throw new CommunicationError(
      "Email result is uncertain. Refresh history and retry this same draft.",
      503,
    );
  try {
    await deps.store.update(input.id, {
      status: "accepted",
      provider_id: response.id,
      updated_at: new Date(deps.now()).toISOString(),
    });
  } catch {
    return {
      status: "pending",
      id: input.id,
      providerAccepted: true,
      providerId: response.id,
      message:
        "The email provider accepted this message, but its history update needs reconciliation. Retry this same draft to recover the audit.",
    };
  }
  return { status: "accepted", id: input.id, providerId: response.id };
}
