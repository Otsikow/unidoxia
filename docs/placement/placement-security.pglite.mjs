// Disposable in-memory PostgreSQL only. No URL, hosted credentials or network.
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";
const { PGlite } = await import(
  process.env.PLACEMENT_PGLITE_MODULE
    ? pathToFileURL(process.env.PLACEMENT_PGLITE_MODULE).href
    : "@electric-sql/pglite"
);
const db = new PGlite();
const uid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sql = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../supabase/migrations/20261107124135_adviser_led_student_placement.sql",
  ),
  "utf8",
);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to authenticated,anon;
create table profiles(id uuid primary key,tenant_id uuid,role text,active boolean default true,user_metadata jsonb);
create table user_roles(user_id uuid,role text);
insert into user_roles values('${uid(3)}','staff'),('${uid(4)}','staff');
create table students(id uuid primary key,profile_id uuid,tenant_id uuid,archived_at timestamptz,legal_name text,contact_email text,nationality text,secondary_qualification text,secondary_school_name text);
create table universities(id uuid primary key,name text,country text,active boolean default true);
create table programs(id uuid primary key,name text,university_id uuid,active boolean);
create table education_records(id uuid primary key,student_id uuid);
create table student_documents(id uuid primary key,student_id uuid,document_type text,storage_path text,admin_review_status text);
create function public.is_admin_or_staff(id uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where profiles.id=$1 and role in ('admin','staff'))$$;
insert into profiles values('${uid(1)}','${uid(90)}','student',true,'{"role":"admin"}'),('${uid(2)}','${uid(90)}','student',true,'{}'),('${uid(3)}','${uid(90)}','staff',true,'{}'),('${uid(4)}','${uid(91)}','staff',true,'{}'),('${uid(5)}','${uid(90)}','partner',true,'{}'),('${uid(6)}','${uid(90)}','student',false,'{}');
insert into students values('${uid(11)}','${uid(1)}','${uid(90)}',null,'Student A','a@example.invalid','Ghana',null,null),('${uid(12)}','${uid(2)}','${uid(90)}',null,'Student B','b@example.invalid','Ghana',null,null),('${uid(16)}','${uid(6)}','${uid(90)}',null,'Inactive','i@example.invalid','Ghana',null,null);
insert into universities values('${uid(30)}','Fixture University','Canada');insert into programs values('${uid(31)}','Fixture Computing','${uid(30)}',true);
`);
await db.exec(sql);
const preferences = {
  intended_subject: "Computing",
  preferred_countries: ["Canada"],
  tuition_budget: 12000,
  budget_currency: "CAD",
  budget_notes: "Family-funded tuition budget",
  scholarship_interest: true,
  scholarship_background: "Research merit funding against grades.",
};
async function as(who, statement, args = [], role = "authenticated") {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
      who ? uid(who) : "",
    ]);
    const r = await db.query(statement, args);
    await db.exec("commit");
    return r;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
let count = 0;
async function check(name, fn) {
  await fn();
  count++;
  console.log("PASS", name);
}
const save = (who, submit, version, overrides = {}) =>
  as(who, "select public.save_student_placement($1,$2::jsonb,$3,$4) result", [
    uid(11),
    JSON.stringify({ ...preferences, ...overrides }),
    submit,
    version,
  ]);
const recDetails = {
  rationale:
    "This course matches the student’s computing background; entry grades still need institutional confirmation.",
  tuition_amount: "11000",
  tuition_currency: "CAD",
  tuition_period: "per_year",
  tuition_source_url: "https://example.edu/tuition",
  tuition_checked_on: "2026-11-01",
  scholarship_notes:
    "Potential merit award. Check course, nationality and deadline conditions.",
  scholarship_source_url: "https://example.edu/scholarships",
  scholarship_checked_on: "2026-11-01",
};
const share = (who, id, details = recDetails) =>
  as(
    who,
    "select public.share_student_placement_recommendation($1,$2,$3::jsonb,$4) result",
    [uid(11), uid(31), JSON.stringify(details), uid(id)],
  );
await check("anonymous cannot read cases", () =>
  assert.rejects(() =>
    as(null, "select * from student_placement_cases", [], "anon"),
  ),
);
await check("owner saves real persisted study plan", async () =>
  assert.equal((await save(1, false, 0)).rows[0].result.version, 1),
);
await check("other student cannot save this plan", () =>
  assert.rejects(() => save(2, false, 1), /Access denied/),
);
await check(
  "missing education/documents blocks submit and rolls back",
  async () => {
    await assert.rejects(() => save(1, true, 1), /education history/);
    assert.equal(
      (await db.query("select version from student_placement_cases")).rows[0]
        .version,
      1,
    );
  },
);
await check("cross-tenant staff cannot read", async () =>
  assert.equal(
    (await as(4, "select * from student_placement_cases")).rows.length,
    0,
  ),
);
await check("other student cannot read", async () =>
  assert.equal(
    (await as(2, "select * from student_placement_cases")).rows.length,
    0,
  ),
);
await check("partner cannot read", async () =>
  assert.equal(
    (await as(5, "select * from student_placement_cases")).rows.length,
    0,
  ),
);
await check("student cannot forge review state using direct table writes", () =>
  assert.rejects(
    () =>
      as(
        1,
        "update student_placement_cases set status='recommendations_ready'",
      ),
    /permission denied/,
  ),
);
await check("spoofed metadata admin cannot review own case", () =>
  assert.rejects(
    () =>
      as(1, "select public.review_student_placement($1,'reviewing','',1)", [
        uid(11),
      ]),
    /Access denied/,
  ),
);
await check("null version cannot bypass concurrency", () =>
  assert.rejects(() => save(1, false, null), /changed/),
);
await db.exec(
  `insert into education_records values('${uid(40)}','${uid(11)}');insert into student_documents values('${uid(41)}','${uid(11)}','transcript','${uid(11)}/transcript.pdf','admin_rejected');`,
);
await check("rejected academic evidence cannot count as uploaded", () =>
  assert.rejects(() => save(1, true, 1), /Upload an academic/),
);
await db.exec(
  `update student_documents set admin_review_status='awaiting_admin_review'`,
);
await check(
  "owner submits initial review without a university application",
  async () =>
    assert.equal((await save(1, true, 1)).rows[0].result.status, "submitted"),
);
await check("stale save cannot overwrite submitted plan", () =>
  assert.rejects(() => save(1, false, 1), /changed/),
);
await check("under-review preferences cannot silently change", () =>
  assert.rejects(() => save(1, false, 2), /under review/),
);
await check("wrong-tenant staff cannot start matching", () =>
  assert.rejects(
    () =>
      as(4, "select public.review_student_placement($1,'reviewing','',2)", [
        uid(11),
      ]),
    /Access denied/,
  ),
);
await check("authorised staff starts matching", async () =>
  assert.equal(
    (
      await as(
        3,
        "select public.review_student_placement($1,'reviewing','Research in progress',2) result",
        [uid(11)],
      )
    ).rows[0].result.status,
    "reviewing",
  ),
);
await check("student cannot publish their own recommendation", () =>
  assert.rejects(() => share(1, 50), /Access denied/),
);
await check("verified fees require source plus check date", () =>
  assert.rejects(
    () => share(3, 50, { ...recDetails, tuition_source_url: null }),
    /check constraint/,
  ),
);
await check("scholarship claims require source plus check date", () =>
  assert.rejects(
    () => share(3, 50, { ...recDetails, scholarship_source_url: null }),
    /check constraint/,
  ),
);
await check("zero tuition cannot masquerade as a verified free course", () =>
  assert.rejects(
    () => share(3, 50, { ...recDetails, tuition_amount: "0" }),
    /check constraint/,
  ),
);
await check("future source verification is rejected", () =>
  assert.rejects(
    () => share(3, 50, { ...recDetails, tuition_checked_on: "2999-01-01" }),
    /future/,
  ),
);
await check("malicious source URLs are rejected", () =>
  assert.rejects(
    () =>
      share(3, 50, {
        ...recDetails,
        tuition_source_url: "javascript:alert(1)",
      }),
    /check constraint/,
  ),
);
await check(
  "staff shares persisted option with real catalogue snapshot",
  async () => {
    const r = (await share(3, 50)).rows[0].result;
    assert.equal(r.university_name, "Fixture University");
    assert.equal(
      (await db.query("select status from student_placement_cases")).rows[0]
        .status,
      "recommendations_ready",
    );
  },
);
await check(
  "identical ambiguous retry returns same recommendation",
  async () => {
    await share(3, 50);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from student_placement_recommendations",
        )
      ).rows[0].n,
      1,
    );
  },
);
await check("changed payload cannot reuse same idempotency id", () =>
  assert.rejects(
    () =>
      share(3, 50, {
        ...recDetails,
        rationale:
          "Changed recommendation request should not overwrite existing information.",
      }),
    /request changed/,
  ),
);
await check("duplicate active course is prevented", () =>
  assert.rejects(() => share(3, 51), /unique constraint/),
);
await check("only intended student sees the shared option", async () => {
  assert.equal(
    (await as(1, "select * from student_placement_recommendations")).rows
      .length,
    1,
  );
  assert.equal(
    (await as(2, "select * from student_placement_recommendations")).rows
      .length,
    0,
  );
});
await check("student cannot alter fee or author", () =>
  assert.rejects(
    () =>
      as(1, "update student_placement_recommendations set tuition_amount=1"),
    /permission denied/,
  ),
);
await check("other student cannot answer this option", () =>
  assert.rejects(
    () =>
      as(2, "select public.respond_student_placement($1,'interested','',0)", [
        uid(50),
      ]),
    /unavailable/,
  ),
);
await check("student can share questions and staff can see them", async () => {
  await as(
    1,
    "select public.respond_student_placement($1,'question','Does this course include a placement?',0)",
    [uid(50)],
  );
  const r = (
    await as(
      3,
      "select response,student_feedback from student_placement_recommendations",
    )
  ).rows[0];
  assert.equal(r.response, "question");
  assert.match(r.student_feedback, /placement/);
});
await check("stale student response is rejected", () =>
  assert.rejects(
    () =>
      as(1, "select public.respond_student_placement($1,'interested','',0)", [
        uid(50),
      ]),
    /changed/,
  ),
);
await check(
  "student choice persists without creating an admission",
  async () => {
    await as(
      1,
      "select public.respond_student_placement($1,'interested','Please help me apply.',1)",
      [uid(50)],
    );
    assert.equal(
      (await db.query("select response from student_placement_recommendations"))
        .rows[0].response,
      "interested",
    );
  },
);
await check("staff can request more information", async () => {
  await as(
    3,
    "select public.review_student_placement($1,'changes_requested','Please confirm your revised budget.',4)",
    [uid(11)],
  );
  assert.equal(
    (await db.query("select version from student_placement_cases")).rows[0]
      .version,
    5,
  );
});
await check("resubmitted study plan withdraws outdated options", async () => {
  await save(1, true, 5, { tuition_budget: 9000 });
  assert.equal(
    (await as(1, "select * from student_placement_recommendations")).rows
      .length,
    0,
  );
  assert.equal(
    (await db.query("select status from student_placement_cases")).rows[0]
      .status,
    "submitted",
  );
});
await check("inactive owner cannot save", () =>
  assert.rejects(
    () =>
      as(6, "select public.save_student_placement($1,$2::jsonb,false,0)", [
        uid(16),
        JSON.stringify(preferences),
      ]),
    /Access denied/,
  ),
);
await check(
  "existing application, billing and Storage permissions are not altered",
  async () => {
    assert(
      !/alter\s+(?:table\s+)?(?:public\.)?(applications|payments|student_documents)|storage\.(objects|buckets)/i.test(
        sql,
      ),
    );
  },
);
console.log(`${count} isolated PostgreSQL placement checks passed.`);
await db.close();
