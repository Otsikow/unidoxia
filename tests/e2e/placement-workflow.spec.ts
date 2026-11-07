import { expect, test, type Page } from "@playwright/test";
import { createPlacementFixture } from "../../docs/placement/placement-fixture.mjs";
import fs from "node:fs";

// Auth/session is synthetic, but every placement read and mutation executes the
// candidate migration under real PostgreSQL authenticated roles and RLS.
// All Supabase URLs are intercepted. No live account, email or Storage write.
test.skip(
  !process.env.PLACEMENT_PGLITE_MODULE,
  "Set PLACEMENT_PGLITE_MODULE to run the isolated PostgreSQL-backed browser journey.",
);
test("student requests review, adviser shares a researched option, student responds and state persists", async ({
  browser,
}, testInfo) => {
  const fixture = await createPlacementFixture();
  const { db, uid, as } = fixture;
  let failSave = false;
  const sessionUser = (who: number) => ({
    id: uid(who),
    aud: "authenticated",
    role: "authenticated",
    email: `fixture-${who}@example.invalid`,
    email_confirmed_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {
      referral_source: "Other",
      phone: "+447700900123",
      full_name: who === 3 ? "Fixture Adviser" : "Fixture Student",
    },
    identities: [],
  });
  async function setup(page: Page, who: number) {
    const user = sessionUser(who),
      role = who === 3 ? "staff" : "student";
    const profile = {
      ...user,
      role,
      full_name: who === 3 ? "Fixture Adviser" : "Fixture Student",
      tenant_id: uid(90),
      active: true,
      phone: "+447700900123",
      country: "Ghana",
      onboarded: true,
      locale: "en",
      avatar_url: null,
    };
    await page.addInitScript(
      ({ user }) => {
        const head = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const body = btoa(
          JSON.stringify({
            sub: user.id,
            aud: "authenticated",
            role: "authenticated",
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        );
        localStorage.setItem(
          "sb-gbustuntgvmwkcttjojo-auth-token",
          JSON.stringify({
            access_token: `${head}.${body}.fixture`,
            refresh_token: "fixture-refresh",
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user,
          }),
        );
        sessionStorage.setItem("fixture-only", "true");
      },
      { user },
    );
    await page.route("**/*.supabase.co/**", async (route) => {
      const req = route.request(),
        u = new URL(req.url()),
        table = u.pathname.split("/").pop() || "";
      const body = req.postDataJSON();
      const send = (data: unknown, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      const single = (rows: unknown[]) =>
        req.headers()["accept"]?.includes("vnd.pgrst.object")
          ? (rows[0] ?? null)
          : rows;
      try {
        if (u.pathname.startsWith("/auth/"))
          return send(
            u.pathname.endsWith("/user")
              ? user
              : {
                  access_token: "fixture",
                  refresh_token: "fixture-refresh",
                  user,
                  expires_in: 3600,
                },
          );
        if (table === "profiles") return send(single([profile]));
        if (table === "user_roles") return send([{ role }]);
        if (table === "students")
          return send(
            single([
              (await db.query("select * from students where id=$1", [uid(11)]))
                .rows[0],
            ]),
          );
        if (
          [
            "education_records",
            "test_scores",
            "student_documents",
            "applications",
          ].includes(table)
        ) {
          if (table === "test_scores" || table === "applications")
            return send([]);
          return send(
            (
              await db.query(`select * from ${table} where student_id=$1`, [
                uid(11),
              ])
            ).rows,
          );
        }
        if (
          table === "student_placement_cases" ||
          table === "student_placement_recommendations"
        ) {
          return send(
            single(
              (
                await as(
                  who,
                  `select to_jsonb(t) data from public.${table} t where student_id=$1 order by created_at desc`,
                  [uid(11)],
                )
              ).rows.map((r: { data: unknown }) => r.data),
            ),
          );
        }
        const signatures: Record<string, string[]> = {
          save_student_placement: [
            "p_student_id",
            "p_preferences",
            "p_submit",
            "p_version",
          ],
          review_student_placement: [
            "p_student_id",
            "p_status",
            "p_notes",
            "p_version",
          ],
          share_student_placement_recommendation: [
            "p_student_id",
            "p_program_id",
            "p_details",
            "p_id",
          ],
          respond_student_placement: [
            "p_recommendation_id",
            "p_response",
            "p_feedback",
            "p_version",
          ],
          withdraw_student_placement_recommendation: [
            "p_recommendation_id",
            "p_version",
          ],
        };
        if (signatures[table]) {
          if (failSave && table === "save_student_placement") {
            failSave = false;
            return send(
              { message: "Isolated connection failure. Please retry." },
              503,
            );
          }
          const keys = signatures[table];
          const values = keys.map((k) =>
            typeof body[k] === "object" && body[k] !== null
              ? JSON.stringify(body[k])
              : body[k],
          );
          const result = await as(
            who,
            `select public.${table}(${keys.map((k, i) => `$${i + 1}${["p_preferences", "p_details"].includes(k) ? "::jsonb" : ""}`).join(",")}) data`,
            values,
          );
          return send(result.rows[0].data);
        }
        if (table === "programs")
          return send([
            {
              id: uid(31),
              name: "Fixture Computing",
              university: { name: "Fixture University", country: "Canada" },
            },
          ]);
        if (table === "get_admin_student_review_bundle") {
          const student = (
            await db.query("select * from students where id=$1", [uid(11)])
          ).rows[0];
          return send({
            student: {
              ...student,
              profile: {
                id: uid(1),
                full_name: "Fixture Student",
                email: "a@example.invalid",
                avatar_url: null,
              },
              applications: [],
              address: null,
              education_history: null,
              visa_history_json: null,
            },
            documents: [],
            education_records: [],
          });
        }
        return send([]);
      } catch (e) {
        return send(
          {
            message: (e as Error).message,
            code: (e as { code?: string }).code || "P0001",
          },
          400,
        );
      }
    });
  }
  const size =
    testInfo.project.name === "mobile"
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 };
  const student = await browser.newPage({ viewport: size });
  const staff = await browser.newPage({ viewport: size });
  await setup(student, 1);
  await setup(staff, 3);
  try {
    await student.goto("/student/dashboard");
    await expect(
      student.getByRole("heading", {
        level: 1,
        name: "Your study abroad journey",
      }),
    ).toBeVisible();
    await student
      .getByLabel("Subject or course interests", { exact: true })
      .fill("Computing");
    await student.getByLabel("Canada", { exact: true }).check();
    await student
      .getByLabel("Annual tuition budget (optional)", { exact: true })
      .fill("12000");
    await student
      .getByLabel("Budget currency", { exact: true })
      .selectOption("CAD");
    await student
      .getByLabel("Would you like us to research potential scholarships?", {
        exact: true,
      })
      .selectOption("true");
    await expect(
      student.getByRole("button", {
        name: "Submit for UniDoxia review",
        exact: true,
      }),
    ).toBeDisabled();
    failSave = true;
    await student
      .getByRole("button", { name: "Save study plan", exact: true })
      .click();
    await expect(
      student
        .getByRole("alert")
        .filter({ hasText: "Isolated connection failure" }),
    ).toBeVisible();
    await expect(
      student.getByLabel("Subject or course interests", { exact: true }),
    ).toHaveValue("Computing");
    await student
      .getByRole("button", { name: "Save study plan", exact: true })
      .click();
    await expect(
      student.getByText("Your study plan has been saved.", { exact: true }),
    ).toBeVisible();
    await db.exec(
      `insert into education_records values('${uid(40)}','${uid(11)}');insert into student_documents values('${uid(41)}','${uid(11)}','transcript','${uid(11)}/transcript.pdf','awaiting_admin_review');`,
    );
    await student.reload();
    await student
      .getByRole("button", { name: "Submit for UniDoxia review", exact: true })
      .click();
    await expect(
      student.getByText("Submitted for UniDoxia review", { exact: true }),
    ).toBeVisible();
    await staff.goto("/dashboard/placement");
    await staff.getByRole("link", { name: /Student A/ }).click();
    await expect(
      staff.getByRole("heading", {
        name: "University matching and recommendations",
        exact: true,
      }),
    ).toBeVisible();
    const upload = staff
      .getByRole("button", { name: "Transcript(s)", exact: true })
      .first();
    await upload.focus();
    await Promise.all([
      staff.waitForEvent("filechooser"),
      staff.keyboard.press("Enter"),
    ]);
    await expect(
      staff.getByRole("button", {
        name: "Expand missing required documents",
        exact: true,
      }),
    ).toBeVisible();
    await staff
      .getByLabel("Note shared with the student", { exact: true })
      .fill("Checking academic suitability and tuition sources.");
    await staff
      .getByRole("button", { name: "Start matching", exact: true })
      .click();
    await expect(
      staff.getByRole("heading", {
        name: "University matching in progress",
        exact: true,
      }),
    ).toBeVisible();
    await staff
      .getByLabel("Search catalogue courses", { exact: true })
      .fill("Computing");
    await staff
      .getByRole("button", { name: "Search courses", exact: true })
      .click();
    await staff
      .getByLabel("Course and university", { exact: true })
      .selectOption(uid(31));
    await staff
      .getByLabel(
        "Why this option suits the student, including outstanding requirements",
        { exact: true },
      )
      .fill(
        "The computing curriculum fits the student’s academic interests. Entry requirements need confirmation.",
      );
    await staff
      .getByLabel("Verified tuition (leave blank if unknown)", { exact: true })
      .fill("11000");
    await staff
      .getByLabel("Tuition currency", { exact: true })
      .selectOption("CAD");
    await staff
      .getByLabel("Official tuition source, https URL", { exact: true })
      .fill("https://example.edu/fees");
    await staff
      .getByLabel("Tuition source checked on", { exact: true })
      .fill("2026-11-01");
    await staff
      .getByRole("button", {
        name: "Share recommendation with student",
        exact: true,
      })
      .click();
    await expect(
      staff.getByRole("heading", {
        name: "Recommended options ready",
        exact: true,
      }),
    ).toBeVisible();
    await student.reload();
    await expect(
      student.getByRole("heading", { name: "Fixture Computing", exact: true }),
    ).toBeVisible();
    await student
      .getByLabel("Your preference", { exact: true })
      .selectOption("question");
    await student
      .getByLabel("Questions or feedback", { exact: true })
      .fill("Can we discuss the entry requirements?");
    await student
      .getByRole("button", { name: "Share my preference", exact: true })
      .click();
    await expect(
      student.getByText("Your preference has been saved for your adviser.", {
        exact: true,
      }),
    ).toBeVisible();
    await staff.reload();
    await expect(
      staff.getByText("Can we discuss the entry requirements?", {
        exact: true,
      }),
    ).toBeVisible();
    await student.reload();
    await expect(
      student.getByLabel("Your preference", { exact: true }),
    ).toHaveValue("question");
    const rows = (
      await db.query(
        "select response,student_feedback from student_placement_recommendations",
      )
    ).rows;
    expect(rows).toEqual([
      {
        response: "question",
        student_feedback: "Can we discuss the entry requirements?",
      },
    ]);
    for (const p of [student, staff]) {
      await p.bringToFront();
      expect(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (process.env.PLACEMENT_AXE_PATH) {
        await p.evaluate(async () => {
          await document.fonts.ready;
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          await Promise.allSettled(
            document
              .getAnimations()
              .filter(
                (animation) =>
                  animation.effect?.getTiming().iterations !== Infinity,
              )
              .map((animation) => animation.finished),
          );
        });
        await p.addScriptTag({ path: process.env.PLACEMENT_AXE_PATH });
        const violations = await p.evaluate(async () => {
          const engine = (
            window as unknown as {
              axe: {
                run: (options: unknown) => Promise<{
                  violations: { id: string; nodes: { target: string[] }[] }[];
                }>;
              };
            }
          ).axe;
          return (
            await engine.run({
              runOnly: {
                type: "tag",
                values: [
                  "wcag2a",
                  "wcag2aa",
                  "wcag21a",
                  "wcag21aa",
                  "wcag22aa",
                ],
              },
            })
          ).violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => ({
              target: n.target,
              detail: (n as unknown as { failureSummary: string })
                .failureSummary,
            })),
          }));
        });
        expect(violations).toEqual([]);
      }
    }
    const folder = "../outputs/unidoxia-registration-led/portal";
    fs.mkdirSync(folder, { recursive: true });
    await student.screenshot({
      path: `${folder}/student-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await staff.screenshot({
      path: `${folder}/staff-${testInfo.project.name}.png`,
      fullPage: true,
    });
  } catch (e) {
    console.log("STUDENT VIEW", await student.locator("body").innerText());
    console.log("STAFF VIEW", await staff.locator("body").innerText());
    throw e;
  } finally {
    await student.close();
    await staff.close();
    await db.close();
  }
});
