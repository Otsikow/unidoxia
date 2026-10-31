import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchOverviewApplications,
  fetchOverviewStudents,
  fetchOverviewTasks,
} from "./useAdminHome";
const api = vi.hoisted(() => ({ read: vi.fn(), eq: vi.fn(), select: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const chain = {
        select: (value: string) => {
          api.select(table, value);
          return chain;
        },
        eq: (...args: unknown[]) => {
          api.eq(table, ...args);
          return chain;
        },
        order: () => chain,
        range: (from: number, to: number) => api.read(table, from, to),
      };
      return chain;
    },
  },
}));
beforeEach(() => { vi.resetAllMocks(); });
describe("overview authorised data reads", () => {
  it("matches the Students tenant fallback only when the scoped list is empty", async () => {
    api.read
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ id: "s", archived_at: null, documents: [] }],
        error: null,
      });
    expect(await fetchOverviewStudents("tenant")).toEqual({
      students: 1,
      documentsToReview: 0,
    });
    expect(api.eq).toHaveBeenCalledWith("students", "tenant_id", "tenant");
    expect(api.read).toHaveBeenCalledTimes(2);
  });
  it("loads every application page rather than stopping at the server limit", async () => {
    const row = {
      id: "a",
      status: "enrolled",
      created_at: null,
      documents: [],
      tasks: [],
      student: null,
      program: null,
      app_number: null,
    };
    api.read
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, i) => ({
          ...row,
          id: String(i),
        })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ ...row, id: "last" }], error: null });
    expect((await fetchOverviewApplications()).total).toBe(501);
    expect(api.read).toHaveBeenNthCalledWith(2, "applications", 500, 999);
  });
  it("scopes task reads to the same staff tenant as the task workspace", async () => {
    api.read.mockResolvedValue({ data: [], error: null });
    await fetchOverviewTasks("staff-tenant");
    expect(api.eq).toHaveBeenCalledWith("tasks", "tenant_id", "staff-tenant");
  });
  it("propagates permission and network errors instead of fabricating zero counts or falling back on failure", async () => {
    api.read.mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(fetchOverviewStudents("tenant")).rejects.toThrow(
      "unavailable",
    );
    expect(api.read).toHaveBeenCalledTimes(1);
    await expect(fetchOverviewApplications()).rejects.toThrow("unavailable");
    await expect(fetchOverviewTasks("tenant")).rejects.toThrow("unavailable");
  });
});
