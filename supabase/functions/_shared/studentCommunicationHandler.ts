import { CommunicationError, sendStudentEmail } from "./studentEmail.ts";
import { registeredWhatsApp } from "./studentCommunicationContent.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export function createStudentCommunicationHandler(dependencies: {
  createClient: (...args: any[]) => any;
  env: (key: string) => string | undefined;
  fetch: typeof fetch;
}) {
  const { createClient, env, fetch } = dependencies;
  return async (request: Request) => {
    if (request.method === "OPTIONS")
      return new Response(null, { headers: cors });
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    try {
      const url = env("SUPABASE_URL"),
        anon = env("SUPABASE_ANON_KEY"),
        service = env("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !anon || !service)
        throw new CommunicationError(
          "Communication service setup is incomplete.",
          503,
        );
      const authorization = request.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer "))
        throw new CommunicationError("Please sign in.", 401);
      const caller = createClient(url, anon, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      });
      const { data: auth, error: authError } = await caller.auth.getUser();
      if (authError || !auth.user)
        throw new CommunicationError("Please sign in again.", 401);
      const { data: profile, error: profileError } = await caller
        .from("profiles")
        .select("id,role,tenant_id,active")
        .eq("id", auth.user.id)
        .single();
      if (
        profileError ||
        !profile ||
        !["admin", "staff"].includes(profile.role) ||
        profile.active !== true ||
        !profile.tenant_id
      )
        throw new CommunicationError(
          "Staff communication access is required.",
          403,
        );
      const input = await request.json().catch(() => null);
      if (!input || typeof input !== "object")
        throw new CommunicationError("Invalid request.");
      const ledger = await caller
        .from("student_communications")
        .select("id")
        .limit(1);
      const emailEnabled =
        env("STUDENT_EMAIL_ENABLED") === "true" &&
        Boolean(env("RESEND_API_KEY")) &&
        !ledger.error;
      if (input.action === "capabilities")
        return json({
          emailEnabled,
          historyEnabled: !ledger.error,
          whatsappMode: "external",
          emailReplies: "external",
          from: "info@unidoxia.com",
        });
      if (!uuid(input.studentId))
        throw new CommunicationError("Choose a valid student.");
      const { data: student, error: studentError } = await caller
        .from("students")
        .select("id,tenant_id,profile_id,contact_email,whatsapp_number,address")
        .eq("id", input.studentId)
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (studentError || !student)
        throw new CommunicationError(
          "Student not found or access unavailable.",
          404,
        );
      let applicationId: string | null = null;
      if (input.applicationId) {
        if (!uuid(input.applicationId))
          throw new CommunicationError("Invalid application.");
        const { data: app, error } = await caller
          .from("applications")
          .select("id")
          .eq("id", input.applicationId)
          .eq("student_id", student.id)
          .eq("tenant_id", profile.tenant_id)
          .maybeSingle();
        if (error || !app)
          throw new CommunicationError(
            "This application does not belong to the selected student.",
            403,
          );
        applicationId = app.id;
      }
      if (ledger.error)
        throw new CommunicationError(
          "Shared communication history is awaiting setup. Nothing was sent.",
          503,
        );
      if (input.action === "history") {
        const offset = Number(input.offset ?? 0);
        if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
          throw new CommunicationError("Invalid history page.");
        const baseFields = "id,student_id,application_id,author_id,channel,status,recipient,subject,body,provider_id,created_at";
        const readHistory = (receipts: boolean) => caller
          .from("student_communications")
          .select(baseFields + (receipts ? ",delivery_status,delivery_event_at" : ""), {count:"exact"})
          .eq("tenant_id", profile.tenant_id).eq("student_id", student.id)
          .order("created_at", {ascending:false}).order("id").range(offset,offset+24);
        let result = await readHistory(true);
        // Keep older managed schemas usable while the receipt migration awaits activation.
        if (["42703","PGRST204"].includes(result.error?.code)) result = await readHistory(false);
        const {data,error,count} = result;
        if (error)
          throw new CommunicationError("History could not be loaded.", 503);
        return json({ rows: data, total: count });
      }
      const admin = createClient(url, service, {
        auth: { persistSession: false },
      });
      const scoped = () =>
        admin
          .from("student_communications")
          .select("*")
          .eq("tenant_id", profile.tenant_id)
          .eq("student_id", student.id);
      if (input.action === "send_email") {
        if (
          typeof input.subject !== "string" ||
          typeof input.body !== "string" ||
          typeof input.expectedEmail !== "string" ||
          !uuid(input.id)
        )
          throw new CommunicationError("Invalid email draft.");
        const result = await sendStudentEmail(
          input,
          {
            studentId: student.id,
            tenantId: profile.tenant_id,
            authorId: profile.id,
            email: student.contact_email?.trim() || null,
            applicationId,
          },
          {
            enabled: emailEnabled,
            tagReceipts: env("STUDENT_EMAIL_EVENTS_ENABLED") === "true",
            now: () => Date.now(),
            store: {
              find: async (id) => {
                const { data, error } = await scoped()
                  .eq("id", id)
                  .maybeSingle();
                if (error)
                  throw new CommunicationError(
                    "History could not be checked. Nothing was sent.",
                    503,
                  );
                return data;
              },
              insert: async (row) => {
                const { error } = await admin
                  .from("student_communications")
                  .insert(row);
                if (error?.code === "23505") return false;
                if (error)
                  throw new CommunicationError(
                    "Message audit could not be saved. Nothing was sent.",
                    503,
                  );
                return true;
              },
              update: async (id, values) => {
                const { data, error } = await admin
                  .from("student_communications")
                  .update(values)
                  .eq("id", id)
                  .eq("tenant_id", profile.tenant_id)
                  .eq("student_id", student.id)
                  .select("id")
                  .maybeSingle();
                if (error || !data) throw new Error("Audit update unavailable");
              },
              recentCount: async () => {
                const { count, error } = await admin
                  .from("student_communications")
                  .select("id", { count: "exact", head: true })
                  .eq("author_id", profile.id)
                  .eq("channel", "email")
                  .gte(
                    "created_at",
                    new Date(Date.now() - 3600000).toISOString(),
                  );
                if (error)
                  throw new CommunicationError(
                    "Email limit could not be checked. Nothing was sent.",
                    503,
                  );
                return count ?? 0;
              },
            },
            send: async (payload) => {
              const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                signal: AbortSignal.timeout(15000),
                headers: {
                  Authorization: `Bearer ${env("RESEND_API_KEY")}`,
                  "Content-Type": "application/json",
                  "Idempotency-Key": payload.key,
                },
                body: JSON.stringify({
                  from: "UniDoxia <info@unidoxia.com>",
                  reply_to: "info@unidoxia.com",
                  to: [payload.to],
                  subject: payload.subject,
                  html: payload.html,
                  text: payload.text,
                  ...(payload.tags ? {tags:payload.tags} : {}),
                }),
              });
              const body = await response.json().catch(() => ({}));
              return {
                ok: response.ok,
                uncertain: response.status >= 500 || response.status === 409 || response.status === 408,
                id: typeof body.id === "string" ? body.id : undefined,
              };
            },
          },
        );
        return json(result, result.status === "accepted" ? 200 : 202);
      }
      if (
        input.action === "record_note" ||
        input.action === "record_whatsapp_launch"
      ) {
        if (
          !uuid(input.id) ||
          typeof input.body !== "string" ||
          !input.body.trim() ||
          input.body.length > 10000
        )
          throw new CommunicationError("Enter a valid communication note.");
        const launch = input.action === "record_whatsapp_launch";
        const phone = registeredWhatsApp(student);
        if (launch && !phone)
          throw new CommunicationError(
            "A valid registered WhatsApp number is required.",
          );
        const row = {
          id: input.id,
          tenant_id: profile.tenant_id,
          student_id: student.id,
          application_id: applicationId,
          author_id: profile.id,
          channel: launch ? "whatsapp_launch" : "note",
          status: launch ? "external_launch" : "recorded",
          subject: launch
            ? "WhatsApp launch requested"
            : "Staff communication note",
          body: input.body.trim(),
          recipient: launch ? phone : null,
        };
        const { error } = await admin
          .from("student_communications")
          .insert(row);
        if (error?.code === "23505") {
          const existing = await scoped().eq("id", input.id).maybeSingle();
          if (
            !existing.data ||
            Object.entries(row).some(
              ([key, value]) => existing.data[key] !== value,
            )
          )
            throw new CommunicationError(
              "This record identifier belongs to another note.",
              409,
            );
        } else if (error)
          throw new CommunicationError(
            "The communication note could not be saved.",
            503,
          );
        return json({ status: row.status, id: row.id });
      }
      throw new CommunicationError("Unsupported communication action.");
    } catch (error) {
      return json(
        {
          error:
            error instanceof CommunicationError
              ? error.message
              : "The communication service could not complete this request. No success has been confirmed.",
        },
        error instanceof CommunicationError ? error.status : 500,
      );
    }
  };
}
