import { describe, expect, it } from "vitest";
import {
  overviewApplications,
  overviewStudents,
  overviewTasks,
  type OverviewApplication,
  type OverviewTask,
} from "./adminOverview";
const app = (
  id: string,
  status = "submitted",
  extra: Partial<OverviewApplication> = {},
): OverviewApplication => ({
  id,
  status,
  app_number: null,
  created_at: "2026-10-01",
  student: null,
  program: null,
  documents: [{ id: "doc", verified: true }],
  tasks: [],
  ...extra,
});
const task = (
  id: string,
  status = "open",
  due_at: string | null = "2026-10-30T23:59:59Z",
): OverviewTask => ({
  id,
  title: "Check statement",
  status,
  due_at,
  assignee_id: null,
  application_id: null,
});
describe("truthful admissions overview", () => {
  it("counts current student records and review files, not student-role profiles or archived files", () => {
    expect(
      overviewStudents([
        {
          id: "a",
          archived_at: null,
          documents: [
            { id: "1", admin_review_status: "awaiting_admin_review" },
            { id: "2", admin_review_status: "awaiting_admin_review" },
          ],
        },
        {
          id: "b",
          archived_at: "2026-10-01",
          documents: [
            { id: "3", admin_review_status: "awaiting_admin_review" },
          ],
        },
      ]),
    ).toEqual({ students: 1, documentsToReview: 2 });
  });
  it("keeps visa records out of enrolment and accounts for pipeline exclusions", () => {
    const data = overviewApplications([
      app("a", "visa"),
      app("b", "enrolled"),
      app("c", "deferred"),
      app("d", "withdrawn"),
    ]);
    expect(
      data.pipeline.find((stage) => stage.label === "Enrolled")?.count,
    ).toBe(1);
    expect(
      data.pipeline.find((stage) => stage.label === "CAS / LOA & visa")?.count,
    ).toBe(1);
    expect(data.pipelineTotal).toBe(2);
    expect(data.total).toBe(4);
    expect(data.active).toBe(2);
  });
  it("prioritises blocked work and keeps closed applications out of the attention list", () => {
    const result = overviewApplications(
      [
        app("a"),
        app("b", "screening", { tasks: [task("t", "blocked", null)] }),
        app("c", "enrolled", { documents: [] }),
        app("d", "screening", { documents: [] }),
      ],
      "2026-10-31",
    );
    expect(result.attention).toBe(3);
    expect(result.priorities.map((row) => row.id)).toEqual(["b", "a", "d"]);
  });
  it("treats overdue follow-ups as UK calendar days and excludes completed tasks", () => {
    const result = overviewTasks(
      [
        task("old"),
        task("today", "open", "2026-10-31T23:59:59Z"),
        task("done", "done"),
        task("blocked", "blocked", null),
      ],
      "2026-10-31",
    );
    expect(result.overdue).toBe(1);
    expect(result.open).toBe(3);
    expect(result.priorities.map((row) => row.id)).toEqual(["blocked", "old"]);
  });
});
