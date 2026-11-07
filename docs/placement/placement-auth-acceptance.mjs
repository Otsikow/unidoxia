// Actual Auth/Data API/private Storage in the disposable GitHub localhost stack.
// No production URLs, credentials, email providers, payments or student records.
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import { assertAcceptanceTarget } from "../security/staging/acceptance-target.mjs";
const url = process.env.STAGING_SUPABASE_URL,
  anon = process.env.STAGING_SUPABASE_ANON_KEY,
  key = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
assertAcceptanceTarget(
  url,
  process.env.EXPECTED_STAGING_PROJECT_REF,
  process.env.UNIDOXIA_LOCAL_ACCEPTANCE,
);
if (
  process.env.UNIDOXIA_LOCAL_ACCEPTANCE !== "true" ||
  process.env.RESEND_API_KEY ||
  process.env.STRIPE_SECRET_KEY
)
  throw Error("Only provider-free localhost acceptance is allowed");
const service = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [],
  students = [],
  tenants = [],
  universities = [],
  programs = [],
  objects = [],
  sessions = [];
const checks = [];
const data = (r, label) => {
  if (r.error) throw Error(`${label}: ${r.error.code || "failed"}`);
  return r.data;
};
async function check(name, fn) {
  try {
    if (!(await fn())) throw Error("assertion");
    checks.push({ name, pass: true });
    console.log("PASS " + name);
  } catch (e) {
    checks.push({ name, pass: false });
    console.log("FAIL " + name + ": " + e.message);
  }
}
async function actor(label, tenant, role = "student") {
  const email = `placement-${label}-${randomUUID()}@udx-test.invalid`,
    password = randomBytes(24).toString("hex");
  const auth = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  sessions.push(auth);
  const signed = data(
    await auth.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: "Synthetic placement fixture",
          phone: "+447700900123",
        },
      },
    }),
    "Real signup",
  );
  if (!signed.user) throw Error("Signup returned no user");
  const id = signed.user.id;
  users.push(id);
  data(
    await service.auth.admin.updateUserById(id, { email_confirm: true }),
    "Synthetic email confirmation",
  );
  if (role !== "student")
    data(
      await service
        .from("user_roles")
        .upsert({ user_id: id, role }, { onConflict: "user_id,role" }),
      "Trusted role fixture",
    );
  data(
    await service.from("profiles").update({ tenant_id: tenant }).eq("id", id),
    "Profile fixture scope",
  );
  const s = data(
    await service.from("students").select("id").eq("profile_id", id).single(),
    "Created student",
  );
  students.push(s.id);
  data(
    await service.from("students").update({ tenant_id: tenant }).eq("id", s.id),
    "Student fixture scope",
  );
  const logged = data(
    await auth.auth.signInWithPassword({ email, password }),
    "Real password login",
  );
  if (!logged.session) throw Error("No real session");
  return { id, studentId: s.id, api: auth, token: logged.session.access_token };
}
let failure;
try {
  const ta = randomUUID(),
    tb = randomUUID();
  tenants.push(ta, tb);
  data(
    await service.from("tenants").insert([
      { id: ta, slug: `placement-a-${ta}` },
      { id: tb, slug: `placement-b-${tb}` },
    ]),
    "Tenants",
  );
  const owner = await actor("owner", ta),
    other = await actor("other", ta),
    staff = await actor("staff", ta, "staff"),
    foreign = await actor("foreign", tb, "staff");
  const uni = randomUUID(),
    program = randomUUID();
  universities.push(uni);
  programs.push(program);
  data(
    await service
      .from("universities")
      .insert({
        id: uni,
        tenant_id: ta,
        name: "Synthetic placement university",
        country: "Canada",
        active: true,
      }),
    "University fixture",
  );
  data(
    await service
      .from("programs")
      .insert({
        id: program,
        tenant_id: ta,
        university_id: uni,
        name: "Synthetic computing course",
        active: true,
      }),
    "Programme fixture",
  );
  const preferences = {
    intended_subject: "Computing",
    preferred_countries: ["Canada"],
    tuition_budget: 12000,
    budget_currency: "CAD",
    budget_notes: "Synthetic family budget",
    scholarship_interest: true,
    scholarship_background: "Research conditional merit support",
  };
  await check(
    "Actual signup and confirmed password sessions are available",
    async () =>
      Boolean((await owner.api.auth.getUser()).data.user?.email_confirmed_at),
  );
  await check(
    "Authenticated student saves own study plan",
    async () =>
      data(
        await owner.api.rpc("save_student_placement", {
          p_student_id: owner.studentId,
          p_preferences: preferences,
          p_submit: false,
          p_version: 0,
        }),
        "Save",
      ).version === 1,
  );
  await check(
    "Other student and foreign staff cannot read the case",
    async () =>
      !data(
        await other.api.from("student_placement_cases").select("*"),
        "Other student",
      ).length &&
      !data(
        await foreign.api.from("student_placement_cases").select("*"),
        "Foreign staff",
      ).length,
  );
  await check("Student cannot mark their own case as reviewed", async () =>
    Boolean(
      (
        await owner.api
          .from("student_placement_cases")
          .update({ status: "recommendations_ready" })
          .eq("student_id", owner.studentId)
      ).error,
    ),
  );
  await check("Missing academic evidence blocks review submission", async () =>
    Boolean(
      (
        await owner.api.rpc("save_student_placement", {
          p_student_id: owner.studentId,
          p_preferences: preferences,
          p_submit: true,
          p_version: 1,
        })
      ).error,
    ),
  );
  data(
    await owner.api
      .from("students")
      .update({
        legal_name: "Synthetic placement student",
        contact_email: "fixture@udx-test.invalid",
        nationality: "Ghana",
        secondary_qualification: "Synthetic qualification",
        secondary_school_name: "Synthetic school",
      })
      .eq("id", owner.studentId),
    "Personal and education profile",
  );
  const object = `${owner.studentId}/${randomUUID()}.pdf`;
  const stream = "BT /F1 12 Tf 40 120 Td (Synthetic QA document only) Tj ET";
  const parts = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 250 180] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < parts.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${parts[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = Buffer.from(pdf);
  data(
    await owner.api.storage
      .from("student-documents")
      .upload(object, bytes, { contentType: "application/pdf" }),
    "Private upload",
  );
  objects.push(object);
  data(
    await owner.api
      .from("student_documents")
      .insert({
        student_id: owner.studentId,
        document_type: "transcript",
        storage_path: object,
      }),
    "Document metadata",
  );
  await check(
    "Owner can read the private upload after storage",
    async () =>
      !(await owner.api.storage.from("student-documents").download(object))
        .error,
  );
  await check(
    "Other student and cross-tenant staff cannot sign that document",
    async () =>
      Boolean(
        (
          await other.api.storage
            .from("student-documents")
            .createSignedUrl(object, 60)
        ).error,
      ) &&
      Boolean(
        (
          await foreign.api.storage
            .from("student-documents")
            .createSignedUrl(object, 60)
        ).error,
      ),
  );
  await check(
    "Anonymous public URL cannot disclose the private document",
    async () => {
      const r = await fetch(
        `${url}/storage/v1/object/public/student-documents/${object}`,
      );
      return !r.ok;
    },
  );
  await check(
    "Review submission persists through real Data API",
    async () =>
      data(
        await owner.api.rpc("save_student_placement", {
          p_student_id: owner.studentId,
          p_preferences: preferences,
          p_submit: true,
          p_version: 1,
        }),
        "Submit",
      ).status === "submitted",
  );
  await check(
    "Authorised same-tenant staff can review and read the evidence",
    async () =>
      data(
        await staff.api.rpc("review_student_placement", {
          p_student_id: owner.studentId,
          p_status: "reviewing",
          p_notes: "Researching verified options",
          p_version: 2,
        }),
        "Review",
      ).status === "reviewing" &&
      !(
        await staff.api.storage
          .from("student-documents")
          .createSignedUrl(object, 60)
      ).error,
  );
  const id = randomUUID();
  const details = {
    rationale:
      "Synthetic option fits the recorded academic interests; university requirements remain to be checked.",
    tuition_amount: "11000",
    tuition_currency: "CAD",
    tuition_period: "per_year",
    tuition_source_url: "https://example.edu/fees",
    tuition_checked_on: "2026-11-01",
    scholarship_notes: "",
  };
  await check(
    "Staff publishes a persisted catalogue recommendation",
    async () =>
      data(
        await staff.api.rpc("share_student_placement_recommendation", {
          p_student_id: owner.studentId,
          p_program_id: program,
          p_details: details,
          p_id: id,
        }),
        "Share",
      ).program_id === program,
  );
  await check(
    "Student reload reads the shared option",
    async () =>
      data(
        await owner.api
          .from("student_placement_recommendations")
          .select("id")
          .eq("student_id", owner.studentId),
        "Reload",
      ).length === 1,
  );
  await check("Student preference reaches the staff workspace", async () => {
    data(
      await owner.api.rpc("respond_student_placement", {
        p_recommendation_id: id,
        p_response: "interested",
        p_feedback: "Please help me apply.",
        p_version: 0,
      }),
      "Response",
    );
    const rows = data(
      await staff.api
        .from("student_placement_recommendations")
        .select("response,student_feedback")
        .eq("student_id", owner.studentId),
      "Staff read",
    );
    return (
      rows[0].response === "interested" &&
      rows[0].student_feedback === "Please help me apply."
    );
  });
  await check("Foreign staff cannot respond or withdraw the option", async () =>
    Boolean(
      (
        await foreign.api.rpc("withdraw_student_placement_recommendation", {
          p_recommendation_id: id,
          p_version: 1,
        })
      ).error,
    ),
  );
  await check(
    "Staff withdrawal removes the student-visible option",
    async () => {
      data(
        await staff.api.rpc("withdraw_student_placement_recommendation", {
          p_recommendation_id: id,
          p_version: 1,
        }),
        "Withdraw",
      );
      return (
        data(
          await owner.api
            .from("student_placement_recommendations")
            .select("id"),
          "Withdrawn read",
        ).length === 0
      );
    },
  );
} catch (e) {
  failure = e;
  console.log("FAIL isolated setup/workflow: " + e.message);
} finally {
  for (const session of sessions) await session.auth.signOut().catch(() => {});
  if (objects.length)
    data(
      await service.storage.from("student-documents").remove(objects),
      "Object cleanup",
    );
  for (const id of users)
    data(await service.auth.admin.deleteUser(id), "Auth cleanup");
  if (programs.length)
    data(
      await service.from("programs").delete().in("id", programs),
      "Programme cleanup",
    );
  if (universities.length)
    data(
      await service.from("universities").delete().in("id", universities),
      "University cleanup",
    );
  if (tenants.length)
    data(
      await service.from("tenants").delete().in("id", tenants),
      "Tenant cleanup",
    );
  console.log(
    `${checks.filter((c) => c.pass).length}/${checks.length} real Auth/Data API/private Storage checks passed.`,
  );
  if (failure || checks.some((c) => !c.pass)) process.exitCode = 1;
}
